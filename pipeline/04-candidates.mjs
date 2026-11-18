// Stage 4: turn comment text into candidate songs ("Artist - Title", "Title by Artist"), merge duplicates,
// and keep only the ones several different people recommended in answer to a question.
// Usage: node pipeline/04-candidates.mjs [minAuthors]
import {readdir} from 'node:fs/promises';
import {readJson, writeJson, youtubeIds} from './lib.mjs';
import {clean, parseLine, pairKey} from './parse.mjs';

const dir = p => new URL(p, import.meta.url).pathname;
const minAuthors = Number(process.argv[2]) || 3;
// Niche subreddits have fewer voices, so two independent people are enough there.
const NICHE = new Set(['ambientmusic', 'postrock', 'jazz', 'classicalmusic', 'lofi', 'DungeonSynth', 'DnD', 'synthwave', 'LetsTalkMusic']);
const threads = {}, comments = {};
for (const f of await readdir(dir('./data/'))) {
  if (/^threads-/.test(f)) Object.assign(threads, (await readJson(dir('./data/' + f), {threads: {}})).threads);
  if (/^comments-/.test(f)) Object.assign(comments, await readJson(dir('./data/' + f), {}));
}

const BOT = /^(automoderator|\[deleted\]|.*bot)$/i;
const cand = new Map(); // key -> {artist,title,authors:Set,threads:Set,score,subs:Set,ctx:[]}
let lines = 0, parsed = 0;
for (const th of Object.values(threads)) {
  if (th.kind !== 'ask') continue;
  for (const c of comments[th.id] || []) {
    if (!c.body || BOT.test(c.author || '') || c.score < 2) continue;
    // Skip comments that are replies to a reply: recommendations are almost always direct answers.
    if (!String(c.parent).startsWith('t3_')) continue;
    for (const line of c.body.split(/\n+/)) {
      lines++;
      const p = parseLine(line);
      if (!p) continue;
      parsed++;
      // "A - B" may be artist-title or title-artist, so key on the sorted pair; the first-seen order is kept for display.
      const key = pairKey(p.artist, p.title);
      if (key.length < 5) continue;
      const e = cand.get(key) ?? {artist: p.artist, title: p.title, authors: new Set(), threads: new Set(), score: 0, subs: new Set(), ctx: [], yt: new Set(), tids: new Set()};
      e.authors.add(c.author); e.threads.add(th.id); e.subs.add(th.sub); e.score += c.score;
      for (const id of youtubeIds(c.body)) e.yt.add(id);
      e.tids.add(th.id);
      if (e.ctx.length < 4 && !e.ctx.some(x => x.tid === th.id)) e.ctx.push({tid: th.id, sub: th.sub, ask: th.title.slice(0, 130), said: clean(c.body).slice(0, 220)});
      cand.set(key, e);
    }
  }
}

const out = [...cand.values()].filter(e => e.authors.size >= minAuthors || (e.authors.size >= 2 && [...e.subs].some(x => NICHE.has(x))))
  .map(e => ({artist: e.artist, title: e.title, authors: e.authors.size, threads: e.threads.size, score: e.score, subs: [...e.subs], yt: [...e.yt].slice(0, 3), tids: [...e.tids].slice(0, 40), ctx: e.ctx}))
  .sort((a, b) => b.authors - a.authors || b.score - a.score);
await writeJson(dir('./data/candidates.json'), out);
console.log({linesScanned: lines, parsed, distinct: cand.size, keptWithMinAuthors: out.length});
console.log(out.slice(0, 25).map(c => `${c.authors}a/${c.threads}t  ${c.artist} — ${c.title}`).join('\n'));
