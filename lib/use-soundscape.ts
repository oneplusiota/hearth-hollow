'use client';
import {useEffect, useRef, useState} from 'react';
import {SoundEngine} from './sound-engine';
import {presets, type Preset} from './soundscapes';

const KEY = 'tavern-v1';

// Owns the generated-sound engine for the whole app, so it keeps playing while you move between rooms.
export function useSoundscape() {
  const [mode, setMode] = useState<Preset>('brown');
  const [volume, setVolume] = useState(45);
  const [drift, setDrift] = useState(.3);
  const [timer, setTimerValue] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState('The fire is lit. Press play to settle in.');
  const engine = useRef<SoundEngine | null>(null);
  const lock = useRef(false), alive = useRef(true), live = useRef(false), syllables = useRef<string[]>([]);

  useEffect(() => {
    alive.current = true;
    try {
      const p = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (presets.some(s => s.id === p?.mode)) setMode(p.mode);
      if (Number.isFinite(p?.volume)) setVolume(Math.max(0, Math.min(100, p.volume)));
    } catch { /* corrupt storage must not block playback */ }
    setReady(true);
    return () => { alive.current = false; void engine.current?.dispose(); engine.current = null; };
  }, []);
  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(KEY, JSON.stringify({mode: mode === 'signal' ? 'brown' : mode, volume})); } catch { /* optional */ }
  }, [ready, mode, volume]);
  useEffect(() => { engine.current?.configure(mode, volume, drift); }, [mode, volume, drift]);

  async function play(next: Preset = mode) {
    if (lock.current) return;
    lock.current = true; setBusy(true);
    try {
      if (live.current && next === mode) {
        await engine.current?.pause();
        live.current = false; setPlaying(false); setStatus('Paused. The hearth will keep.');
      } else {
        window.dispatchEvent(new Event('hollow:generated'));
        if (!engine.current) engine.current = new SoundEngine(reason => { if (alive.current) { live.current = false; setPlaying(false); setStatus(reason); } });
        setMode(next);
        engine.current.configure(next, volume, drift);
        engine.current.setTimer(timer);
        engine.current.setSyllables(syllables.current);
        await engine.current.start();
        if (!alive.current) return;
        live.current = true; setPlaying(true);
        setStatus(next === 'signal' ? 'A voice from somewhere far off.' : 'Sound unfolding, one moment at a time.');
      }
    } catch {
      await engine.current?.dispose().catch(() => {});
      engine.current = null; live.current = false; setPlaying(false);
      setStatus('Audio could not start. Press play to try again.');
    } finally { lock.current = false; if (alive.current) setBusy(false); }
  }
  function choose(id: Preset) { setMode(id); setStatus(live.current ? 'Gently settling into a new texture…' : 'Press play when you are ready.'); }
  function setTimer(minutes: number) { setTimerValue(minutes); engine.current?.setTimer(minutes); }
  function setSyllables(list: string[]) { syllables.current = list; engine.current?.setSyllables(list); }
  function stop(message = 'Soundscape paused for the music.') {
    void engine.current?.dispose(); engine.current = null; live.current = false; setPlaying(false); setStatus(message);
  }
  return {mode, volume, drift, timer, playing, busy, ready, status, play, choose, setVolume, setDrift, setTimer, setSyllables, stop};
}
export type Soundscape = ReturnType<typeof useSoundscape>;
