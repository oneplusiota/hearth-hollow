// Stage 4: turn comment text into candidate songs ("Artist - Title", "Title by Artist"), merge duplicates,
// and keep only the ones several different people recommended in answer to a question.
// Usage: node pipeline/04-candidates.mjs [minAuthors]
import {readdir} from 'node:fs/promises';
import {readJson, writeJson, youtubeIds} from './lib.mjs';

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
const clean = s => s.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/https?:\/\/\S+/g, ' ').replace(/[*_~`>#]/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const norm = s => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/\(.*?\)|\[.*?\]/g, '').replace(/\b(feat|ft)\.?\b.*$/, '').replace(/^the /, '').replace(/[^a-z0-9]+/g, ' ').trim();
const WORDS = s => s.split(/\s+/).length;
// Sentence-y starts are chatter ("I love this - ..."), not names.
const CHATTER = /^(i|i'm|im|it|its|it's|this|that|my|you|your|we|they|he|she|also|and|but|so|if|for|the best|try|check|listen|maybe|definitely|any|anything|some|just|what|how|why|yes|no|not|one|all|most|lots)\b/i;
const good = s => s.length >= 2 && s.length <= 60 && WORDS(s) <= 8 && !CHATTER.test(s) && /[a-z0-9]/i.test(s) && !/[?!]{2,}/.test(s);

function parseLine(line) {
  const s = clean(line).replace(/^\d+[.)]\s*/, '').replace(/^[-•·]\s*/, '');
  if (s.length < 5 || s.length > 140) return null;
  let m;
  if ((m = s.match(/^"([^"]{2,60})"\s+by\s+([^"(]{2,50})$/i))) return {artist: m[2].trim(), title: m[1].trim()};
  if ((m = s.match(/^([^-–—:"]{2,50}?)\s+[-–—]\s+"?([^"]{2,60}?)"?$/))) return good(m[1].trim()) && good(m[2].trim()) ? {artist: m[1].trim(), title: m[2].trim()} : null;
  if ((m = s.match(/^([^"]{2,60}?)\s+by\s+([A-Z][^"(]{1,50})$/))) return good(m[1].trim()) && good(m[2].trim()) ? {artist: m[2].trim(), title: m[1].trim()} : null;
  return null;
}

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
      const pair = [norm(p.artist), norm(p.title)];
      if (!pair[0] || !pair[1] || pair[0] === pair[1]) continue;
      const key = [...pair].sort().join('|');
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
