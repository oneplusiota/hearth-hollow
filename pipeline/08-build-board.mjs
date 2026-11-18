// Stage 8: the Notice Board. For every Reddit question we mined, list which catalog songs its answers named,
// ordered by how well the answer was received. The app matches a visitor's own request against these questions.
// Usage: node pipeline/08-build-board.mjs
import {readdir, readFile, writeFile} from 'node:fs/promises';
import {readJson} from './lib.mjs';
import {parseLine, pairKey} from './parse.mjs';

const dir = p => new URL(p, import.meta.url).pathname;
const catalog = JSON.parse(await readFile(dir('../public/catalog.json'), 'utf8'));
const byKey = new Map();
for (const t of catalog) { const k = pairKey(t.artist, t.title); if (k) byKey.set(k, t.id); }

const threads = {}, comments = {};
for (const f of await readdir(dir('./data/'))) {
  if (/^threads-/.test(f)) Object.assign(threads, (await readJson(dir('./data/' + f), {threads: {}})).threads);
  if (/^comments-/.test(f)) Object.assign(comments, await readJson(dir('./data/' + f), {}));
}

const BOT = /^(automoderator|\[deleted\]|.*bot)$/i;
const MIN_TRACKS = 5, MAX_TRACKS = 24;
const board = [];
for (const th of Object.values(threads)) {
  if (th.kind !== 'ask' || !comments[th.id]) continue;
  const got = new Map(); // track id -> best comment score, voices
  for (const c of comments[th.id]) {
    if (!String(c.parent).startsWith('t3_') || BOT.test(c.author || '') || c.score < 1) continue;
    for (const line of c.body.split(/\n+/)) {
      const p = parseLine(line);
      const id = p && byKey.get(pairKey(p.artist, p.title));
      if (!id) continue;
      const cur = got.get(id) || {score: 0, voices: new Set()};
      cur.score = Math.max(cur.score, c.score); cur.voices.add(c.author);
      got.set(id, cur);
    }
  }
  if (got.size < MIN_TRACKS) continue;
  const tracks = [...got].sort((a, b) => b[1].score + b[1].voices.size - (a[1].score + a[1].voices.size)).slice(0, MAX_TRACKS).map(([id, v]) => [id, v.score]);
  // Titles beginning "[IIL]" are an r/ifyoulikeblank tag, not part of the question.
  const ask = th.title.replace(/^\s*\[?\s*IIL\s*\]?\s*/i, '').replace(/\s+/g, ' ').trim().slice(0, 140);
  if (ask.length < 12) continue;
  board.push({id: th.id, sub: th.sub, ask, n: th.n, tracks});
}
board.sort((a, b) => b.n - a.n);
await writeFile(dir('../public/board.json'), JSON.stringify(board));
const used = new Set(board.flatMap(b => b.tracks.map(t => t[0])));
console.log({questions: board.length, catalogSongsReachable: used.size, of: catalog.length, avgAnswers: Math.round(board.reduce((s, b) => s + b.tracks.length, 0) / board.length * 10) / 10});
console.log(board.slice(0, 8).map(b => `r/${b.sub}  ${b.ask.slice(0, 80)}  (${b.tracks.length} songs)`).join('\n'));
