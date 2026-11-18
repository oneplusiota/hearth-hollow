'use client';
import {presets} from '@/lib/soundscapes';
import type {Soundscape} from '@/lib/use-soundscape';

// The generated sounds: a fire to sit beside while the songs rest.
export default function Hearth({sound, onBeforePlay}: {sound: Soundscape; onBeforePlay: () => void}) {
  const current = presets.find(p => p.id === sound.mode);
  const start = () => { if (!sound.playing) onBeforePlay(); void sound.play(); };
  return <section>
    <div className="banner"><div><span className="eyebrow">THE HEARTH</span><h1>Sit by the fire.</h1><p>Sounds made fresh in your browser, never from a recording. They keep burning while you wander the other rooms.</p></div></div>
    <div className={'fire ' + (sound.playing ? 'lit' : '')} style={{'--hue': current?.hue ?? 30} as React.CSSProperties}>
      <div className="flames" aria-hidden><i/><i/><i/><i/><i/></div>
      <div className="fire-copy"><span className="eyebrow">{current?.kind ?? 'The Signal'}</span><h2>{current?.name ?? 'The Signal'}</h2><p>{current?.caption}</p>
        <button className="big" disabled={sound.busy || !sound.ready} onClick={start}>{sound.busy ? 'Kindling…' : sound.playing ? '❚❚ Bank the fire' : '▶ Light the fire'}</button>
        <small role="status">{sound.status}</small></div>
    </div>
    <h2 className="sub">Choose your fire</h2>
    <div className="textures">{presets.map(p => <button key={p.id} className={'texture ' + (sound.mode === p.id ? 'on' : '')} aria-pressed={sound.mode === p.id} onClick={() => sound.choose(p.id)} style={{'--hue': p.hue} as React.CSSProperties}>
      <i aria-hidden>{p.icon}</i><span><b>{p.name}</b><small>{p.kind}</small></span></button>)}</div>
    <div className="dials">
      <label>Volume<input type="range" min="0" max="100" value={sound.volume} onChange={e => sound.setVolume(Number(e.target.value))} aria-label="Volume"/><output>{sound.volume}%</output></label>
      <label>Let it wander<input type="range" min="0" max="1" step=".05" value={sound.drift} onChange={e => sound.setDrift(Number(e.target.value))} aria-label="How much the tones wander"/><output>{sound.drift < .2 ? 'still' : sound.drift < .65 ? 'gentle' : 'roaming'}</output></label>
      <label>Burn for<select value={sound.timer} onChange={e => sound.setTimer(Number(e.target.value))} aria-label="Session timer"><option value="0">All night</option><option value="15">15 min</option><option value="30">30 min</option><option value="60">60 min</option></select></label>
    </div>
    <p className="fine">The sound pauses by itself if another app starts playing. Playing a song from the shelves banks the fire, and lighting it pauses the song.</p>
  </section>;
}
