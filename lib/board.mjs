// The Notice Board: match what a visitor asks for against real Reddit questions, then pool the answers.
// Pure functions, no I/O, so the whole thing is testable.

const STOP = new Set('a an and are as at be but by can do does for from get give good great had has have how i if in into is it its just like me my need new of on one or please so some something song songs music that the their them then there these they this to up us want was we what when where which who why will with would you your tune tunes track tracks listen listening play playlist recommend recommendations suggest suggestions looking anything any more best favourite favorite'.split(' '));
// Light stemming so "driving"/"drives"/"drive" and "rainy"/"rain" meet in the middle.
const stem = w => w.replace(/(ing|ers?|ies|ied|ed|es|s|y)$/, m => (m === 'ies' || m === 'ied' ? 'y' : '')).replace(/e$/, '').replace(/(.)\1$/, '$1');
// A few phrases people use that the stemmer cannot connect.
const ALIAS = {sad: 'melancholy', depressed: 'melancholy', depressing: 'melancholy', cry: 'melancholy', chill: 'relax', calm: 'relax', calming: 'relax', peaceful: 'relax', study: 'focus', studying: 'focus', homework: 'focus', coding: 'focus', gym: 'workout', lifting: 'workout', exercise: 'workout', running: 'workout', run: 'workout', car: 'drive', road: 'drive', roadtrip: 'drive', sleeping: 'sleep', bedtime: 'sleep', insomnia: 'sleep', dnd: 'fantasy', tavern: 'fantasy', medieval: 'fantasy', dungeon: 'fantasy', breakup: 'heartbreak', heartbroken: 'heartbreak', lonely: 'lonely', alone: 'lonely'};

export function tokens(text) {
  const out = [];
  for (const raw of String(text).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').split(/[^a-z0-9]+/)) {
    if (raw.length < 3 || STOP.has(raw)) continue;
    out.push(stem(ALIAS[raw] || raw));
  }
  return out;
}

// Inverse-document-frequency weights: a word in every question ("songs") says nothing, "rain" says a lot.
export function buildIndex(board) {
  const df = new Map();
  const docs = board.map(q => {
    const set = new Set(tokens(q.ask));
    for (const t of set) df.set(t, (df.get(t) || 0) + 1);
    return set;
  });
  const idf = new Map([...df].map(([t, n]) => [t, Math.log(1 + board.length / n)]));
  return {board, docs, idf};
}

// Score = shared weighted words / the weight of the request, with a small bonus for busy threads.
export function matchQuestions(index, request, limit = 6) {
  const want = [...new Set(tokens(request))];
  if (!want.length) return [];
  const total = want.reduce((s, t) => s + (index.idf.get(t) || 1.5), 0) || 1;
  const scored = [];
  index.board.forEach((q, i) => {
    let hit = 0;
    for (const t of want) if (index.docs[i].has(t)) hit += index.idf.get(t) || 1.5;
    if (!hit) return;
    scored.push({q, s: hit / total + Math.min(.08, Math.log10(1 + q.n) * .03)});
  });
  return scored.filter(x => x.s >= .25).sort((a, b) => b.s - a.s).slice(0, limit);
}

// Pool answers from every matched question. A song named in several matching threads rises; a song loved in one
// thread still counts. `weights` lets better-matching questions count for more.
export function pool(matches, perThread = 24) {
  const songs = new Map();
  for (const {q, s} of matches) {
    q.tracks.slice(0, perThread).forEach(([id, score], rank) => {
      const e = songs.get(id) || {id, points: 0, threads: 0, asks: []};
      e.points += s * (1 + Math.log1p(Math.max(0, score))) * (1 - rank / (perThread * 2));
      e.threads += 1;
      if (e.asks.length < 3) e.asks.push(q.ask);
      songs.set(id, e);
    });
  }
  return [...songs.values()].sort((a, b) => b.points + b.threads * .3 - (a.points + a.threads * .3));
}

// Turn a visitor's request into a ranked list of catalog ids, with how many questions backed the answer.
export function answer(index, request, {limit = 20, exclude = new Set()} = {}) {
  const matches = matchQuestions(index, request);
  const songs = pool(matches).filter(s => !exclude.has(s.id)).slice(0, limit);
  return {matches: matches.map(m => ({id: m.q.id, sub: m.q.sub, ask: m.q.ask, n: m.q.n, fit: Math.round(m.s * 100)})), songs};
}
