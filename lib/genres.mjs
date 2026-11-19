// The Hearth's repertoire: every genre is just a starting point for the band in public/hearth-worklet.js.
// Pick a genre, then change anything: instruments, how notes are chosen, how time is spread, the effects, the seed.

export const SCALES = {
  major: {name: 'Major', notes: [0, 2, 4, 5, 7, 9, 11]},
  minor: {name: 'Natural minor', notes: [0, 2, 3, 5, 7, 8, 10]},
  dorian: {name: 'Dorian', notes: [0, 2, 3, 5, 7, 9, 10]},
  mixolydian: {name: 'Mixolydian', notes: [0, 2, 4, 5, 7, 9, 10]},
  lydian: {name: 'Lydian', notes: [0, 2, 4, 6, 7, 9, 11]},
  phrygian: {name: 'Phrygian dominant', notes: [0, 1, 4, 5, 7, 8, 10]},
  locrian: {name: 'Locrian', notes: [0, 1, 3, 5, 6, 8, 10]},
  harmonic: {name: 'Harmonic minor', notes: [0, 2, 3, 5, 7, 8, 11]},
  pentatonic: {name: 'Major pentatonic', notes: [0, 2, 4, 7, 9]},
  minorpent: {name: 'Minor pentatonic', notes: [0, 3, 5, 7, 10]},
  hirajoshi: {name: 'Hirajoshi', notes: [0, 2, 3, 7, 8]},
  insen: {name: 'In-sen', notes: [0, 1, 5, 7, 10]},
  pelog: {name: 'Pelog', notes: [0, 1, 3, 7, 8]},
  whole: {name: 'Whole tone', notes: [0, 2, 4, 6, 8, 10]},
};

export const INSTRUMENTS = {
  bass: [
    {id: 'sub', name: 'Sub sine'}, {id: 'synthbass', name: 'Analog bass'}, {id: 'upright', name: 'Upright bass'},
  ],
  harmony: [
    {id: 'pad', name: 'Warm pad'}, {id: 'strings', name: 'Strings'}, {id: 'glass', name: 'Glass harmonica'}, {id: 'choir', name: 'Choir'},
    {id: 'organ', name: 'Organ'}, {id: 'epiano', name: 'Electric piano'}, {id: 'harp', name: 'Harp'}, {id: 'guitar', name: 'Guitar'},
    {id: 'koto', name: 'Koto'}, {id: 'kalimba', name: 'Kalimba'}, {id: 'marimba', name: 'Marimba'}, {id: 'chip', name: 'Chip square'},
  ],
  lead: [
    {id: 'flute', name: 'Flute'}, {id: 'whistle', name: 'Tin whistle'}, {id: 'bell', name: 'Bell'}, {id: 'synth', name: 'Synth lead'},
    {id: 'chip', name: 'Chip square'}, {id: 'epiano', name: 'Electric piano'}, {id: 'harp', name: 'Harp'}, {id: 'kalimba', name: 'Kalimba'},
    {id: 'marimba', name: 'Marimba'}, {id: 'koto', name: 'Koto'}, {id: 'guitar', name: 'Guitar'}, {id: 'glass', name: 'Glass harmonica'}, {id: 'choir', name: 'Choir'},
    {id: 'chime', name: 'Chimes'}, {id: 'bowl', name: 'Singing bowl'},
  ],
  drums: [
    {id: 'lofi', name: 'Dusty kit'}, {id: 'brush', name: 'Brushes'}, {id: 'electro', name: 'Drum machine'}, {id: 'tribal', name: 'Frame drums'}, {id: 'chip', name: '8-bit kit'},
  ],
  air: [
    {id: 'chime', name: 'Wind chimes'}, {id: 'bell', name: 'Far bells'}, {id: 'bowl', name: 'Singing bowl'}, {id: 'gong', name: 'Gong'}, {id: 'kalimba', name: 'Thumb piano'},
    {id: 'bird', name: 'Birdsong'}, {id: 'drip', name: 'Water drops'}, {id: 'whale', name: 'Whale song'}, {id: 'wind', name: 'Wind'},
  ],
};
export const STYLES = {
  bass: [{id: 'root', name: 'Held roots'}, {id: 'walk', name: 'Walking'}, {id: 'pulse', name: 'Pulsing'}, {id: 'drone', name: 'Drone'}, {id: 'sync', name: 'Syncopated'}],
  harmony: [{id: 'pad', name: 'Sustained'}, {id: 'arp', name: 'Arpeggio'}, {id: 'strum', name: 'Strummed'}, {id: 'stab', name: 'Off-beat stabs'}],
  lead: [], drums: [],
  air: [{id: 'sparse', name: 'Sparse'}, {id: 'gentle', name: 'Gentle'}, {id: 'lively', name: 'Lively'}],
};

