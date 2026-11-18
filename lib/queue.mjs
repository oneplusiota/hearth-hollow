// One list, one pointer. No playlists, no modes: this is the whole queue model.
// Items: {key, id, yt, title, artist}. `id` is the catalog id (or 'yt:<video>' for pasted links).
import {videoId} from './youtube-model.mjs';

export const MAX_ITEMS = 200;
export const emptyQueue = () => ({items: [], index: -1});
const newKey = () => globalThis.crypto.randomUUID();

export function toItem(track, key = newKey()) {
  return {key, id: String(track.id).slice(0, 60), yt: track.yt, title: String(track.title || 'Untitled').slice(0, 160), artist: String(track.artist || '').slice(0, 120)};
}

export function enqueue(q, track) {
  if (q.items.length >= MAX_ITEMS || q.items.some(i => i.yt === track.yt)) return q;
  return {...q, items: [...q.items, toItem(track)]};
}

// Insert right after the current track without interrupting it.
export function playNext(q, track) {
  const at = q.items.findIndex(i => i.yt === track.yt);
  if (at === q.index && at >= 0) return q;
  const items = at >= 0 ? q.items.filter((_, i) => i !== at) : [...q.items];
  const index = at >= 0 && at < q.index ? q.index - 1 : q.index;
  if (items.length >= MAX_ITEMS) return q;
  items.splice(index + 1, 0, toItem(track));
  return {items, index};
}

// Play now: reuse the track if it is already queued, otherwise slot it in after the current one.
export function playNow(q, track) {
  const at = q.items.findIndex(i => i.yt === track.yt);
  if (at >= 0) return {...q, index: at};
  const items = [...q.items];
  const index = Math.min(q.index + 1, items.length);
  if (items.length >= MAX_ITEMS) items.pop();
  items.splice(index, 0, toItem(track));
  return {items, index};
}

// Start a fresh list ("Play all"): the given tracks become the whole queue, playing from the first.
export function replace(tracks) {
  const seen = new Set();
  const items = tracks.filter(t => t && !seen.has(t.yt) && seen.add(t.yt)).slice(0, MAX_ITEMS).map(t => toItem(t));
  return {items, index: items.length ? 0 : -1};
}

export const jump = (q, i) => (i >= 0 && i < q.items.length ? {...q, index: i} : q);
export const back = q => (q.index > 0 ? {...q, index: q.index - 1} : q);

// Next playable item after the current one; `failed` holds yt ids that cannot play. Returns null at the end.
export function advance(q, {repeat = false, failed = new Set()} = {}) {
  const n = q.items.length;
  for (let step = 1; step <= n; step++) {
    let i = q.index + step;
    if (i >= n) { if (!repeat) return null; i %= n; }
    if (i === q.index && step === n) return null;
    if (!failed.has(q.items[i].yt)) return {...q, index: i};
  }
  return null;
}

export function remove(q, i) {
  if (i < 0 || i >= q.items.length) return q;
  const items = q.items.filter((_, n) => n !== i);
  let index = q.index;
  if (i < index) index--;
  else if (i === index) index = Math.min(index, items.length - 1);
  return {items, index};
}

export function move(q, i, d) {
  const to = i + d;
  if (to < 0 || to >= q.items.length) return q;
  const items = [...q.items];
  [items[i], items[to]] = [items[to], items[i]];
  const index = q.index === i ? to : q.index === to ? i : q.index;
  return {items, index};
}

export const clear = () => emptyQueue();
export const current = q => q.items[q.index] || null;

// Persisted data is untrusted: drop anything that is not a well-formed item.
export function clean(raw) {
  const items = Array.isArray(raw?.items) ? raw.items.slice(0, MAX_ITEMS)
    .filter(t => t && videoId(t.yt) === t.yt && typeof t.title === 'string' && typeof t.id === 'string')
    .map(t => toItem(t, typeof t.key === 'string' ? t.key.slice(0, 60) : newKey())) : [];
  const index = Number.isInteger(raw?.index) && raw.index >= 0 && raw.index < items.length ? raw.index : -1;
  return {items, index};
}
