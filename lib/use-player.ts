'use client';
import {useCallback, useEffect, useRef, useState} from 'react';
import {youtubeAPI, type Player} from './youtube-api';
import * as Q from './queue.mjs';
import {show, hold, rest, release} from './lockscreen';
import {thumb} from './catalog-types';

const KEY = 'tavern-queue-v1';
type Playable = {id: string; yt: string; title?: string; artist?: string};

// One queue, one pointer, one iframe. The queue lives in a ref-backed state so YouTube's callbacks
// (which outlive renders) always see the latest list without a pile of mirrored refs.
export function usePlayer({onStart, onEnded, onPlay, onSkip}: {onStart: () => void; onEnded?: (last: Q.Item) => Playable | null; onPlay?: (item: Q.Item) => void; onSkip?: (item: Q.Item) => void}) {
  const [queue, setQueueState] = useState<Q.Queue>(Q.emptyQueue());
  const [playing, setPlaying] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [message, setMessage] = useState('Pick something from the shelves to begin.');
  const [needsTap, setNeedsTap] = useState(false);
  const [failedIds, setFailedIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const q = useRef(queue), rep = useRef(repeat), failed = useRef(new Set<string>());
  const box = useRef<HTMLDivElement>(null), player = useRef<Player | null>(null), ready = useRef(false);
  const alive = useRef(true), creating = useRef(false);
  const want = useRef(false); // the listener asked for sound; false after a manual pause
  const cb = useRef({onStart, onEnded, onPlay, onSkip}), counted = useRef('');
  cb.current = {onStart, onEnded, onPlay, onSkip};
  rep.current = repeat;

  const setQueue = useCallback((next: Q.Queue) => { q.current = next; setQueueState(next); }, []);
  const now = Q.current(queue);

  // --- persistence ---------------------------------------------------------------------------------------
  useEffect(() => {
    try { const p = JSON.parse(localStorage.getItem(KEY) || 'null'); if (p) { setQueue(Q.clean(p.queue)); setRepeat(p.repeat === true); } } catch { /* start fresh */ }
    setHydrated(true);
  }, [setQueue]);
  useEffect(() => {
    if (hydrated) try { localStorage.setItem(KEY, JSON.stringify({queue, repeat})); } catch { /* optional */ }
  }, [queue, repeat, hydrated]);

  // --- the iframe ----------------------------------------------------------------------------------------
  const load = useCallback((yt: string, autoplay: boolean) => {
    const p = player.current;
    if (!p || !ready.current) return;
    if (autoplay) p.loadVideoById(yt); else p.cueVideoById(yt);
  }, []);

  const go = useCallback((next: Q.Queue | null, {user = false} = {}) => {
    if (!next) { want.current = false; setPlaying(false); setMessage('End of the queue. Pick another song, or turn on repeat.'); return; }
    if (user) failed.current.clear();
    setQueue(next);
    const item = Q.current(next);
    if (!item) return;
    want.current = true;
    setMessage('Loading…');
    cb.current.onStart();
    load(item.yt, true);
  }, [load, setQueue]);

  const advanceQueue = useCallback((user = false) => {
    let next = Q.advance(q.current, {repeat: rep.current, failed: failed.current});
    if (!next && !rep.current && q.current.index >= 0) {
      // Out of queue: keep the evening going with a neighbour of what just played.
      const last = Q.current(q.current);
      const more = last && cb.current.onEnded?.(last);
      if (more) next = Q.playNow(q.current, more);
    }
    go(next, {user});
  }, [go]);

  useEffect(() => { alive.current = true; return () => { alive.current = false; player.current?.destroy(); player.current = null; ready.current = false; creating.current = false; }; }, []);

  // The player is created once, the first time something is chosen, then reused for every song.
  useEffect(() => {
    if (!now || player.current || creating.current || !box.current) return;
    creating.current = true;
    let local: Player | null = null;
    const cancelled = () => !alive.current;
    const element = document.createElement('div');
    box.current.replaceChildren(element);
    youtubeAPI().then(YT => {
      if (cancelled()) return;
      local = new YT.Player(element, {
        width: '100%', height: '100%', host: 'https://www.youtube.com',
        playerVars: {playsinline: 1, origin: window.location.origin, autoplay: 0},
        events: {
          onReady: () => {
            if (cancelled()) return;
            player.current = local; ready.current = true;
            const item = Q.current(q.current);
            if (item) load(item.yt, want.current);
          },
          onStateChange: e => {
            if (cancelled()) return;
            if (e.data === 1) {
              setPlaying(true); setNeedsTap(false); setMessage('Now playing.'); cb.current.onStart();
              const item = Q.current(q.current);
              if (item && counted.current !== item.key) { counted.current = item.key; cb.current.onPlay?.(item); }
            }
            else if (e.data === 2) { setPlaying(false); }
            else if (e.data === 0) { setPlaying(false); advanceQueue(); }
            else if (e.data === 3) setMessage('Buffering…');
          },
          onError: e => {
            if (cancelled()) return;
            const item = Q.current(q.current);
            if (item) { failed.current.add(item.yt); setFailedIds([...failed.current]); }
            setPlaying(false);
            setMessage(e.data === 150 || e.data === 101 ? 'The owner blocks playing this one here — skipping to the next.' : 'This one will not play — skipping to the next.');
            advanceQueue();
          },
          onAutoplayBlocked: () => { want.current = false; setPlaying(false); setNeedsTap(true); setMessage('Your browser wants a tap. Press play.'); },
        },
      });
      player.current = local;
    }).catch(err => { creating.current = false; if (!cancelled()) setMessage(err.message); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!now]);

  // --- public actions ------------------------------------------------------------------------------------
  const playNow = useCallback((track: Playable) => { void hold(); go(Q.playNow(q.current, track), {user: true}); }, [go]);
  const playList = useCallback((tracks: Playable[]) => { void hold(); go(Q.replace(tracks), {user: true}); }, [go]);
  const addNext = useCallback((track: Playable) => { setQueue(Q.playNext(q.current, track)); setMessage('Added to play next.'); }, [setQueue]);
  const addLast = useCallback((track: Playable) => { setQueue(Q.enqueue(q.current, track)); setMessage('Added to the queue.'); }, [setQueue]);
  const jumpTo = useCallback((i: number) => { void hold(); go(Q.jump(q.current, i), {user: true}); }, [go]);
  const next = useCallback(() => {
    const item = Q.current(q.current), p = player.current;
    // Leaving a song early is a signal; leaving the last 20 seconds is just moving on.
    if (item && p && ready.current && counted.current === item.key && p.getDuration() - p.getCurrentTime() > 20) cb.current.onSkip?.(item);
    void hold(); advanceQueue(true);
  }, [advanceQueue]);
  const prev = useCallback(() => {
    const p = player.current;
    if (p && ready.current && p.getCurrentTime() > 4) { p.seekTo(0, true); return; }
    void hold(); go(Q.back(q.current), {user: true});
  }, [go]);
  const pause = useCallback(() => { want.current = false; player.current?.pauseVideo(); setPlaying(false); }, []);
  const resume = useCallback(() => {
    void hold();
    if (!Q.current(q.current) && q.current.items.length) { go(Q.jump(q.current, 0), {user: true}); return; }
    want.current = true; setNeedsTap(false); player.current?.playVideo();
  }, [go]);
  const toggle = useCallback(() => { if (playing) pause(); else resume(); }, [playing, pause, resume]);
  const removeAt = useCallback((i: number) => {
    const wasCurrent = i === q.current.index;
    const nextQ = Q.remove(q.current, i);
    setQueue(nextQ);
    if (wasCurrent) { const item = Q.current(nextQ); if (item && want.current) load(item.yt, true); else { player.current?.pauseVideo(); setPlaying(false); } }
  }, [load, setQueue]);
  const moveBy = useCallback((i: number, d: number) => setQueue(Q.move(q.current, i, d)), [setQueue]);
  const clearAll = useCallback(() => { want.current = false; player.current?.pauseVideo(); setPlaying(false); setQueue(Q.clear()); release(); }, [setQueue]);

  // Stop the iframe when the generated soundscape starts (the two never layer).
  useEffect(() => {
    const stop = () => { want.current = false; player.current?.pauseVideo(); setPlaying(false); };
    window.addEventListener('hollow:generated', stop);
    return () => window.removeEventListener('hollow:generated', stop);
  }, []);

  useEffect(() => { if (playing) void hold(); else rest(); }, [playing]);

  // --- lock screen ---------------------------------------------------------------------------------------
  useEffect(() => {
    if (!now) return;
    show({title: now.title, artist: now.artist, art: thumb(now.yt)}, {play: resume, pause, next, prev}, playing);
  }, [now?.key, now?.title, playing, resume, pause, next, prev]); // eslint-disable-line react-hooks/exhaustive-deps

  return {box, queue, now, playing, repeat, setRepeat, message, needsTap, failedIds, hydrated, playNow, playList, addNext, addLast, jumpTo, next, prev, pause, resume, toggle, removeAt, moveBy, clearAll};
}
export type PlayerState = ReturnType<typeof usePlayer>;