// How each random choice is drawn. These are the "laws of fate" the player can switch between.
export const FATES = {
  pitch: [
    {id: 'walk', name: 'Gaussian walk', note: 'Each note is a bell-curve step from the last. Smooth and singable.'},
    {id: 'levy', name: 'Lévy flights', note: 'Mostly small steps, with rare heavy-tailed leaps (a Pareto distribution).'},
    {id: 'markov', name: 'Markov chain', note: 'Likelier to land near the last note and on notes of the current chord.'},
    {id: 'zipf', name: 'Zipf’s law', note: 'A few favourite notes are heard constantly; the rest are rare.'},
    {id: 'motif', name: 'Mutating motif', note: 'A short melody repeats and is slowly rewritten.'},
    {id: 'chaos', name: 'Logistic chaos', note: 'A deterministic chaotic map: never repeats, never quite random.'},
    {id: 'uniform', name: 'Pure chance', note: 'Every note of the scale equally likely.'},
  ],
  time: [
    {id: 'grid', name: 'On the grid', note: 'Notes fall on beats, weighted by how strong the beat is.'},
    {id: 'euclid', name: 'Euclidean rhythm', note: 'A Poisson-chosen number of hits spread as evenly as possible, as in West African and Balkan music.'},
    {id: 'poisson', name: 'Poisson drops', note: 'Notes arrive at random with exponential gaps, like rain.'},
    {id: 'burst', name: 'Bursts and lulls', note: 'Log-normal gaps: flurries of notes, then long silences.'},
  ],
  dynamics: [
    {id: 'human', name: 'Human touch', note: 'Loudness follows the beat plus a little bell-curve noise.'},
    {id: 'steady', name: 'Machine steady', note: 'Almost identical volumes.'},
    {id: 'wild', name: 'Wild', note: 'Exponentially distributed: many whispers, a few shouts.'},
  ],
};
export const DEFAULT_FATE = {pitch: 'walk', time: 'grid', dynamics: 'human', entropy: .4, density: .5, swing: 0, humanize: .4};

// Drum patterns are written as strings of sixteen steps: x = hit, o = softer, g = ghost, . = rest.
const lane = s => Array.from(s, ch => ({x: 1, o: .6, g: .3}[ch] || 0));
const kit = (kick, snare, hat, tap = '................') => ({kick: lane(kick), snare: lane(snare), hat: lane(hat), tap: lane(tap)});
const NONE = kit('................', '................', '................');
const OFF = {on: false, inst: '', style: '', level: .6};
const role = (inst, style, level = .6, extra = {}) => ({on: true, inst, style, level, ...extra});

const MOVES = {
  pop: [[3, 3], [4, 3], [5, 2], [1, 1]],        // I-IV-V-vi style
  jazz: [[3, 4], [4, 2], [1, 2], [2, 1]],       // falling fifths feel
  modal: [[1, 2], [-1, 2], [3, 1], [4, 1]],     // neighbours, little pull
  drift: [[2, 2], [-2, 2], [1, 1], [-1, 1], [3, 1]],
  minor: [[5, 3], [2, 2], [4, 2], [3, 1]],
};

