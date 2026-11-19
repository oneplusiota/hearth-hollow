'use client';
import {useEffect, useRef, useState} from 'react';
import {presets} from '@/lib/soundscapes';
import {FATES, GENRES, INSTRUMENTS, SCALES, STYLES, decode, encode, genreById, type RoleName} from '@/lib/genres.mjs';
import type {Soundscape} from '@/lib/use-soundscape';

const ROLES: {id: RoleName; label: string; icon: string}[] = [
  {id: 'bass', label: 'Bass', icon: '◉'}, {id: 'harmony', label: 'Harmony', icon: '≋'}, {id: 'lead', label: 'Melody', icon: '♪'},
  {id: 'drums', label: 'Rhythm', icon: '●'}, {id: 'air', label: 'Atmosphere', icon: '✧'},
];
const ROLE_HUE = [20, 200, 45, 340, 150];
const KEYS = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
const word = (v: number, a: string, b: string, c: string) => (v < .34 ? a : v < .67 ? b : c);

// The fire, the genres, and the band's rack: every instrument and every law of chance can be changed while it plays.
export default function Hearth({sound, onBeforePlay}: {sound: Soundscape; onBeforePlay: () => void}) {
  const g = genreById(sound.genre), cfg = sound.cfg, band = sound.mode === 'band';
  const current = band ? {name: g.name, kind: 'Generative band · ' + SCALES[cfg.scaleId].name, caption: g.blurb, hue: g.hue} : presets.find(p => p.id === sound.mode);
  const start = () => { if (!sound.playing) onBeforePlay(); void sound.play(); };
  const [code, setCode] = useState(''), [note, setNote] = useState('');
  const {patch} = sound;
  const setRole = (r: RoleName, v: {on?: boolean; inst?: string; style?: string; level?: number}) => patch(o => ({...o, roles: {...o.roles, [r]: {...o.roles[r], ...v}}}));
  const setFate = (v: Record<string, string | number>) => patch(o => ({...o, fate: {...o.fate, ...v}}));
  const setFx = (v: Record<string, number>) => patch(o => ({...o, fx: {...o.fx, ...v}}));
  const reset = () => sound.pickGenre(sound.genre);
  const share = async () => {
    const text = encode(sound.genre, sound.over);
    try { await navigator.clipboard.writeText(text); setNote('Copied. Paste it anywhere to bring this evening back.'); } catch { setCode(text); setNote('Copy the code below.'); }
  };
  const load = () => {
    const d = decode(code);
    if (!d) { setNote('That code did not parse.'); return; }
    sound.setGenre(d.genre); sound.setOver(d.over); sound.choose('band'); setNote('Loaded.'); setCode('');
  };

  return <section>
    <div className="banner"><div><span className="eyebrow">THE HEARTH</span><h1>Sit by the fire.</h1><p>A band of invented players, performing live in your browser from dice, not recordings. Pick a genre, then swap any instrument or change how fate chooses the notes.</p></div></div>
    <div className={'fire ' + (sound.playing ? 'lit' : '')} style={{'--hue': current?.hue ?? 30} as React.CSSProperties}>
      <div className="flames" aria-hidden><i/><i/><i/><i/><i/></div>
      <div className="fire-copy"><span className="eyebrow">{current?.kind ?? 'The Signal'}</span><h2>{current?.name ?? 'The Signal'}</h2><p>{current?.caption}</p>
        <button className="big" disabled={sound.busy || !sound.ready} onClick={start}>{sound.busy ? 'Kindling…' : sound.playing ? '❚❚ Bank the fire' : '▶ Light the fire'}</button>
        <small role="status">{sound.status}</small></div>
      {band && <Roll sound={sound}/>}
    </div>

    <h2 className="sub">Choose a genre</h2>
    <div className="genres">{GENRES.map(x => <button key={x.id} className={'genre ' + (band && sound.genre === x.id ? 'on' : '')} aria-pressed={band && sound.genre === x.id} onClick={() => sound.pickGenre(x.id)} style={{'--hue': x.hue} as React.CSSProperties}>
      <i aria-hidden>{x.icon}</i><span><b>{x.name}</b><small>{x.blurb}</small></span></button>)}</div>

    {band && <>
      <h2 className="sub">The band <button className="mini" onClick={reset}>Reset to {g.name}</button></h2>
      <div className="rack">{ROLES.map((r, ri) => {
        const rc = cfg.roles[r.id];
        const sel = (kind: 'inst' | 'style') => (kind === 'inst' ? INSTRUMENTS[r.id] : STYLES[r.id]);
        return <div key={r.id} className={'slot ' + (rc.on ? '' : 'off')} style={{'--hue': ROLE_HUE[ri]} as React.CSSProperties}>
          <div className="slot-head"><i aria-hidden>{r.icon}</i><b>{r.label}</b>
            <button className={'chip ' + (rc.on ? 'on' : '')} aria-pressed={rc.on} onClick={() => setRole(r.id, {on: !rc.on})}>{rc.on ? 'Playing' : 'Resting'}</button></div>
          <label>Instrument<select value={rc.inst} onChange={e => setRole(r.id, {inst: e.target.value, on: true})} aria-label={r.label + ' instrument'}>{sel('inst').map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
          {sel('style').length > 0 && <label>{r.id === 'air' ? 'Frequency' : 'Pattern'}<select value={rc.style} onChange={e => setRole(r.id, {style: e.target.value})} aria-label={r.label + ' style'}>{sel('style').map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>}
          <label>Level<input type="range" min="0" max="1.2" step=".05" value={rc.level} onChange={e => setRole(r.id, {level: Number(e.target.value)})} aria-label={r.label + ' level'}/></label>
        </div>;
      })}</div>

      <h2 className="sub">The laws of fate</h2>
      <p className="fine">Every note is a roll of the dice. These choose which dice.</p>
      <div className="fate">
        <Law title="How the melody moves" value={cfg.fate.pitch} options={FATES.pitch} onChange={v => setFate({pitch: v})}/>
        <Law title="When notes arrive" value={cfg.fate.time} options={FATES.time} onChange={v => setFate({time: v})}/>
        <Law title="How hard they are played" value={cfg.fate.dynamics} options={FATES.dynamics} onChange={v => setFate({dynamics: v})}/>
      </div>
      <div className="dials">
        <Dial label="Surprise" v={cfg.fate.entropy} text={word(cfg.fate.entropy, 'predictable', 'curious', 'adventurous')} onChange={v => setFate({entropy: v})}/>
        <Dial label="Busyness" v={cfg.fate.density} text={word(cfg.fate.density, 'spacious', 'flowing', 'busy')} onChange={v => setFate({density: v})}/>
        <Dial label="Swing" v={cfg.fate.swing} text={word(cfg.fate.swing, 'straight', 'loose', 'shuffled')} onChange={v => setFate({swing: v})}/>
        <Dial label="Human touch" v={cfg.fate.humanize} text={word(cfg.fate.humanize, 'exact', 'natural', 'sloppy')} onChange={v => setFate({humanize: v})}/>
      </div>

      <h2 className="sub">The room</h2>
      <div className="dials">
        <Dial label="Echo" v={cfg.fx.echo} text={word(cfg.fx.echo, 'dry', 'roomy', 'cavernous')} onChange={v => setFx({echo: v})}/>
        <Dial label="Tape wear" v={cfg.fx.lofi} text={word(cfg.fx.lofi, 'clean', 'dusty', 'crushed')} onChange={v => setFx({lofi: v})}/>
        <Dial label="Brightness" v={cfg.fx.bright} text={word(cfg.fx.bright, 'muffled', 'warm', 'airy')} onChange={v => setFx({bright: v})}/>
        <Dial label="Vinyl crackle" v={cfg.fx.crackle} text={word(cfg.fx.crackle, 'none', 'a little', 'lots')} onChange={v => setFx({crackle: v})}/>
        <label>Tempo<input type="range" min="40" max="160" value={cfg.bpm} onChange={e => patch(o => ({...o, bpm: Number(e.target.value)}))} aria-label="Tempo"/><output>{Math.round(cfg.bpm)} bpm</output></label>
        <label>Key<select value={cfg.base % 12} onChange={e => patch(o => ({...o, base: 48 + Number(e.target.value)}))} aria-label="Key">{KEYS.map((k, i) => <option key={k} value={i}>{k}</option>)}</select></label>
        <label>Scale<select value={cfg.scaleId} onChange={e => patch(o => ({...o, scale: e.target.value}))} aria-label="Scale">{Object.entries(SCALES).map(([id, s]) => <option key={id} value={id}>{s.name}</option>)}</select></label>
      </div>

      <div className="fate-actions">
        <button className="ghost" onClick={sound.reseed}>🎲 Roll new dice <small>seed {cfg.seed.toString(36)}</small></button>
        <button className="ghost" onClick={share}>Copy this evening</button>
        <input className="code" aria-label="Paste a code" placeholder="paste a code to load an evening" value={code} onChange={e => setCode(e.target.value)}/>
        <button className="ghost" disabled={!code.trim()} onClick={load}>Load</button>
        <span role="status" className="fine">{note}</span>
      </div>
      <p className="fine">The same seed and settings always play the same evening, so a good one can be saved and returned to.</p>
    </>}

    <h2 className="sub">Or just a steady sound</h2>
    <div className="textures">{presets.filter(p => p.id !== 'tavern').map(p => <button key={p.id} className={'texture ' + (sound.mode === p.id ? 'on' : '')} aria-pressed={sound.mode === p.id} onClick={() => sound.choose(p.id)} style={{'--hue': p.hue} as React.CSSProperties}>
      <i aria-hidden>{p.icon}</i><span><b>{p.name}</b><small>{p.kind}</small></span></button>)}</div>
    <div className="dials">
      <label>Volume<input type="range" min="0" max="100" value={sound.volume} onChange={e => sound.setVolume(Number(e.target.value))} aria-label="Volume"/><output>{sound.volume}%</output></label>
      <label>Let the drones wander<input type="range" min="0" max="1" step=".05" value={sound.drift} onChange={e => sound.setDrift(Number(e.target.value))} aria-label="How much the tones wander"/><output>{sound.drift < .2 ? 'still' : sound.drift < .65 ? 'gentle' : 'roaming'}</output></label>
      <label>Burn for<select value={sound.timer} onChange={e => sound.setTimer(Number(e.target.value))} aria-label="Session timer"><option value="0">All night</option><option value="15">15 min</option><option value="30">30 min</option><option value="60">60 min</option></select></label>
    </div>
    <p className="fine">The sound pauses by itself if another app starts playing. Playing a song from the shelves banks the fire, and lighting it pauses the song.</p>
  </section>;
}

function Law({title, value, options, onChange}: {title: string; value: string; options: {id: string; name: string; note?: string}[]; onChange: (v: string) => void}) {
  const cur = options.find(o => o.id === value);
  return <div className="law"><h3>{title}</h3>
    <div className="chips" role="group" aria-label={title}>{options.map(o => <button key={o.id} className={'chip ' + (value === o.id ? 'on' : '')} aria-pressed={value === o.id} onClick={() => onChange(o.id)}>{o.name}</button>)}</div>
    <p className="fine">{cur?.note}</p></div>;
}

function Dial({label, v, text, onChange}: {label: string; v: number; text: string; onChange: (v: number) => void}) {
  return <label>{label}<input type="range" min="0" max="1" step=".01" value={v} onChange={e => onChange(Number(e.target.value))} aria-label={label}/><output>{text}</output></label>;
}

// A piano roll that scrolls right to left, one dot per note the band actually played.
function Roll({sound}: {sound: Soundscape}) {
  const ref = useRef<HTMLCanvasElement>(null), hits = useRef(sound.hits);
  hits.current = sound.hits;
  useEffect(() => {
    const cv = ref.current; if (!cv) return;
    const ctx = cv.getContext('2d'); if (!ctx) return;
    let raf = 0;
    const draw = () => {
      const w = cv.clientWidth, h = cv.clientHeight, dpr = window.devicePixelRatio || 1;
      if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
      const now = performance.now();
      for (const n of hits.current) {
        const age = (now - n.at) / 2600; if (age > 1 || age < 0) continue;
        const lane = n.role === 3 ? .92 : n.role === 4 ? .08 : 1 - Math.max(0, Math.min(1, (n.pitch - 28) / 72));
        const x = w * (1 - age), y = 6 + lane * (h - 12), r = (n.role === 3 ? 3 : 4) + n.vel * 5;
        ctx.globalAlpha = (1 - age) * .9; ctx.fillStyle = `hsl(${ROLE_HUE[n.role] ?? 40} 85% 62%)`;
        ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
      }
      ctx.globalAlpha = 1; raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} className="roll" aria-hidden/>;
}
