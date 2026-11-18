// Stage 2: for each ask-thread, fetch the comment tree and keep a flat, trimmed list (resumable).
// Usage: node pipeline/02-fetch-comments.mjs <shard> <shards> [maxThreads]
// Shards write separate files (comments-<shard>.json) so workers can run in parallel.
import {readdir} from 'node:fs/promises';
import {api, readJson, writeJson} from './lib.mjs';

const DATA = new URL('./data/', import.meta.url).pathname;
const SHARD = Number(process.argv[2] || 0), SHARDS = Number(process.argv[3] || 1);
const OUT = new URL(`./data/comments-${SHARD}.json`, import.meta.url).pathname;
const threads = {};
for (const f of (await readdir(DATA)).filter(f => /^threads-.*\.json$/.test(f))) Object.assign(threads, (await readJson(DATA + f, {threads: {}})).threads);
const db = await readJson(OUT, {});
const max = Number(process.argv[4]) || Infinity;

// Walk Reddit's nested listing into flat rows; collapsed "more" nodes are skipped (top answers are shown first anyway).
function flatten(nodes, out = []) {
  for (const n of nodes || []) {
    const d = n?.data ?? n;
    if (!d || n.kind === 'more' || d.body === undefined) continue;
    if (d.body !== '[deleted]' && d.body !== '[removed]' && d.author !== 'AutoModerator')
      out.push({id: d.id, parent: d.parent_id, author: d.author, score: d.score, t: d.created_utc, body: d.body.slice(0, 900)});
    const kids = d.replies?.data?.children ?? d.replies;
    if (Array.isArray(kids)) flatten(kids, out);
  }
  return out;
}

// Mid-sized threads are the sweet spot: real questions with focused answers. Giant "name your favourite band"
// megathreads are slow to fetch and mostly chatter, so they are capped out.
const todo = Object.values(threads)
  .filter(t => t.kind === 'ask' && t.n <= 400 && !db[t.id] && parseInt(t.id, 36) % SHARDS === SHARD)
  .sort((a, b) => b.n - a.n).slice(0, max);
console.log('threads to fetch:', todo.length);
let i = 0;
for (const t of todo) {
  const tree = await api('/comments/tree', {link_id: 't3_' + t.id, limit: '800'}, {tries: 3, pause: 800});
  if (!tree) { console.log('skip', t.id); continue; }
  db[t.id] = flatten(tree);
  if (++i % 5 === 0) { await writeJson(OUT, db); console.log(i, '/', todo.length, t.sub, t.id, db[t.id].length, 'comments'); }
}
await writeJson(OUT, db);
console.log('done; threads with comments:', Object.keys(db).length);
