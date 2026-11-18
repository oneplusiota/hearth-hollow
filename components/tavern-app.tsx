'use client';
import {useEffect, useMemo, useRef, useState} from 'react';
import {useLibrary} from '@/lib/use-library';
import {usePlayer} from '@/lib/use-player';
import {useSoundscape} from '@/lib/use-soundscape';
import {presets} from '@/lib/soundscapes';
import {SCENES, MOODS, sceneLabel, thumb, redditLink, type Track} from '@/lib/catalog-types';
import Hearth from './hearth';
import Signal from './signal';
import Board from './board';

type Room = 'common' | 'board' | 'cellar' | 'hearth' | 'signal';
const ROOMS: {id: Room; label: string; icon: string; hint: string}[] = [
  {id: 'common', label: 'Common Room', icon: '♜', hint: 'Songs the regulars swear by'},
  {id: 'board', label: 'Notice Board', icon: '✎', hint: 'Ask for an evening, get what Reddit answered'},
  {id: 'cellar', label: 'The Cellar', icon: '⚱', hint: 'Search every shelf'},
  {id: 'hearth', label: 'The Hearth', icon: '♨', hint: 'Sounds, always burning'},
  {id: 'signal', label: 'The Signal', icon: '◇', hint: 'A riddle in another tongue'},
];
const PAGE = 24;

