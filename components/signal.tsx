'use client';
import {useEffect, useRef, useState} from 'react';
import type {Soundscape} from '@/lib/use-soundscape';

type Line = {id: number; text: string; syllables: string[]; clue: string};
const NOTES = 'tavern-notes-v1';

// A small constructed-language puzzle. The answer key stays on the server; this only sends guesses.
export default function Signal({sound, onBeforePlay}: {sound: Soundscape; onBeforePlay: () => void}) {
  const [id, setId] = useState(0);
  const [line, setLine] = useState<Line | null>(null);
  const [error, setError] = useState('');
  const [hint, setHint] = useState(false);
  const [guess, setGuess] = useState('');
  const [verdict, setVerdict] = useState('');
  const [checking, setChecking] = useState(false);
  const [notes, setNotes] = useState('');
  const loaded = useRef(false);
  const {setSyllables} = sound;

  useEffect(() => { try { const n = localStorage.getItem(NOTES); if (n) setNotes(n.slice(0, 10000)); } catch { /* optional */ } loaded.current = true; }, []);
  useEffect(() => { if (loaded.current) try { localStorage.setItem(NOTES, notes); } catch { /* optional */ } }, [notes]);
  useEffect(() => {
    const ctrl = new AbortController();
    setLine(null); setError(''); setHint(false); setVerdict(''); setGuess('');
    fetch('/api/signal?id=' + id, {signal: ctrl.signal}).then(r => { if (!r.ok) throw Error(); return r.json(); })
      .then((l: Line) => { setLine(l); setSyllables(l.syllables); })
      .catch(e => { if (e.name !== 'AbortError') setError('The signal could not be tuned. Pick another transmission.'); });
    return () => ctrl.abort();
  }, [id, setSyllables]);

  async function check(e: React.FormEvent) {
    e.preventDefault(); setChecking(true);
    try {
      const r = await fetch('/api/decipher', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({id, guess})});
      if (!r.ok) throw Error();
      setVerdict((await r.json()).correct ? 'Decoded. You found the meaning. ◇' : 'Not quite. Try a short plain sentence, and look at the clue.');
    } catch { setVerdict('Could not check that. Please try again.'); } finally { setChecking(false); }
  }
  const listening = sound.playing && sound.mode === 'signal';
  const toggle = () => { if (!listening) onBeforePlay(); void sound.play('signal'); };

  return <section>
    <div className="banner"><div><span className="eyebrow">THE SIGNAL · VELIN, CHAPTER ONE</span><h1>Somewhere, a voice.</h1><p>Six transmissions in one small invented language. Find what it says.</p></div></div>
    <div className="fire lit signal-stage">
      <div className="fire-copy"><span className="eyebrow">TRANSMISSION {String(id + 1).padStart(2, '0')} / 06</span><h2 className="velin">{line?.text ?? 'Tuning in…'}</h2>
        <button className="big" disabled={sound.busy || !sound.ready || !line} onClick={toggle}>{listening ? '❚❚ Pause' : '▶ Listen'}</button>
        <small>Synthesised syllables over a drone — a phonetic prototype, not a human singer.</small>
        <div className="picker" role="group" aria-label="Choose a transmission">{Array.from({length: 6}, (_, i) => <button key={i} className={'chip ' + (id === i ? 'on' : '')} aria-pressed={id === i} aria-label={'Transmission ' + (i + 1)} onClick={() => setId(i)}>{i + 1}</button>)}</div>
        {error && <p role="alert" className="notice">{error}</p>}</div>
    </div>
    <div className="duo">
      <div className="panel"><h3>Listen for a pattern</h3><p>The words follow consistent rules. Compare the six phrases: which words return, and where?</p>
        <button className="ghost" aria-expanded={hint} onClick={() => setHint(!hint)}>{hint ? 'Hide the clue' : 'A small clue'}</button>{hint && <p className="clue">{line?.clue ?? '…'}</p>}</div>
      <form className="panel" onSubmit={check}><h3>What is the voice saying?</h3><label htmlFor="guess">A short English sentence</label>
        <div className="row"><input id="guess" value={guess} maxLength={160} placeholder="I …" onChange={e => setGuess(e.target.value)} required/><button className="big" disabled={checking || !line}>{checking ? '…' : 'Check'}</button></div>
        <p role="status" className="fine">{verdict || 'Simple wording works best.'}</p></form>
    </div>
    <div className="panel"><h3>Field notes</h3><p className="fine">Saved only in this browser.</p><textarea aria-label="Puzzle notes" maxLength={10000} placeholder="I keep hearing this word…" value={notes} onChange={e => setNotes(e.target.value)}/></div>
    <p className="fine">Velin is a fictional language made for this puzzle, in the spirit of Sigur Rós’s Hopelandic.</p>
  </section>;
}
