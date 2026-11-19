// The Hearth's band: a small generative orchestra that runs on the audio thread.
//
// Every random choice (which note, when, how loud, how detuned) is drawn from ONE seeded generator through the
// distributions below, so a seed is a replayable "fate": the same seed and settings always play the same evening.
// The page tells this processor what to play via a plain config object (see lib/genres.mjs, toEngine()).
//
// Five roles: bass, harmony, lead, drums, air. Each role plays one instrument chosen from the INST table.

const TAU = Math.PI * 2;
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);

// ---------------------------------------------------------------------------------------------------------------
// Randomness: a seeded uniform generator and the distributions built on it.
// ---------------------------------------------------------------------------------------------------------------
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
let rng = mulberry32(1);
const rand = () => rng();
const nz = () => rand() * 2 - 1;
let spare = null;

const dist = {
  reset() { spare = null; },
  uniform(a, b) { return a + (b - a) * rand(); },
  // Box-Muller: a bell curve around mu with spread sd.
  normal(mu, sd) {
    if (spare !== null) { const z = spare; spare = null; return mu + sd * z; }
    const u = rand() || 1e-9, v = rand(), m = Math.sqrt(-2 * Math.log(u));
    spare = m * Math.sin(TAU * v);
    return mu + sd * m * Math.cos(TAU * v);
  },
  // Waiting times between independent events (the gaps of a Poisson process).
  expo(mean) { return -Math.log(1 - rand()) * mean; },
  // Positive and right-skewed: mostly near the median, occasionally far above.
  logNormal(median, sigma) { return median * Math.exp(sigma * dist.normal(0, 1)); },
  // Count of events in a fixed window (Knuth).
  poisson(lambda) {
    const L = Math.exp(-lambda);
    let k = 0, p = 1;
    do { k++; p *= rand(); } while (p > L && k < 100);
    return k - 1;
  },
  // Failures before the first success.
  geometric(p) { return Math.floor(Math.log(1 - rand()) / Math.log(1 - clamp(p, 1e-6, .999999))); },
  // Power-law tail: P(X > x) = x^-alpha for x >= 1. Small alpha means rarer, wilder outliers.
  pareto(alpha) { return Math.pow(1 - rand(), -1 / alpha); },
  pick(list) { return list[Math.floor(rand() * list.length)]; },
  chance(p) { return rand() < p; },
  // Index drawn in proportion to the weights.
  weighted(weights) {
    let total = 0;
    for (let i = 0; i < weights.length; i++) total += weights[i];
    let x = rand() * total;
    for (let i = 0; i < weights.length; i++) { x -= weights[i]; if (x < 0) return i; }
    return weights.length - 1;
  },
};

