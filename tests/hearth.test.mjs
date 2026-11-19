import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {GENRES, INSTRUMENTS, STYLES, FATES, SCALES, resolve, blankOverride, encode, decode} from '../lib/genres.mjs';

const source = fs.readFileSync(new URL('../public/hearth-worklet.js', import.meta.url), 'utf8');
function create(rate = 8000) {
  let Processor; const messages = [];
  vm.runInNewContext(source, {
    sampleRate: rate, Math, Float32Array, Number, Array, Object, String, isFinite, Date,
    AudioWorkletProcessor: class { constructor() { this.port = {postMessage: m => messages.push(m)}; } },
    registerProcessor: (_n, p) => { Processor = p; },
  });
  return {p: new Processor(), messages};
}
function run(p, seconds, rate = 8000) {
  const o = [[new Float32Array(128), new Float32Array(128)]];
  let energy = 0, peak = 0;
  for (let b = 0; b < Math.ceil(seconds * rate / 128); b++) {
    p.process([], o);
    for (const c of o[0]) for (const s of c) { assert.ok(Number.isFinite(s), 'finite'); peak = Math.max(peak, Math.abs(s)); energy += s * s; }
  }
  return {energy, peak};
}

test('every genre plays bounded, non-silent stereo audio within the voice limit', () => {
  for (const g of GENRES) {
    const {p} = create();
    p.port.onmessage({data: {cfg: resolve(g.id, {seed: 7}), active: true}});
    const r = run(p, 25);
    assert.ok(r.peak <= 1, g.id + ' peak');
    assert.ok(r.energy > .05, g.id + ' silent');
    assert.ok(p.vs.length <= 64, g.id + ' voices');
  }
});

test('every instrument in every role renders finite, bounded sound', () => {
  for (const role of Object.keys(INSTRUMENTS)) for (const inst of INSTRUMENTS[role]) {
    const {p} = create();
    const over = {...blankOverride(), seed: 3, roles: {[role]: {on: true, inst: inst.id, level: 1}}};
    if (role === 'drums') over.roles.drums = {on: true, inst: inst.id, level: 1};
    p.port.onmessage({data: {cfg: resolve('tavern', over), active: true}});
    const r = run(p, 12);
    assert.ok(r.peak <= 1, role + '/' + inst.id);
  }
});

test('every pitch, time, dynamics law and style yields finite output', () => {
  for (const pitch of FATES.pitch) for (const time of FATES.time) {
    const {p} = create();
    p.port.onmessage({data: {cfg: resolve('jazz', {seed: 11, fate: {pitch: pitch.id, time: time.id, dynamics: 'wild', entropy: 1, density: 1}}), active: true}});
    run(p, 8);
  }
  for (const role of ['bass', 'harmony', 'air']) for (const st of STYLES[role]) {
    const {p} = create();
    p.port.onmessage({data: {cfg: resolve('lofi', {seed: 5, roles: {[role]: {on: true, style: st.id}}}), active: true}});
    run(p, 8);
  }
  for (const id of Object.keys(SCALES)) {
    const {p} = create();
    p.port.onmessage({data: {cfg: resolve('zen', {seed: 5, scale: id}), active: true}});
    run(p, 6);
  }
});

test('the same seed and settings replay the same evening; a different seed does not', () => {
  const grab = seed => {
    const {p} = create(); p.port.onmessage({data: {cfg: resolve('jazz', {seed}), active: true}});
    const o = [[new Float32Array(128), new Float32Array(128)]]; const out = [];
    for (let b = 0; b < 400; b++) { p.process([], o); out.push(o[0][0][5], o[0][1][77]); }
    return out;
  };
  assert.deepEqual(grab(42), grab(42));
  assert.notDeepEqual(grab(42), grab(43));
});

test('inactive worklet is silent, and garbage config cannot break it', () => {
  const {p} = create();
  const o = [[new Float32Array(128).fill(1), new Float32Array(128).fill(1)]];
  p.process([], o); assert.ok(o[0][0].every(s => s === 0));
  p.port.onmessage({data: {cfg: {bpm: 'fast', scale: [NaN], roles: {lead: {on: true, inst: '<x>', level: 99}, drums: {on: true, inst: 'nope', pattern: {kick: 'x'}}}, fate: {pitch: 'bogus', entropy: 9}, fx: {echo: -4}, seed: 'x'}, active: true}});
  run(p, 8);
  p.port.onmessage({data: null});
  p.port.onmessage({data: {cfg: null}});
  run(p, 1);
});