// Each genre is a full config for the band. The page may override any part (see toEngine).
export const GENRES = [
  {id: 'lofi', name: 'Rainy Lo-fi', icon: '☕', hue: 28, blurb: 'Dusty drums, soft keys and vinyl crackle for long study hours.', tags: ['focus', 'warm'],
   bpm: 76, base: 52, scale: 'dorian', fate: {pitch: 'markov', time: 'grid', dynamics: 'human', entropy: .35, density: .45, swing: .55, humanize: .7},
   fx: {echo: .25, lofi: .45, bright: .5, crackle: .5}, harm: {moves: MOVES.jazz, home: .5, ext: .55},
   roles: {bass: role('upright', 'sync', .7), harmony: role('epiano', 'stab', .5), lead: role('guitar', '', .5), drums: role('lofi', '', .6, {pattern: kit('x.....g...x.g...', '....x.......x...', 'o.x.o.xgo.x.o.xg', '..........g.....')}), air: role('drip', 'sparse', .4)}},
  {id: 'jazz', name: 'Midnight Jazz', icon: '♭', hue: 235, blurb: 'A walking bass, brushes and wandering keys. Never plays the same chorus twice.', tags: ['late', 'swing'],
   bpm: 112, base: 53, scale: 'dorian', fate: {pitch: 'levy', time: 'grid', dynamics: 'human', entropy: .55, density: .5, swing: .9, humanize: .8},
   fx: {echo: .12, lofi: 0, bright: .55, crackle: .1}, harm: {moves: MOVES.jazz, home: .3, ext: .75},
   roles: {bass: role('upright', 'walk', .85), harmony: role('epiano', 'stab', .45), lead: role('epiano', '', .6), drums: role('brush', '', .55, {pattern: kit('x...............', '....g.......g...', 'x..ox.xgx..ox.xg')}), air: OFF}},
  {id: 'tavern', name: 'Tavern Jig', icon: '☘', hue: 38, blurb: 'Tin whistle, strummed guitar and a stamping frame drum.', tags: ['merry', 'folk'],
   bpm: 118, base: 50, scale: 'mixolydian', fate: {pitch: 'markov', time: 'grid', dynamics: 'human', entropy: .3, density: .7, swing: .2, humanize: .5},
   fx: {echo: .1, lofi: 0, bright: .7, crackle: 0}, harm: {moves: MOVES.pop, home: .6, ext: .05},
   roles: {bass: role('upright', 'pulse', .6), harmony: role('guitar', 'strum', .55), lead: role('whistle', '', .7), drums: role('tribal', '', .55, {pattern: kit('x.......x.......', '....o.......o.o.', 'x.xxx.xxx.xxx.xx', '..o...o...o...o.')}), air: OFF}},
  {id: 'cathedral', name: 'Cathedral Hours', icon: '✝', hue: 265, blurb: 'Choir, glass and a bell far off in the stone dark.', tags: ['sleep', 'vast'],
   bpm: 50, base: 48, scale: 'lydian', fate: {pitch: 'zipf', time: 'burst', dynamics: 'steady', entropy: .35, density: .25, swing: 0, humanize: .5},
   fx: {echo: .6, lofi: 0, bright: .4, crackle: 0}, harm: {moves: MOVES.modal, home: .5, ext: .6},
   roles: {bass: role('sub', 'drone', .6), harmony: role('choir', 'pad', .55), lead: role('glass', '', .45), drums: OFF, air: role('bell', 'sparse', .45)}},
  {id: 'zen', name: 'Zen Garden', icon: '☯', hue: 150, blurb: 'Plucked koto over a singing bowl. Silences are part of the song.', tags: ['calm', 'focus'],
   bpm: 56, base: 53, scale: 'hirajoshi', fate: {pitch: 'levy', time: 'burst', dynamics: 'human', entropy: .5, density: .3, swing: 0, humanize: .8},
   fx: {echo: .35, lofi: 0, bright: .6, crackle: 0}, harm: {moves: MOVES.drift, home: .4, ext: 0},
   roles: {bass: role('sub', 'drone', .45), harmony: role('koto', 'strum', .4), lead: role('koto', '', .65), drums: OFF, air: role('bowl', 'sparse', .55)}},
  {id: 'space', name: 'Deep Space', icon: '✺', hue: 255, blurb: 'Slow pads, glass tones and whale song drifting through the dark.', tags: ['sleep', 'vast'],
   bpm: 44, base: 45, scale: 'whole', fate: {pitch: 'chaos', time: 'poisson', dynamics: 'steady', entropy: .4, density: .15, swing: 0, humanize: .3},
   fx: {echo: .7, lofi: 0, bright: .4, crackle: 0}, harm: {moves: MOVES.drift, home: .3, ext: .4},
   roles: {bass: role('sub', 'drone', .7), harmony: role('pad', 'pad', .6), lead: role('glass', '', .4), drums: OFF, air: role('whale', 'sparse', .55)}},
  {id: 'synthwave', name: 'Night Drive', icon: '✦', hue: 305, blurb: 'Pulsing analog bass, arpeggios and neon on the wet road.', tags: ['drive', 'retro'],
   bpm: 100, base: 45, scale: 'minor', fate: {pitch: 'motif', time: 'grid', dynamics: 'steady', entropy: .3, density: .55, swing: 0, humanize: .15},
   fx: {echo: .45, lofi: .08, bright: .75, crackle: 0}, harm: {moves: MOVES.minor, home: .6, ext: .1},
   roles: {bass: role('synthbass', 'pulse', .6), harmony: role('strings', 'arp', .45), lead: role('synth', '', .55), drums: role('electro', '', .6, {pattern: kit('x.......x.......', '....x.......x...', '..x...x...x...x.', '.......g.......g')}), air: OFF}},
  {id: 'chiptune', name: 'Pixel Quest', icon: '▣', hue: 125, blurb: 'Square-wave melodies over an 8-bit kit. Save point reached.', tags: ['play', 'retro'],
   bpm: 138, base: 55, scale: 'major', fate: {pitch: 'motif', time: 'grid', dynamics: 'steady', entropy: .4, density: .75, swing: 0, humanize: 0},
   fx: {echo: .1, lofi: .3, bright: .8, crackle: 0}, harm: {moves: MOVES.pop, home: .6, ext: 0},
   roles: {bass: role('synthbass', 'pulse', .5), harmony: role('chip', 'arp', .4), lead: role('chip', '', .5), drums: role('chip', '', .55, {pattern: kit('x...x...x...x...', '....x.......x...', 'xoxoxoxoxoxoxoxo', '.......g.......g')}), air: OFF}},
  {id: 'window', name: 'Window Seat', icon: '☔', hue: 200, blurb: 'Slow piano-ish keys and rain drops against the glass.', tags: ['calm', 'rain'],
   bpm: 62, base: 50, scale: 'major', fate: {pitch: 'markov', time: 'poisson', dynamics: 'human', entropy: .4, density: .3, swing: 0, humanize: .8},
   fx: {echo: .4, lofi: .2, bright: .45, crackle: .25}, harm: {moves: MOVES.pop, home: .5, ext: .5},
   roles: {bass: role('sub', 'root', .5), harmony: role('epiano', 'arp', .4), lead: role('epiano', '', .55), drums: OFF, air: role('drip', 'lively', .6)}},
  {id: 'caravan', name: 'Desert Caravan', icon: '☪', hue: 22, blurb: 'A drone, hand drums and a flute in a mode that bends.', tags: ['travel', 'warm'],
   bpm: 92, base: 50, scale: 'phrygian', fate: {pitch: 'levy', time: 'euclid', dynamics: 'human', entropy: .45, density: .55, swing: 0, humanize: .6},
   fx: {echo: .3, lofi: 0, bright: .6, crackle: 0}, harm: {moves: MOVES.modal, home: .6, ext: .1},
   roles: {bass: role('sub', 'pulse', .55), harmony: role('guitar', 'strum', .45), lead: role('flute', '', .65), drums: role('tribal', '', .6, {pattern: kit('x..x..x...x.x...', '....x.......x.o.', 'x.x.x.x.x.x.x.x.', '..g..g..g..g..g.')}), air: role('wind', 'sparse', .4)}},
  {id: 'musicbox', name: 'Music Box', icon: '♫', hue: 330, blurb: 'Tiny kalimba and bell notes. A lullaby that rewrites itself.', tags: ['sleep', 'calm'],
   bpm: 68, base: 58, scale: 'lydian', fate: {pitch: 'motif', time: 'grid', dynamics: 'steady', entropy: .25, density: .4, swing: 0, humanize: .3},
   fx: {echo: .35, lofi: .05, bright: .7, crackle: .05}, harm: {moves: MOVES.pop, home: .7, ext: .15},
   roles: {bass: OFF, harmony: role('harp', 'arp', .5), lead: role('kalimba', '', .65), drums: OFF, air: role('chime', 'gentle', .35)}},
  {id: 'dawn', name: 'Forest Dawn', icon: '❦', hue: 105, blurb: 'Birdsong, a gentle harp and a flute that is in no hurry.', tags: ['calm', 'nature'],
   bpm: 66, base: 55, scale: 'pentatonic', fate: {pitch: 'walk', time: 'burst', dynamics: 'human', entropy: .45, density: .3, swing: 0, humanize: .8},
   fx: {echo: .3, lofi: 0, bright: .7, crackle: 0}, harm: {moves: MOVES.drift, home: .4, ext: 0},
   roles: {bass: role('sub', 'drone', .4), harmony: role('harp', 'arp', .45), lead: role('flute', '', .55), drums: OFF, air: role('bird', 'gentle', .6)}},
  {id: 'taiko', name: 'Thunder Drums', icon: '⚡', hue: 12, blurb: 'Deep taiko, a gong and a thin scale that never resolves.', tags: ['power', 'drive'],
   bpm: 92, base: 43, scale: 'insen', fate: {pitch: 'zipf', time: 'euclid', dynamics: 'human', entropy: .4, density: .5, swing: 0, humanize: .3},
   fx: {echo: .25, lofi: 0, bright: .55, crackle: 0}, harm: {moves: MOVES.modal, home: .7, ext: 0},
   roles: {bass: role('sub', 'pulse', .8), harmony: role('koto', 'strum', .35), lead: role('flute', '', .5), drums: role('tribal', '', .9, {pattern: kit('x..x....x.x.....', '....x.......x.xx', 'x.x.x.x.x.x.x.x.', '..o...o...o...o.')}), air: role('gong', 'sparse', .55)}},
  {id: 'dub', name: 'Dub Cellar', icon: '≋', hue: 75, blurb: 'Heavy sub bass, off-beat organ and echoes that fall down stairs.', tags: ['late', 'groove'],
   bpm: 74, base: 45, scale: 'minor', fate: {pitch: 'markov', time: 'grid', dynamics: 'human', entropy: .35, density: .4, swing: .1, humanize: .4},
   fx: {echo: .85, lofi: .1, bright: .45, crackle: .1}, harm: {moves: MOVES.minor, home: .8, ext: .1},
   roles: {bass: role('sub', 'sync', .95), harmony: role('organ', 'stab', .4), lead: role('chime', '', .5), drums: role('lofi', '', .7, {pattern: kit('x.......x.......', '........x.......', '..x...x...x...x.', '....g...........')}), air: OFF}},
  {id: 'gamelan', name: 'Gamelan Dusk', icon: '❂', hue: 48, blurb: 'Marimba, bells and a low gong in a tuning of five.', tags: ['focus', 'ritual'],
   bpm: 84, base: 53, scale: 'pelog', fate: {pitch: 'chaos', time: 'euclid', dynamics: 'human', entropy: .4, density: .6, swing: 0, humanize: .4},
   fx: {echo: .3, lofi: 0, bright: .65, crackle: 0}, harm: {moves: MOVES.modal, home: .5, ext: 0},
   roles: {bass: role('sub', 'drone', .5), harmony: role('marimba', 'arp', .5), lead: role('bell', '', .5), drums: OFF, air: role('gong', 'gentle', .5)}},
  {id: 'haunted', name: 'Haunted Hollow', icon: '☾', hue: 285, blurb: 'A broken music box, voices in the wall and a wind with opinions.', tags: ['eerie', 'night'],
   bpm: 58, base: 46, scale: 'locrian', fate: {pitch: 'levy', time: 'burst', dynamics: 'wild', entropy: .75, density: .35, swing: 0, humanize: 1},
   fx: {echo: .55, lofi: .35, bright: .35, crackle: .35}, harm: {moves: MOVES.drift, home: .2, ext: .6},
   roles: {bass: role('sub', 'drone', .7), harmony: role('choir', 'pad', .4), lead: role('bell', '', .6), drums: OFF, air: role('wind', 'gentle', .6)}},
];
export const GENRE_IDS = GENRES.map(g => g.id);