// k hits spread as evenly as possible across n steps (Bresenham): the "Euclidean rhythm".
function euclid(k, n) {
  const out = new Array(n).fill(false);
  let acc = 0;
  for (let i = 0; i < n; i++) { acc += k; if (acc >= n) { acc -= n; out[i] = true; } }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------
// Instruments. r = which renderer; g = loudness trim; shift = semitones; atk/rel = envelope seconds; hold = the
// shortest the note may ring (plucks and mallets should not be cut short by a brief gate).
// ---------------------------------------------------------------------------------------------------------------
const INST = {
  // bass
  sub:       {r: 'sub', g: .85, atk: .012, rel: .3, d: .9, hold: .6},
  synthbass: {r: 'saw', g: .5, atk: .006, rel: .18, n: 2, det: .005, cut0: 150, cut1: 1500, cd: 6, track: .2, sub: .6, vib: 0, hold: .2},
  upright:   {r: 'pluck', g: .9, atk: .002, rel: .3, damp: .4985, lp: .8, hold: 1.1},
  // sustained pitched
  pad:       {r: 'saw', g: .3, atk: .9, rel: 1.5, n: 3, det: .007, cut0: 450, cut1: 500, cd: .5, track: .5, sub: 0, vib: 0},
  strings:   {r: 'saw', g: .28, atk: .4, rel: .9, n: 3, det: .006, cut0: 1000, cut1: 500, cd: .6, track: .5, sub: 0, vib: .004},
  glass:     {r: 'add', g: .5, atk: .35, rel: 1.2, h: [[1, 1, .25], [2, .35, .3], [3, .14, .5], [1.003, .6, .25]]},
  choir:     {r: 'choir', g: .55, atk: .5, rel: 1.1},
  organ:     {r: 'add', g: .4, atk: .03, rel: .15, h: [[1, 1, 0], [2, .5, 0], [3, .25, 0], [4, .12, 0], [.5, .35, 0]]},
  // struck / plucked
  epiano:    {r: 'fm', g: .6, atk: .004, rel: .3, ratio: 1, idx: 1.5, idec: 3, d: 1.4, tine: .15, hold: .8},
  harp:      {r: 'pluck', g: .8, atk: .001, rel: .4, damp: .4993, lp: .55, hold: 1.8},
  guitar:    {r: 'pluck', g: .8, atk: .001, rel: .3, damp: .4985, lp: .35, hold: 1.4},
  koto:      {r: 'pluck', g: .8, atk: .001, rel: .3, damp: .4968, lp: .05, hold: 1.2},
  kalimba:   {r: 'add', g: .7, shift: 12, atk: .002, rel: .1, h: [[1, 1, 3.2], [5.4, .35, 14], [13.2, .12, 28]], hold: .9},
  marimba:   {r: 'add', g: .75, atk: .002, rel: .1, h: [[1, 1, 5], [3.9, .4, 18], [9.2, .12, 40]], hold: .7},
  // melodic voices
  flute:     {r: 'flute', g: .5, atk: .07, rel: .14, vib: .004, breath: .35},
  whistle:   {r: 'flute', g: .42, shift: 12, atk: .05, rel: .12, vib: .009, breath: .12},
  bell:      {r: 'fm', g: .5, shift: 12, atk: .002, rel: .4, ratio: 3.5, idx: 2.4, idec: 1.4, d: .9, tine: 0, hold: 2.5},
  synth:     {r: 'saw', g: .3, atk: .008, rel: .22, n: 2, det: .005, cut0: 700, cut1: 3200, cd: 2.5, track: .3, sub: 0, vib: .003},
  chip:      {r: 'pulse', g: .4, atk: .002, rel: .08, duty: .5, dm: .15, d: 2.5, hold: .3},
  // resonant metal
  bowl:      {r: 'add', g: .5, atk: .06, rel: 1.5, h: [[1, 1, .35], [1.004, .8, .4], [2.71, .35, .7], [5.4, .15, 1.4]], hold: 3},
  gong:      {r: 'add', g: .45, shift: -12, atk: .01, rel: 1.5, h: [[1, .8, .45], [1.47, .4, .6], [2.09, .5, .5], [2.56, .3, .9], [3.8, .2, 1.2], [.5, .4, .25]], hold: 5},
  chime:     {r: 'fm', g: .38, shift: 24, atk: .001, rel: .5, ratio: 3.5, idx: 1.6, idec: 2, d: 1.3, tine: 0, hold: 2.5},
  // the world outside
  bird:      {r: 'bird', g: .5, atk: .005, rel: .08},
  drip:      {r: 'drip', g: .55, atk: .001, rel: .1},
  whale:     {r: 'whale', g: .5, atk: 1.5, rel: 2},
  wind:      {r: 'wind', g: .6, atk: 2, rel: 2.5},
  // percussion (pitch is part of the sound, so the note number is ignored)
  kick:      {r: 'thump', g: .9, perc: 1, rel: .05, f0: 52, sw: 3, sd: 28, d: 11, click: .15, sq: 0},
  kick808:   {r: 'thump', g: .9, perc: 1, rel: .1, f0: 42, sw: 2.4, sd: 14, d: 3.4, click: .05, sq: 0, hold: .6},
  taiko:     {r: 'thump', g: .95, perc: 1, rel: .1, f0: 68, sw: 1.4, sd: 16, d: 5, click: .25, sq: 0, hold: .4},
  frame:     {r: 'thump', g: .8, perc: 1, rel: .05, f0: 125, sw: .6, sd: 30, d: 9, click: .3, sq: 0},
  snare:     {r: 'snare', g: .6, perc: 1, rel: .05, tone: 185, td: 26, tm: .45, d: 24, hold: .2},
  clap:      {r: 'clap', g: .55, perc: 1, rel: .05, hold: .3},
  brush:     {r: 'brush', g: .55, perc: 1, rel: .05, d: 12, hold: .3},
  hat:       {r: 'hat', g: .35, perc: 1, rel: .02, d: 70},
  ride:      {r: 'hat', g: .22, perc: 1, rel: .05, d: 9, hold: .3},
  shaker:    {r: 'hat', g: .3, perc: 1, rel: .03, d: 22, atk: .008, hold: .1},
  tap:       {r: 'tap', g: .5, perc: 1, rel: .02},
  wood:      {r: 'wood', g: .5, perc: 1, rel: .02, hold: .1},
  chipkick:  {r: 'thump', g: .4, perc: 1, rel: .03, f0: 60, sw: 6, sd: 25, d: 12, click: 0, sq: 1},
  chipsnare: {r: 'chipnoise', g: .35, perc: 1, rel: .02, hold: .15, d: 28, every: 3},
  chiphat:   {r: 'chipnoise', g: .22, perc: 1, rel: .02, hold: .06, d: 90, every: 2},
  chipblip:  {r: 'pulse', g: .3, perc: 1, rel: .02, fixed: 1500, duty: .25, dm: 0, d: 45, hold: .1},
};
for (const id in INST) {
  const k = INST[id];
  k.shift = k.shift || 0; k.atk = k.atk || .001; k.rel = k.rel || .05; k.hold = k.hold || 0; k.dur = k.dur || 1;
  if (k.h) { let s = 0; for (const q of k.h) s += q[1]; k.norm = 1 / s; }
}
// Which instrument plays each drum lane, per kit.
const KITS = {
  lofi:   {kick: 'kick', snare: 'snare', hat: 'hat', tap: 'tap'},
  electro: {kick: 'kick808', snare: 'clap', hat: 'hat', tap: 'wood'},
  tribal: {kick: 'taiko', snare: 'frame', hat: 'shaker', tap: 'wood'},
  brush:  {kick: 'kick', snare: 'brush', hat: 'ride', tap: 'tap'},
  chip:   {kick: 'chipkick', snare: 'chipsnare', hat: 'chiphat', tap: 'chipblip'},
};
const LANES = ['kick', 'snare', 'hat', 'tap'];
const LANE_NOTE = {kick: 30, snare: 36, hat: 42, tap: 48};
const LANE_PAN = {kick: 0, snare: .1, hat: .35, tap: -.3};
const ROLES = ['bass', 'harmony', 'lead', 'drums', 'air'];
const PITCH_LAWS = ['walk', 'levy', 'markov', 'zipf', 'uniform', 'motif', 'chaos'];
const TIME_LAWS = ['grid', 'euclid', 'poisson', 'burst'];
const DYN_LAWS = ['steady', 'human', 'wild'];
const AIR_RATE = {sparse: 5, gentle: 12, lively: 28}; // events per minute
const MAXV = 64;

// Three vowel timbres for the choir, as one-cycle wavetables (the formant peaks are fixed, so the vowel shifts a
// little with pitch, like a sample played at different speeds).
const TABLES = [[800, 1150], [450, 800], [300, 2200]].map(fm => {
  const w = [];
  for (let k = 1; k < 26; k++) {
    const f = k * 196;
    w.push((Math.exp(-(((f - fm[0]) / 230) ** 2)) + .45 * Math.exp(-(((f - fm[1]) / 300) ** 2)) + .08) / k);
  }
  const tbl = new Float32Array(1024);
  let peak = 0;
  for (let i = 0; i < 1024; i++) {
    let x = 0;
    for (let k = 1; k < 26; k++) x += w[k - 1] * Math.sin(TAU * k * i / 1024);
    tbl[i] = x; peak = Math.max(peak, Math.abs(x));
  }
  for (let i = 0; i < 1024; i++) tbl[i] /= peak;
  return tbl;
});

// ---------------------------------------------------------------------------------------------------------------
// Voice renderers. Each returns one raw mono sample; the envelope (attack/gate/release) is applied by the caller.
// v: the voice (f = Hz, p/q/y = phases, x/z = filter state, k = instrument); t: seconds since the note began.
// ---------------------------------------------------------------------------------------------------------------
const R = {
  sub(v, t) { v.p += v.f / sampleRate; const ph = TAU * v.p; return (Math.sin(ph) + .22 * Math.sin(2 * ph)) * Math.exp(-t * v.k.d); },
  add(v, t) {
    const h = v.k.h; let s = 0;
    for (let i = 0; i < h.length; i++) { const q = h[i]; s += q[1] * Math.sin(TAU * v.f * q[0] * t + v.ph0 * (i + 1)) * Math.exp(-t * q[2]); }
    return s * v.k.norm;
  },
  fm(v, t) {
    const k = v.k; v.p += v.f / sampleRate; v.q += v.f * k.ratio / sampleRate;
    const idx = k.idx * Math.exp(-t * k.idec);
    return Math.sin(TAU * v.p + idx * Math.sin(TAU * v.q)) * Math.exp(-t * k.d) + (k.tine ? k.tine * Math.sin(TAU * v.f * 5 * t) * Math.exp(-t * 30) : 0);
  },
  pluck(v) { // Karplus-Strong: a burst of noise circulating through a damped delay line
    const b = v.buf, n = b.length, q = v.pos + 1 === n ? 0 : v.pos + 1, s = b[v.pos];
    b[v.pos] = (s + b[q]) * v.k.damp; v.pos = q; return s;
  },
  flute(v, t) {
    const k = v.k, vib = 1 + k.vib * Math.min(1, t * 1.6) * Math.sin(TAU * 5.2 * t + v.ph0);
    v.p += v.f * vib / sampleRate; const ph = TAU * v.p;
    v.x += .3 * (nz() - v.x);
    return Math.sin(ph) + .2 * Math.sin(2 * ph) + .05 * Math.sin(3 * ph) + v.x * k.breath * 3;
  },
  saw(v, t) { // one to three detuned saws through a two-pole low-pass whose cutoff sweeps down
    const k = v.k, vib = k.vib ? 1 + k.vib * Math.min(1, t) * Math.sin(TAU * 5.4 * t + v.ph0) : 1, inc = v.f * vib / sampleRate;
    v.p += inc; v.p -= Math.floor(v.p);
    let s = 2 * v.p - 1;
    if (k.n > 1) { v.q += inc * (1 + k.det); v.q -= Math.floor(v.q); s += 2 * v.q - 1; }
    if (k.n > 2) { v.y += inc * (1 - k.det); v.y -= Math.floor(v.y); s += 2 * v.y - 1; }
    s /= k.n;
    const a = Math.min(.85, TAU * (k.cut0 + k.cut1 * Math.exp(-t * k.cd)) * v.tr / sampleRate);
    v.x += a * (s - v.x); v.z += a * (v.x - v.z);
    return v.z + (k.sub ? k.sub * Math.sin(TAU * v.f * .5 * t) : 0);
  },
  pulse(v, t) {
    v.p += v.f / sampleRate; v.p -= Math.floor(v.p);
    return (v.p < v.k.duty + v.k.dm * Math.sin(TAU * 6 * t) ? 1 : -1) * Math.exp(-t * v.k.d) * .55;
  },
  choir(v, t) {
    const inc = v.f * (1 + .0035 * Math.sin(TAU * 5.1 * t + v.ph0)) / sampleRate, T = v.tbl;
    v.p += inc; v.q += inc * 1.0045; v.y += inc * .9962;
    if (v.p >= 1) v.p -= 1; if (v.q >= 1) v.q -= 1; if (v.y >= 1) v.y -= 1;
    return (T[(v.p * 1024) | 0] + T[(v.q * 1024) | 0] + T[(v.y * 1024) | 0]) / 3;
  },
  // percussion
  thump(v, t) {
    const k = v.k; let s = Math.sin(TAU * (k.f0 * t + k.sw * (1 - Math.exp(-t * k.sd))));
    if (k.sq) s = s > 0 ? 1 : -1;
    return s * Math.exp(-t * k.d) + (k.click ? nz() * Math.exp(-t * 400) * k.click : 0);
  },
  snare(v, t) { const k = v.k; return Math.sin(TAU * k.tone * t) * Math.exp(-t * k.td) * k.tm + nz() * Math.exp(-t * k.d) * .8; },
  clap(v, t) {
    v.x += .5 * (nz() - v.x);
    return v.x * 2 * (t < .033 ? Math.exp(-(t % .011) * 200) : .45 * Math.exp(-(t - .033) * 16));
  },
  brush(v, t) { v.x += .3 * (nz() - v.x); return v.x * 1.6 * Math.min(1, t / .02) * Math.exp(-t * v.k.d); },
  hat(v, t) { const n = nz(); v.x += .55 * (n - v.x); return (n - v.x) * Math.exp(-t * v.k.d); },
  tap(v, t) { return Math.sin(TAU * 1700 * t) * Math.exp(-t * 95) * .5 + nz() * Math.exp(-t * 240) * .5; },
  wood(v, t) { return Math.sin(TAU * 820 * t) * Math.exp(-t * 40) + .4 * Math.sin(TAU * 1230 * t) * Math.exp(-t * 60); },
  chipnoise(v, t) { if (v.age % v.k.every === 0) v.x = nz(); return v.x * Math.exp(-t * v.k.d); },
  // the world outside
  bird(v, t) {
    const u = t * v.rate, fr = u - Math.floor(u), g = fr < .62 ? Math.sin(Math.PI * fr / .62) : 0;
    v.p += v.f * (1 + .35 * fr) * (1 + .03 * Math.sin(TAU * 38 * t)) / sampleRate;
    return (Math.sin(TAU * v.p) + .25 * Math.sin(2 * TAU * v.p)) * g * .7;
  },
  drip(v, t) { v.p += v.f * (1 + 2.2 * (1 - Math.exp(-t * 28))) / sampleRate; return Math.sin(TAU * v.p) * Math.exp(-t * 13); },
  whale(v, t) {
    const D = v.len / sampleRate, g = 1 + .45 * Math.sin(Math.PI * Math.min(1, t / D));
    v.p += v.f * g * (1 + .012 * Math.sin(TAU * 2.6 * t)) / sampleRate;
    const ph = TAU * v.p;
    return Math.sin(ph) + .5 * Math.sin(2 * ph) + .22 * Math.sin(3 * ph);
  },
  wind(v, t) {
    const a = Math.min(.5, TAU * v.f * (1 + .4 * Math.sin(TAU * .23 * t + v.ph0)) / sampleRate);
    v.x += a * (nz() - v.x); v.z += a * .35 * (v.x - v.z);
    return (v.x - v.z) * 5;
  },
};

// ---------------------------------------------------------------------------------------------------------------
// The band.
// ---------------------------------------------------------------------------------------------------------------
class Hearth extends AudioWorkletProcessor {
  constructor() {
    super();
    this.dist = dist; this.inst = INST; this.kits = KITS; this.euclid = euclid;
    this.active = false; this.seed = 1; this.vs = []; this.evs = [];
    const dn = Math.ceil(sampleRate * 3);
    this.dl = new Float32Array(dn); this.dr = new Float32Array(dn); this.dp = 0;
    this.tl = 0; this.tr_ = 0; this.hc = 0; this.hl = 0; this.hr = 0; this.pop = 0;
    this.configure({});
    this.port.onmessage = e => {
      const d = e.data || {};
      if (d.cfg) this.configure(d.cfg);
      if (typeof d.active === 'boolean') this.active = d.active;
    };
  }

  // Take a (possibly partial or untrusted) config and make it safe.
  configure(c) {
    const num = (x, d, lo, hi) => (typeof x === 'number' && isFinite(x) ? clamp(x, lo, hi) : d);
    const oneOf = (x, list, d) => (list.indexOf(x) >= 0 ? x : d);
    const scale = Array.isArray(c.scale) && c.scale.length >= 2 && c.scale.length <= 12 && c.scale.every(x => typeof x === 'number' && isFinite(x)) ? c.scale.slice() : [0, 2, 4, 5, 7, 9, 11];
    const roles = {};
    for (const name of ROLES) {
      const r = (c.roles && c.roles[name]) || {};
      roles[name] = {on: r.on === true, inst: String(r.inst || ''), style: String(r.style || ''), level: num(r.level, .6, 0, 1.5)};
    }
    const raw = (c.roles && c.roles.drums && c.roles.drums.pattern) || {};
    const L = clamp(Math.round((raw.kick && raw.kick.length) || 16), 4, 32);
    const pattern = {};
    for (const lane of LANES) { const a = Array.isArray(raw[lane]) ? raw[lane] : []; pattern[lane] = Array.from({length: L}, (_, i) => num(a[i], 0, 0, 1)); }
    const f = c.fate || {}, x = c.fx || {}, h = c.harm || {};
    const moves = Array.isArray(h.moves) && h.moves.length && h.moves.every(m => Array.isArray(m) && isFinite(m[0]) && m[1] > 0) ? h.moves.map(m => [Math.round(m[0]), m[1]]) : [[3, 3], [4, 3], [5, 2], [1, 1]];
    const next = {
      bpm: num(c.bpm, 90, 30, 220), base: num(c.base, 50, 24, 72), scale, roles, L, pattern,
      fate: {
        pitch: oneOf(f.pitch, PITCH_LAWS, 'walk'), time: oneOf(f.time, TIME_LAWS, 'grid'), dynamics: oneOf(f.dynamics, DYN_LAWS, 'human'),
        entropy: num(f.entropy, .4, 0, 1), density: num(f.density, .5, 0, 1), swing: num(f.swing, 0, 0, 1), humanize: num(f.humanize, .4, 0, 1),
      },
      fx: {echo: num(x.echo, .2, 0, 1), lofi: num(x.lofi, 0, 0, 1), bright: num(x.bright, .6, 0, 1), crackle: num(x.crackle, 0, 0, 1)},
      harm: {moves, home: num(h.home, .5, 0, 1), ext: num(h.ext, .1, 0, 1)},
    };
    const seed = Number.isFinite(c.seed) ? (c.seed >>> 0) : this.seed;
    const fresh = !this.c || seed !== this.seed;
    const resized = !this.c || this.c.scale.length !== scale.length;
    this.c = next; this.n = scale.length; this.L = L; this.cont = next.fate.time === 'poisson' || next.fate.time === 'burst';
    if (fresh) { this.seed = seed; rng = mulberry32(seed); dist.reset(); this.resetState(); }
    else if (resized) this.initMelody();
    this.applyFx();
  }

  applyFx() {
    const c = this.c, f = c.fx;
    this.stepLen = sampleRate * 60 / c.bpm / 4;
    this.echoMix = f.echo * .5; this.echoFb = .2 + .45 * f.echo;
    this.dsamp = clamp(Math.round(sampleRate * 60 / c.bpm * .75), 1, this.dl.length - 1);
    this.lofiOn = f.lofi > .02; this.hold = 1 + Math.floor(f.lofi * 5); this.q = Math.pow(2, 14 - f.lofi * 7);
    this.ta = 1 - Math.exp(-TAU * 350 * Math.pow(2, f.bright * 5.4) / sampleRate);
    this.crackP = f.crackle * f.crackle * 140 / sampleRate; // pops per second, as a per-sample chance (a Poisson process)
  }

  resetState() {
    this.step = 0; this.until = 0; this.chord = 0; this.nextChord = 0; this.tones = [0, 2, 4]; this.toneMods = [0, 2, 4];
    this.energy = .75; this.rest = 0; this.ai = -1; this.ad = 1; this.eu = null;
    this.logi = .2 + rand() * .6; this.motifI = 0;
    this.leadWait = Math.round(sampleRate * (.4 + rand())); this.airWait = Math.round(sampleRate * dist.expo(4));
    this.vs.length = 0; this.evs.length = 0;
    this.initMelody();
  }

  initMelody() {
    const n = this.n, lo = Math.floor(n * .8), hi = Math.floor(n * 2.4), mid = Math.floor(n * 1.55);
    this.lx = mid;
    this.motif = Array.from({length: 8}, () => clamp(mid + Math.round(dist.normal(0, 2)), lo, hi));
  }

  deg2midi(d) { const n = this.n; return this.c.base + this.c.scale[((d % n) + n) % n] + 12 * Math.floor(d / n); }
  sec(s) { return Math.round(s * sampleRate); }
  beat() { return 60 / this.c.bpm; }
  jit() { const h = this.c.fate.humanize; return Math.round(Math.abs(dist.normal(0, h * .012 * sampleRate))); }
  vel(s) {
    const law = this.c.fate.dynamics, e = .82 + .18 * this.energy;
    let v;
    if (law === 'steady') v = dist.normal(.78, .04);
    else if (law === 'wild') v = .12 + dist.expo(.4);
    else v = .38 + .46 * s + dist.normal(0, .07);
    return clamp(v, .12, 1) * e;
  }

  // Start one note. Returns nothing; the voice is mixed in process().
  play(role, id, midi, vel, dur, wait, pan, hz, extra) {
    const k = INST[id], rc = this.c.roles[role];
    if (!k || !rc) return;
    if (this.vs.length >= MAXV) this.vs.shift();
    const f = k.fixed || hz || (k.perc ? 0 : 440 * Math.pow(2, (midi + k.shift - 69 + dist.normal(0, 2 + 7 * this.c.fate.entropy) / 100) / 12));
    const len = Math.max(64, Math.round(Math.max(dur * k.dur, k.hold) * sampleRate)), rel = Math.max(8, Math.round(k.rel * sampleRate));
    const ang = (clamp(pan, -1, 1) + 1) * Math.PI / 4;
    const v = {r: R[k.r], k, f, a: vel * rc.level * k.g, gl: Math.cos(ang) * 1.3, gr: Math.sin(ang) * 1.3, age: 0, w: wait | 0, len, rel, life: len + rel, p: 0, q: 0, y: 0, x: 0, z: 0, ph0: rand() * TAU, tr: 1};
    if (extra) for (const key in extra) v[key] = extra[key];
    if (k.r === 'pluck') {
      const n = Math.max(2, Math.round(sampleRate / f)), b = new Float32Array(n);
      let last = 0, peak = 1e-9;
      for (let i = 0; i < n; i++) { last = k.lp * last + (1 - k.lp) * nz(); b[i] = last; peak = Math.max(peak, Math.abs(last)); }
      for (let i = 0; i < n; i++) b[i] /= peak;
      v.buf = b; v.pos = 0;
    } else if (k.r === 'choir') v.tbl = TABLES[Math.floor(rand() * TABLES.length)];
    else if (k.r === 'saw') v.tr = Math.pow(f / 220, k.track);
    this.vs.push(v);
    if (this.evs.length < 32) this.evs.push([ROLES.indexOf(role), Math.round((k.perc ? midi : f > 0 ? 69 + 12 * Math.log2(f / 440) : midi) * 10) / 10, Math.round(vel * 100) / 100]);
  }

  // A note from a scale degree, for the given role's instrument.
  note(role, deg, vel, dur, wait, pan) { this.play(role, this.c.roles[role].inst, this.deg2midi(deg), vel, dur, wait, pan); }

  chordTones(d) {
    const t = [d, d + 2, d + 4];
    if (rand() < this.c.harm.ext) t.push(d + 6);
    if (rand() < this.c.harm.ext * .5) t.push(d + 8);
    return t;
  }

  // ---- the grid: one tick per sixteenth note ---------------------------------------------------------------------
  tick() {
    const L = this.L, pos = this.step % L, bar = Math.floor(this.step / L);
    if (pos === 0) this.newBar(bar);
    this.sw = (pos & 1) ? Math.round(this.c.fate.swing * this.stepLen * .5) : 0;
    this.drums(pos, bar); this.bass(pos); this.harmony(pos);
    if (!this.cont) this.lead(pos);
    this.step++;
  }

  newBar(bar) {
    const c = this.c, h = c.harm, n = this.n, ent = c.fate.entropy;
    this.chord = bar === 0 ? 0 : this.nextChord;
    if (bar % 4 === 3 && dist.chance(h.home)) this.nextChord = 0;
    else { const m = h.moves; this.nextChord = (((this.chord + m[dist.weighted(m.map(x => x[1]))][0]) % n) + n) % n; }
    this.tones = this.chordTones(this.chord);
    this.toneMods = this.tones.map(d => ((d % n) + n) % n);
    if (bar % 4 === 0) this.energy = clamp(this.energy + (.75 - this.energy) * .15 + dist.normal(0, .1 * (.4 + ent)), .45, 1);
    if (bar % 8 === 0) this.rest = bar > 0 && dist.chance(ent * .45) ? 2 : 0; else if (this.rest > 0) this.rest--;
    if (bar % 8 === 0 && bar > 0) for (let i = 0; i < this.motif.length; i++) if (dist.chance(ent * .3)) this.motif[i] += dist.pick([-1, 1]);
    if (bar % 2 === 0) this.eu = euclid(clamp(1 + dist.poisson(.5 + c.fate.density * this.L * .4), 1, this.L - 1), this.L), this.eu.rot = Math.floor(rand() * this.L);
    this.port.postMessage({bar: {n: bar, chord: this.chord, energy: Math.round(this.energy * 100) / 100, rest: this.rest > 0}});
  }

  drums(pos, bar) {
    const c = this.c, d = c.roles.drums;
    if (!d.on) return;
    const kit = KITS[d.inst] || KITS.lofi, dens = c.fate.density, ent = c.fate.entropy;
    for (const lane of LANES) {
      if (this.rest > 0 && (lane === 'kick' || lane === 'snare')) continue;
      const base = c.pattern[lane][pos];
      let p = base > 0 ? clamp(base * (.55 + .9 * dens), 0, 1) : lane === 'hat' ? ent * .07 : ent * .025;
      if (this.rest > 0) p *= .5;
      if (rand() < p) this.play('drums', kit[lane], LANE_NOTE[lane], this.vel(base > 0 ? base : .3), .3, this.jit() + this.sw, LANE_PAN[lane]);
    }
    if (bar % 8 === 7 && pos >= this.L - 4 && dist.chance(ent * .6)) {
      const lane = dist.pick(['snare', 'tap', 'tap']);
      this.play('drums', kit[lane], LANE_NOTE[lane], this.vel(.5), .2, this.jit(), LANE_PAN[lane]);
    }
  }

  bass(pos) {
    const c = this.c, b = c.roles.bass;
    if (!b.on) return;
    const n = this.n, L = this.L, bt = this.beat(), root = this.chord - n, dens = c.fate.density;
    const go = (deg, beats, s) => this.note('bass', deg, this.vel(s), beats * bt, this.jit() + this.sw, 0);
    switch (b.style) {
      case 'walk':
        if (pos % 4 === 0) {
          const beatNo = pos / 4;
          if (beatNo === 0) go(root, .95, 1);
          else if (beatNo === L / 4 - 1) go(this.nextChord - n + dist.pick([-1, 1]), .9, .6);
          else go(root + dist.pick([0, 2, 4, 4, 2]), .95, .7);
        }
        break;
      case 'pulse':
        if (pos % 2 === 0) go(root + (pos % 4 === 2 && dist.chance(.3) ? n : 0), .42, pos % 4 === 0 ? .9 : .6);
        break;
      case 'drone':
        if (pos === 0) { go(root, L / 4 * 1.05, 1); if (dist.chance(.3)) go(root + 4, L / 4 * 1.05, .6); }
        break;
      case 'sync': {
        const p = [1, 0, 0, .4, 0, 0, .55, 0, .8, 0, 0, .35, 0, .45, 0, .25][pos % 16];
        if (rand() < p * (.5 + dens)) go(root + dist.pick([0, 0, 0, 4, n]), pos % 8 === 0 ? 1.4 : .6, p);
        break;
      }
      default: // root
        if (pos === 0) go(root, 1.8, 1);
        else if (pos === Math.floor(L / 2) && dist.chance(.7)) go(root + (dist.chance(.65) ? 0 : 4), 1.5, .7);
    }
  }

  harmony(pos) {
    const c = this.c, h = c.roles.harmony;
    if (!h.on) return;
    const n = this.n, L = this.L, bt = this.beat(), T = this.tones, dens = c.fate.density, ent = c.fate.entropy;
    switch (h.style) {
      case 'arp':
        if (pos % 2 === 0 && rand() < .55 + .35 * dens) {
          const m = T.length * 2;
          this.ai += this.ad;
          if (this.ai >= m) { this.ai = m - 2; this.ad = -1; }
          if (this.ai < 0) { this.ai = 1; this.ad = 1; }
          if (dist.chance(ent * .2)) this.ad = -this.ad;
          const k = this.ai;
          this.note('harmony', T[k % T.length] + n * Math.floor(k / T.length), this.vel(pos % 4 === 0 ? .8 : .45) * .8, 2.2 * this.stepLen / sampleRate, this.jit() + this.sw, dist.normal(0, .3));
        }
        break;
      case 'strum':
        if (pos === 0 || (pos === Math.floor(L / 2) && dist.chance(.55))) {
          let off = this.jit();
          for (let i = 0; i < T.length; i++) { off += Math.round(dist.expo(.025) * sampleRate); this.note('harmony', T[i], this.vel(.7) * .75, 1.6 * bt, off, -.3 + i * .2); }
        }
        break;
      case 'stab':
        if ((pos % 4 === 2 && dist.chance(.5 + .4 * dens)) || (pos === 0 && dist.chance(.35))) {
          for (let i = 0; i < T.length; i++) this.note('harmony', T[i], this.vel(.6) * .7, .22 * bt, this.jit() + this.sw, -.25 + i * .17);
        }
        break;
      default: // pad
        if (pos === 0) for (let i = 0; i < T.length; i++) this.note('harmony', T[i], this.vel(.6) * .75, L * this.stepLen / sampleRate * 1.02, i * 40, -.5 + i * .33);
    }
  }

  lead(pos) {
    const c = this.c, f = c.fate;
    if (!c.roles.lead.on) return;
    const s = pos === 0 ? 1 : pos % 8 === 0 ? .9 : pos % 4 === 0 ? .75 : pos % 2 === 0 ? .45 : .25;
    let fire;
    if (f.time === 'euclid') fire = this.eu[(pos + this.eu.rot) % this.L] && !dist.chance(f.entropy * .12);
    else fire = rand() < clamp(f.density * (.2 + .8 * s) * (.55 + .6 * this.energy) * 1.25, 0, .95);
    if (fire) this.leadNote(s, this.jit() + this.sw);
  }

  leadNote(strength, wait) {
    const dBeats = [.5, 1, 1.5, 2, 3][dist.weighted([.34, .36, .14, .1, .06])];
    const deg = this.nextPitch(strength);
    this.note('lead', deg, this.vel(strength), dBeats * this.beat(), wait, clamp(dist.normal(.2, .25), -.8, .8));
  }

  // The continuous (free-time) lead laws: Poisson gaps or heavy-tailed log-normal gaps.
  leadFlurry() {
    const f = this.c.fate, bt = this.beat();
    if (this.c.roles.lead.on) this.leadNote(.6, 0);
    const wait = f.time === 'poisson' ? dist.expo(bt * (2.6 * (1 - .85 * f.density) + .15)) : dist.logNormal(bt * (1.5 * (1 - .8 * f.density) + .12), 1.05);
    this.leadWait = Math.max(200, Math.round(wait * sampleRate));
  }

  // Pick the next melody degree. This is where the "pitch law" lives.
  nextPitch(strength) {
    const c = this.c, n = this.n, ent = c.fate.entropy, law = c.fate.pitch;
    const lo = Math.floor(n * .8), hi = Math.floor(n * 2.4), mid = Math.floor(n * 1.55);
    const isTone = d => this.toneMods.indexOf(((d % n) + n) % n) >= 0;
    let x = this.lx;
    switch (law) {
      case 'levy': x += (rand() < .5 ? -1 : 1) * Math.floor(Math.min(dist.pareto(2.6 - 1.7 * ent), 12) * .9) + (mid - x) * .05; break;
      case 'markov': {
        const tau = .8 + 3.2 * ent, w = [];
        for (let d = lo; d <= hi; d++) w.push(Math.exp(-Math.abs(d - this.lx) / tau) * (isTone(d) ? 2.4 : 1) * (d === this.lx ? .6 : 1));
        x = lo + dist.weighted(w); break;
      }
      case 'zipf': {
        const cand = [];
        for (let d = lo; d <= hi; d++) cand.push(d);
        const rank = d => (isTone(d) ? 0 : 20) + Math.abs(d - mid);
        cand.sort((a, b) => rank(a) - rank(b));
        const s = 1.9 - 1.2 * ent;
        x = cand[dist.weighted(cand.map((_, k) => Math.pow(k + 1, -s)))]; break;
      }
      case 'uniform': x = lo + Math.floor(rand() * (hi - lo + 1)); break;
      case 'motif': {
        const i = this.motifI % this.motif.length;
        if (rand() < ent * .2) this.motif[i] = clamp(this.motif[i] + dist.pick([-2, -1, 1, 2]), lo, hi);
        x = this.motif[i]; this.motifI++; break;
      }
      case 'chaos': {
        this.logi = (3.55 + .45 * ent) * this.logi * (1 - this.logi);
        if (!(this.logi > .001 && this.logi < .999)) this.logi = .37;
        x = lo + Math.floor(this.logi * (hi - lo + 1)); break;
      }
      default: x += (mid - x) * .1 + dist.normal(0, .7 + 2.2 * ent); // walk
    }
    let d = Math.round(x);
    if (law !== 'uniform' && law !== 'chaos' && rand() < (1 - ent) * (.2 + .55 * strength)) { // lean towards the chord
      let best = d, bd = 99;
      for (const m of this.toneMods) for (let o = -1; o <= 3; o++) { const cand = m + o * n, dd = Math.abs(cand - d); if (dd < bd) { bd = dd; best = cand; } }
      d = best;
    }
    if (d > hi) d = Math.max(lo, 2 * hi - d);
    if (d < lo) d = Math.min(hi, 2 * lo - d);
    this.lx = clamp(d, lo, hi);
    return this.lx;
  }

  // ---- atmosphere: events arrive as a Poisson process -----------------------------------------------------------
  airNote() {
    const a = this.c.roles.air, k = INST[a.inst], n = this.n;
    if (!k) return;
    const vel = clamp(dist.normal(.65, .15), .2, 1), pan = clamp(dist.normal(0, .5), -.9, .9);
    switch (k.r) {
      case 'bird': {
        const rate = 7 + rand() * 8, syl = 2 + Math.min(5, dist.geometric(.4));
        this.play('air', a.inst, 0, vel, syl / rate, 0, pan, clamp(dist.normal(3200, 700), 1800, 5200), {rate}); break;
      }
      case 'drip': this.play('air', a.inst, 0, vel, .5, 0, pan, dist.logNormal(700, .35)); break;
      case 'wind': this.play('air', a.inst, 0, vel * .8, 4 + dist.expo(3), 0, pan, dist.logNormal(500, .5)); break;
      case 'whale': this.play('air', a.inst, 0, vel * .9, dist.uniform(4, 7), 0, pan, 440 * Math.pow(2, (this.deg2midi(dist.pick(this.tones)) - 12 - 69) / 12)); break;
      default: { // pitched and resonant: bells, chimes, bowls, gongs
        const low = k.r === 'add', lo = low ? n : 2 * n, hi = low ? 2 * n : Math.floor(3.2 * n);
        const ranks = []; for (let d = lo; d <= hi; d++) ranks.push(d);
        const deg = ranks[dist.weighted(ranks.map((_, i) => Math.pow(i + 1, -1.2)))];
        const count = a.inst === 'chime' ? 1 + Math.min(3, dist.geometric(.5)) : 1;
        let wait = 0;
        for (let i = 0; i < count; i++) { this.note('air', deg + i * dist.pick([1, 2]), vel * (1 - .15 * i), 1.5, wait, pan); wait += Math.round(dist.expo(.09) * sampleRate); }
      }
    }
  }

  process(inputs, outputs) {
    const out = outputs[0], A = out[0], B = out[1] || out[0], N = A.length;
    if (!this.active) { A.fill(0); if (out[1]) B.fill(0); return true; }
    const vs = this.vs, dl = this.dl, dr = this.dr, dn = dl.length, sr = sampleRate;
    const air = this.c.roles.air, airMean = 60 / (AIR_RATE[air.style] || 12);
    for (let i = 0; i < N; i++) {
      if (--this.until <= 0) { this.until += this.stepLen; this.tick(); }
      if (this.cont && --this.leadWait <= 0) this.leadFlurry();
      if (--this.airWait <= 0) { if (air.on) this.airNote(); this.airWait = Math.max(1, Math.round(dist.expo(airMean) * sr)); }
      let l = 0, r = 0;
      for (let j = vs.length - 1; j >= 0; j--) {
        const v = vs[j];
        if (v.w > 0) { v.w--; continue; }
        if (v.age >= v.life) { vs.splice(j, 1); continue; }
        const t = v.age / sr;
        const env = Math.min(1, t / v.k.atk) * (v.age < v.len ? 1 : Math.max(0, 1 - (v.age - v.len) / v.rel));
        const s = v.r(v, t) * env * v.a;
        v.age++;
        l += s * v.gl; r += s * v.gr;
      }
      if (this.echoMix > .005) { // ping-pong echo, a dotted eighth apart
        let rd = this.dp - this.dsamp; if (rd < 0) rd += dn;
        const el = dl[rd], er = dr[rd];
        dl[this.dp] = (l + r) * .5 + er * this.echoFb; dr[this.dp] = el * this.echoFb;
        l += el * this.echoMix; r += er * this.echoMix;
        if (++this.dp >= dn) this.dp = 0;
      }
      if (this.lofiOn) { // sample-and-hold plus fewer bits
        if (++this.hc >= this.hold) { this.hc = 0; this.hl = Math.round(l * this.q) / this.q; this.hr = Math.round(r * this.q) / this.q; }
        l = this.hl; r = this.hr;
      }
      this.tl += this.ta * (l - this.tl); this.tr_ += this.ta * (r - this.tr_); // brightness
      l = this.tl; r = this.tr_;
      if (this.crackP > 0) {
        if (rand() < this.crackP) this.pop = (rand() < .08 ? 1 : .25 + .4 * rand()) * (rand() < .5 ? -1 : 1);
        l += this.pop * .2; r += this.pop * .2; this.pop *= .55;
      }
      A[i] = Math.tanh(l * .9); B[i] = Math.tanh(r * .9);
    }
    if (this.evs.length) { this.port.postMessage({notes: this.evs}); this.evs = []; }
    return true;
  }
}
registerProcessor('hearth', Hearth);
