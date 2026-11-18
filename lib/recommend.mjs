// Client-side "For you" ranking. No accounts, no server: taste lives in localStorage.
// A track is a sparse vector over its tags (mood, occasion, genre, energy, vocals) plus a few
// "why" keywords; taste is the weighted sum of tracks you liked, played or skipped.

export function features(track) {
  const f = new Map();
  const add = (key, weight = 1) => f.set(key, (f.get(key) || 0) + weight);
  for (const m of track.mood || []) add('mood:' + m, 1.2);
  for (const s of track.scenes || []) add('scene:' + s, 1.5);
  for (const g of track.genres || []) add('genre:' + g, 1);
  for (const s of track.similar || []) add('like:' + s.toLowerCase(), .6);
  add('energy:' + (track.energy ?? 3), 1);
  add('vocals:' + (track.vocals ?? 'unknown'), .8);
  return f;
}

function dot(a, b) {
  let s = 0;
  for (const [k, v] of a) s += v * (b.get(k) || 0);
  return s;
}
const norm = v => Math.sqrt(dot(v, v)) || 1;
export const cosine = (a, b) => dot(a, b) / (norm(a) * norm(b));

// events: [{id, kind: 'like' | 'play' | 'skip'}]; later events count a bit more.
const WEIGHT = {like: 1, play: .45, skip: -.7};
export function taste(events, byId) {
  const t = new Map();
  events.forEach((e, i) => {
    const track = byId.get(e.id);
    if (!track) return;
    const recency = .6 + .4 * ((i + 1) / events.length);
    for (const [k, v] of features(track)) t.set(k, (t.get(k) || 0) + v * (WEIGHT[e.kind] || 0) * recency);
  });
  return t;
}

// Popularity prior from Reddit consensus: more distinct people and threads beat one loud comment.
export const prior = track => Math.log2(1 + (track.authors || 1)) * .6 + Math.log2(1 + (track.threads || 1)) * .4;

// Rank unseen tracks. `explore` (0..1) is the share of slots reserved for tracks far from your taste.
export function forYou(tracks, events, {limit = 24, explore = .2, exclude = new Set(), random = Math.random} = {}) {
  const byId = new Map(tracks.map(t => [t.id, t]));
  const profile = taste(events, byId);
  const seen = new Set(events.map(e => e.id));
  const pool = tracks.filter(t => !exclude.has(t.id) && !seen.has(t.id));
  if (!profile.size) return [...pool].sort((a, b) => prior(b) - prior(a)).slice(0, limit);
  const scored = pool.map(t => ({t, s: cosine(profile, features(t)) * 3 + prior(t) * .15})).sort((a, b) => b.s - a.s);
  const exploreCount = Math.round(limit * explore);
  const main = scored.slice(0, limit - exploreCount).map(x => x.t);
  const rest = scored.slice(limit - exploreCount).filter(x => x.s < scored[Math.floor(scored.length / 2)]?.s + 1e-9 || true);
  const picks = [];
  const bag = rest.slice(Math.floor(rest.length / 3));
  while (picks.length < exploreCount && bag.length) picks.push(bag.splice(Math.floor(random() * bag.length), 1)[0].t);
  return [...main, ...picks];
}

// "More like this": nearest neighbours by tags, so a track card can always offer a next step.
export function similarTo(track, tracks, limit = 6) {
  const base = features(track);
  return tracks.filter(t => t.id !== track.id)
    .map(t => ({t, s: cosine(base, features(t)) + prior(t) * .02}))
    .sort((a, b) => b.s - a.s).slice(0, limit).map(x => x.t);
}

// Autoplay: when the queue runs out, keep the evening going from what was just playing.
export function autoplayNext(track, tracks, recent = []) {
  const skip = new Set(recent);
  return similarTo(track, tracks, 12).find(t => !skip.has(t.id)) || null;
}

export function search(tracks, query) {
  const q = query.trim().toLowerCase();
  if (!q) return tracks;
  const words = q.split(/\s+/);
  return tracks.filter(t => {
    const hay = [t.title, t.artist, t.why, ...(t.mood || []), ...(t.scenes || []), ...(t.genres || []), ...(t.similar || [])].join(' ').toLowerCase();
    return words.every(w => hay.includes(w));
  });
}