// A fresh player state for a genre. `over` holds only what the player changed; everything else follows the genre.
export function blankOverride() { return {roles: {}, fate: {}, fx: {}}; }
export function genreById(id) { return GENRES.find(g => g.id === id) || GENRES[0]; }

const ROLE_NAMES = ['bass', 'harmony', 'lead', 'drums', 'air'];
const validInst = (r, id) => INSTRUMENTS[r].some(i => i.id === id);
const validStyle = (r, id) => STYLES[r].some(s => s.id === id);

// Merge a genre with the player's changes into the exact config the audio worklet accepts.
export function resolve(genreId, over = {}) {
  const g = genreById(genreId), o = over || {};
  const roles = {};
  for (const r of ROLE_NAMES) {
    const base = g.roles[r] || OFF, ov = (o.roles && o.roles[r]) || {};
    const inst = ov.inst && validInst(r, ov.inst) ? ov.inst : base.inst || INSTRUMENTS[r][0].id;
    const style = ov.style && validStyle(r, ov.style) ? ov.style : base.style || (STYLES[r][0] ? STYLES[r][0].id : '');
    const out = {on: typeof ov.on === 'boolean' ? ov.on : base.on, inst, style, level: Number.isFinite(ov.level) ? Math.max(0, Math.min(1.5, ov.level)) : base.level};
    if (r === 'drums') out.pattern = base.pattern || NONE;
    roles[r] = out;
  }
  const pick = (k, list) => (o.fate && list.some(x => x.id === o.fate[k]) ? o.fate[k] : g.fate[k]);
  const num = (src, k, d) => (src && Number.isFinite(src[k]) ? Math.max(0, Math.min(1, src[k])) : d);
  const fate = {
    pitch: pick('pitch', FATES.pitch), time: pick('time', FATES.time), dynamics: pick('dynamics', FATES.dynamics),
    entropy: num(o.fate, 'entropy', g.fate.entropy), density: num(o.fate, 'density', g.fate.density), swing: num(o.fate, 'swing', g.fate.swing), humanize: num(o.fate, 'humanize', g.fate.humanize),
  };
  const fx = {};
  for (const k of ['echo', 'lofi', 'bright', 'crackle']) fx[k] = num(o.fx, k, g.fx[k]);
  const scaleId = o.scale && SCALES[o.scale] ? o.scale : g.scale;
  const bpm = Number.isFinite(o.bpm) ? Math.max(30, Math.min(220, o.bpm)) : g.bpm;
  const base = Number.isFinite(o.base) ? Math.max(36, Math.min(60, Math.round(o.base))) : g.base;
  return {bpm, base, scale: SCALES[scaleId].notes, scaleId, roles, fate, fx, harm: g.harm, seed: Number.isFinite(o.seed) ? o.seed >>> 0 : 1};
}

export function newSeed() { return (Math.floor(Math.random() * 0xFFFFFFFF) >>> 0) || 1; }

// A tiny, shareable code for a whole setup, for the "Copy this evening" button.
export function encode(genreId, over) { return btoa(unescape(encodeURIComponent(JSON.stringify({g: genreId, o: over})))); }
export function decode(text) {
  try {
    const x = JSON.parse(decodeURIComponent(escape(atob(String(text).trim()))));
    if (!GENRE_IDS.includes(x.g) || typeof x.o !== 'object' || !x.o) return null;
    return {genre: x.g, over: {...blankOverride(), ...x.o}};
  } catch { return null; }
}