test('live changes keep the voice pool bounded and free of NaN', () => {
  const {p} = create();
  p.port.onmessage({data: {cfg: resolve('lofi', {seed: 1}), active: true}});
  for (let i = 0; i < 40; i++) {
    const g = GENRES[i % GENRES.length];
    p.port.onmessage({data: {cfg: resolve(g.id, {seed: 1, bpm: 40 + i * 3, scale: Object.keys(SCALES)[i % Object.keys(SCALES).length]})}});
    run(p, 1.5);
    assert.ok(p.vs.length <= 64);
  }
});

test('the worklet reports notes and bars for the visualiser', () => {
  const {p, messages} = create();
  p.port.onmessage({data: {cfg: resolve('tavern', {seed: 2}), active: true}});
  run(p, 20);
  assert.ok(messages.some(m => m.notes && m.notes.length));
  assert.ok(messages.some(m => m.bar));
});

test('distributions have the right shape', () => {
  const {p} = create(); p.port.onmessage({data: {cfg: {seed: 9}}});
  const d = p.dist, N = 20000, avg = f => { let s = 0; for (let i = 0; i < N; i++) s += f(); return s / N; };
  assert.ok(Math.abs(avg(() => d.normal(5, 2)) - 5) < .1);
  assert.ok(Math.abs(avg(() => d.expo(3)) - 3) < .15);
  assert.ok(Math.abs(avg(() => d.poisson(4)) - 4) < .1);
  assert.ok(Math.abs(avg(() => d.geometric(.25)) - 3) < .25);
  assert.ok(avg(() => d.pareto(3)) > 1.3 && avg(() => d.pareto(3)) < 1.7);
  const w = [0, 0, 0]; for (let i = 0; i < 6000; i++) w[d.weighted([1, 2, 3])]++;
  assert.ok(w[2] > w[1] && w[1] > w[0]);
  const e = p.euclid(5, 16); assert.equal(e.filter(Boolean).length, 5);
});

test('resolve applies overrides, rejects invalid ones, and round-trips share codes', () => {
  const r = resolve('jazz', {roles: {lead: {inst: 'chip', level: 9}, bass: {inst: 'nonsense'}}, fate: {pitch: 'chaos', entropy: 7}, bpm: 9999, scale: 'nope'});
  assert.equal(r.roles.lead.inst, 'chip'); assert.equal(r.roles.lead.level, 1.5);
  assert.equal(r.roles.bass.inst, 'upright'); assert.equal(r.fate.pitch, 'chaos'); assert.equal(r.fate.entropy, 1);
  assert.equal(r.bpm, 220); assert.equal(r.scaleId, 'dorian');
  const over = {...blankOverride(), seed: 77, fate: {pitch: 'zipf'}, bpm: 100};
  const back = decode(encode('dub', over));
  assert.equal(back.genre, 'dub'); assert.equal(back.over.seed, 77); assert.equal(back.over.fate.pitch, 'zipf');
  assert.equal(decode('not base64 !!'), null);
  assert.equal(decode(encode('dub', over).slice(0, 8)), null);
});

test('every genre references only real instruments, styles and scales', () => {
  const ids = new Set();
  for (const g of GENRES) {
    assert.ok(!ids.has(g.id)); ids.add(g.id); assert.ok(SCALES[g.scale], g.id + ' scale');
    for (const [role, rc] of Object.entries(g.roles)) {
      if (!rc.on) continue;
      assert.ok(INSTRUMENTS[role].some(i => i.id === rc.inst), g.id + '/' + role + '/' + rc.inst);
      if (STYLES[role].length) assert.ok(STYLES[role].some(s => s.id === rc.style), g.id + '/' + role + ' style');
    }
    assert.ok(FATES.pitch.some(f => f.id === g.fate.pitch)); assert.ok(FATES.time.some(f => f.id === g.fate.time));
  }
  assert.ok(GENRES.length >= 16);
});