export default function TavernApp() {
  const [room, setRoom] = useState<Room>('common');
  const [scene, setScene] = useState<string>('all');
  const [mood, setMood] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [onlyLiked, setOnlyLiked] = useState(false);
  const [open, setOpen] = useState<Track | null>(null);
  const [showQueue, setShowQueue] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [shown, setShown] = useState(PAGE);
  const [refresh, setRefresh] = useState(0);
  const lib = useLibrary();
  const sound = useSoundscape();
  const recent = useRef<string[]>([]);

  const player = usePlayer({
    onStart: () => { if (sound.playing) sound.stop('The soundscape stepped aside for the music.'); },
    onEnded: last => { const next = lib.autoplay(last, recent.current); return next ? {id: next.id, yt: next.yt, title: next.title, artist: next.artist} : null; },
    onPlay: item => { recent.current = [...recent.current.slice(-30), item.id]; lib.record(item.id, 'play'); },
    onSkip: item => lib.record(item.id, 'skip'),
  });

  // The video is a sheet that stays hidden until you ask for it (like YouTube Music). It is slid off-screen, never
  // display:none, so the iframe keeps playing audio in the background. Only one sheet is open at a time.
  const toggleVideo = () => { setShowQueue(false); setShowVideo(v => !v); };
  const toggleQueue = () => { setShowVideo(false); setShowQueue(v => !v); };
  useEffect(() => { if (player.needsTap) setShowVideo(true); }, [player.needsTap]);
  useEffect(() => { if (!player.now) setShowVideo(false); }, [player.now]);
  useEffect(() => {
    if (!showVideo) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowVideo(false); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [showVideo]);

  // The bar wraps to two rows on phones, so the sheets are positioned from its measured height.
  const barRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const set = () => document.documentElement.style.setProperty('--bar-h', el.offsetHeight + 'px');
    set();
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const asPlayable = (t: Track) => ({id: t.id, yt: t.yt, title: t.title, artist: t.artist});
  const filtered = useMemo(() => {
    let list = query ? lib.search(query) : lib.tracks;
    if (scene !== 'all') list = list.filter(t => t.scenes.includes(scene));
    if (mood !== 'all') list = list.filter(t => t.mood.includes(mood));
    if (onlyLiked) list = list.filter(t => lib.liked.has(t.id));
    return list;
  }, [lib.tracks, lib.liked, query, scene, mood, onlyLiked]); // eslint-disable-line react-hooks/exhaustive-deps
  const picks = useMemo(() => {
    if (!lib.loaded) return [];
    const base = lib.forYou(18);
    return scene === 'all' ? base : [...base.filter(t => t.scenes.includes(scene)), ...lib.tracks.filter(t => t.scenes.includes(scene) && !base.includes(t))].slice(0, 18);
  }, [lib.loaded, lib.events.length, scene, refresh]); // eslint-disable-line react-hooks/exhaustive-deps
  const hasTaste = lib.events.some(e => e.kind !== 'skip');
  useEffect(() => setShown(PAGE), [scene, mood, query, onlyLiked]);

  const card = (t: Track) => <Card key={t.id} t={t} liked={lib.liked.has(t.id)} playing={player.now?.id === t.id && player.playing}
    onPlay={() => player.playNow(asPlayable(t))} onNext={() => player.addNext(asPlayable(t))} onAdd={() => player.addLast(asPlayable(t))}
    onLike={() => lib.toggleLike(t.id)} onOpen={() => setOpen(t)}/>;

  return <div className="inn">
    <header className="signboard">
      <a className="sign" href="/" aria-label="The Hollow Hearth"><span className="sign-mark">⚜</span><span><b>The Hollow Hearth</b><small>a tavern for good music</small></span></a>
      <nav aria-label="Rooms">{ROOMS.map(r => <button key={r.id} className={room === r.id ? 'on' : ''} aria-current={room === r.id ? 'page' : undefined} onClick={() => setRoom(r.id)} title={r.hint}><i aria-hidden>{r.icon}</i>{r.label}</button>)}</nav>
    </header>

    <main className={room === 'common' || room === 'cellar' ? 'has-bar' : 'has-bar'}>
      {lib.error && <p className="notice" role="alert">{lib.error}</p>}

      {room === 'common' && <section>
        <div className="banner"><div><span className="eyebrow">THE COMMON ROOM</span><h1>Pull up a stool.</h1>
          <p>{hasTaste ? 'Chosen by what you have lit up and what you have waved away.' : 'Songs that many different Redditors, in many different threads, keep pressing into each other’s hands. Like a few and the picks will learn you.'}</p></div>
          <button className="ghost" onClick={() => setRefresh(n => n + 1)}>↻ Shuffle the picks</button></div>
        <Scenes scene={scene} setScene={setScene}/>
        {!lib.loaded && !lib.error && <p className="notice">Lighting the lanterns…</p>}
        <div className="shelf">{picks.map(card)}</div>
        {lib.loaded && !picks.length && <p className="notice">Nothing on this shelf yet — try another occasion.</p>}
        <p className="fine">{lib.tracks.length.toLocaleString()} songs, each one recommended by several different people across Reddit threads. Tap a card to see who asked and what they said.</p>
      </section>}

      {room === 'cellar' && <section>
        <div className="banner"><div><span className="eyebrow">THE CELLAR</span><h1>Every cask, every shelf.</h1><p>Search by song, band, mood or whatever the thread was asking for.</p></div></div>
        <div className="tools"><label className="search"><span aria-hidden>⌕</span><input aria-label="Search the cellar" placeholder="a band, a feeling, “night drive”…" value={query} onChange={e => setQuery(e.target.value)}/></label>
          <button className={'chip ' + (onlyLiked ? 'on' : '')} aria-pressed={onlyLiked} onClick={() => setOnlyLiked(!onlyLiked)}>♥ Liked ({lib.liked.size})</button></div>
        <Scenes scene={scene} setScene={setScene}/>
        <div className="chips" role="group" aria-label="Mood"><button className={'chip ' + (mood === 'all' ? 'on' : '')} onClick={() => setMood('all')}>Any mood</button>{MOODS.map(m => <button key={m} className={'chip ' + (mood === m ? 'on' : '')} onClick={() => setMood(m)}>{m}</button>)}</div>
        <p className="count">{filtered.length.toLocaleString()} {filtered.length === 1 ? 'song' : 'songs'}</p>
        <div className="shelf">{filtered.slice(0, shown).map(card)}</div>
        {filtered.length > shown && <div className="more"><button className="ghost" onClick={() => setShown(n => n + PAGE)}>Pour more ({filtered.length - shown} left)</button></div>}
        {lib.loaded && !filtered.length && <p className="notice">The shelf is bare. Loosen a filter or clear the search.</p>}
      </section>}

      {room === 'board' && <Board lib={lib} player={player}/>}
      {room === 'hearth' && <Hearth sound={sound} onBeforePlay={() => player.pause()}/>}
      {room === 'signal' && <Signal sound={sound} onBeforePlay={() => player.pause()}/>}
    </main>

    <section className="bar" aria-label="Now playing" ref={barRef}>
      <button className="bar-open" disabled={!player.now} aria-expanded={showVideo} aria-controls="video-sheet" aria-label={showVideo ? 'Hide the video' : 'Show the video'} onClick={toggleVideo}>
        <span className="bar-art" aria-hidden>{player.now ? <img src={thumb(player.now.yt)} alt=""/> : <span>♪</span>}<i>{showVideo ? '▾' : '▴'}</i></span>
        <span className="bar-info">
          <b>{player.now ? player.now.title : sound.playing ? presets.find(p => p.id === sound.mode)?.name ?? 'The Signal' : 'Nothing playing'}</b>
          <small>{player.needsTap ? 'Tap play in the video to start' : player.now ? player.now.artist || 'from the shelves' : sound.playing ? sound.status : 'Choose a song, or light the hearth'}</small>
        </span>
      </button>
      <div className="bar-controls">
        <button aria-label="Previous song" disabled={!player.now} onClick={player.prev}>⏮</button>
        <button className="bar-play" aria-label={player.playing ? 'Pause' : 'Play'} disabled={!player.queue.items.length} onClick={player.toggle}>{player.playing ? '❚❚' : '▶'}</button>
        <button aria-label="Next song" disabled={!player.queue.items.length} onClick={player.next}>⏭</button>
        <button aria-label="Repeat the queue" aria-pressed={player.repeat} className={player.repeat ? 'on' : ''} onClick={() => player.setRepeat(!player.repeat)}>⟲</button>
      </div>
      <button className="bar-queue" aria-expanded={showQueue} onClick={toggleQueue}>Up next · {Math.max(0, player.queue.items.length - Math.max(0, player.queue.index + 1))}</button>
    </section>

    <div id="video-sheet" className={'viewer ' + (player.now ? 'live ' : '') + (showVideo ? 'open' : '')} role="region" aria-label="Video" {...(showVideo ? {} : {inert: true})}>
      <div className="viewer-head"><span>{player.now?.title ?? 'Video'}</span><button onClick={() => setShowVideo(false)} aria-label="Hide the video">▾ Hide</button></div>
      <div className="viewer-frame" ref={player.box}/>
      <p role="status">{player.needsTap ? 'Tap play to start.' : player.message}</p>
      {player.now && <a href={'https://www.youtube.com/watch?v=' + player.now.yt} target="_blank" rel="noreferrer">Open on YouTube ↗</a>}
    </div>

    {showQueue && <aside className="queue" aria-label="Up next">
      <div className="queue-head"><h2>The Queue</h2><button className="ghost" disabled={!player.queue.items.length} onClick={() => player.clearAll()}>Clear</button><button className="ghost" onClick={() => setShowQueue(false)} aria-label="Close queue">✕</button></div>
      {!player.queue.items.length && <p className="notice">Empty. Press ▶ on any card to start; “Next” and “+” on a card line songs up.</p>}
      <ol>{player.queue.items.map((it, i) => <li key={it.key} className={i === player.queue.index ? 'now' : player.failedIds.includes(it.yt) ? 'bad' : ''}>
        <button className="q-title" onClick={() => player.jumpTo(i)}><span>{i === player.queue.index ? '♪' : i + 1}</span><b>{it.title}</b><small>{it.artist}{player.failedIds.includes(it.yt) ? ' · will not play' : ''}</small></button>
        <span className="q-actions"><button aria-label={'Move up ' + it.title} disabled={i === 0} onClick={() => player.moveBy(i, -1)}>↑</button><button aria-label={'Move down ' + it.title} disabled={i === player.queue.items.length - 1} onClick={() => player.moveBy(i, 1)}>↓</button><button aria-label={'Remove ' + it.title} onClick={() => player.removeAt(i)}>✕</button></span>
      </li>)}</ol>
    </aside>}

    {open && <Detail t={open} lib={lib} onClose={() => setOpen(null)} card={card} onPlay={() => player.playNow(asPlayable(open))} onNext={() => player.addNext(asPlayable(open))} onAdd={() => player.addLast(asPlayable(open))}/>}
  </div>;
}

function Scenes({scene, setScene}: {scene: string; setScene: (s: string) => void}) {
  return <div className="chips" role="group" aria-label="Occasion">
    <button className={'chip ' + (scene === 'all' ? 'on' : '')} onClick={() => setScene('all')}>Any occasion</button>
    {SCENES.map(s => <button key={s.id} className={'chip ' + (scene === s.id ? 'on' : '')} onClick={() => setScene(s.id)}><i aria-hidden>{s.icon}</i>{s.label}</button>)}
  </div>;
}

function Card({t, liked, playing, onPlay, onNext, onAdd, onLike, onOpen}: {t: Track; liked: boolean; playing: boolean; onPlay: () => void; onNext: () => void; onAdd: () => void; onLike: () => void; onOpen: () => void}) {
  return <article className={'card ' + (playing ? 'playing' : '')}>
    <button className="card-art" onClick={onPlay} aria-label={'Play ' + t.title + ' by ' + t.artist}>
      <img loading="lazy" src={thumb(t.yt)} alt=""/><span className="play-glyph" aria-hidden>{playing ? '♪' : '▶'}</span>
      {t.kind !== 'song' && <em>{t.kind}</em>}
    </button>
    <div className="card-body">
      <h3>{t.title}</h3><p className="artist">{t.artist}</p>
      <p className="why">{t.why}</p>
      <div className="tags">{t.scenes.slice(0, 2).map(s => <span key={s}>{sceneLabel(s)}</span>)}{t.mood.slice(0, 1).map(m => <span key={m}>{m}</span>)}</div>
      <div className="card-actions">
        <button className={liked ? 'on' : ''} aria-pressed={liked} aria-label={(liked ? 'Unlike ' : 'Like ') + t.title} onClick={onLike}>{liked ? '♥' : '♡'}</button>
        <button onClick={onNext} title="Play after the current song">Next</button>
        <button onClick={onAdd} title="Add to the end of the queue" aria-label={'Add ' + t.title + ' to the queue'}>+</button>
        <button onClick={onOpen} className="who" title="Who recommended this">{t.authors} voices ›</button>
      </div>
    </div>
  </article>;
}

function Detail({t, lib, onClose, card, onPlay, onNext, onAdd}: {t: Track; lib: ReturnType<typeof useLibrary>; onClose: () => void; card: (t: Track) => React.ReactNode; onPlay: () => void; onNext: () => void; onAdd: () => void}) {
  const similar = useMemo(() => lib.similar(t, 4), [t]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);
  return <div className="scrim" onClick={onClose}><div className="detail" role="dialog" aria-modal="true" aria-label={t.title} onClick={e => e.stopPropagation()}>
    <button className="x" onClick={onClose} aria-label="Close">✕</button>
    <div className="detail-top"><img src={thumb(t.yt)} alt=""/><div><span className="eyebrow">{t.kind.toUpperCase()}{t.year ? ' · ' + t.year : ''}</span><h2>{t.title}</h2><p className="artist">{t.artist}</p>
      <div className="card-actions"><button className="big" onClick={() => { onPlay(); onClose(); }}>▶ Play</button><button onClick={onNext}>Play next</button><button onClick={onAdd}>+ Queue</button></div></div></div>
    <p className="why big-why">{t.why}</p>
    <h3>Where it came up</h3>
    <p className="fine">{t.authors} different people recommended this across {t.threads} {t.threads === 1 ? 'thread' : 'threads'}. A few of the questions it answered:</p>
    <ul className="threads">{t.src.map(s => <li key={s.tid}><a href={redditLink(s.tid)} target="_blank" rel="noreferrer">r/{s.sub} — {s.ask} ↗</a></li>)}</ul>
    {similar.length > 0 && <><h3>If this one hits</h3><div className="shelf small">{similar.map(card)}</div></>}
  </div></div>;
}
