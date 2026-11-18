// Stage 6: join candidates with their verified videos, drop weak matches and duplicates, rank, and
// write the input for the tagging pass.
// Usage: node pipeline/06-merge.mjs [maxTracks]
import {readdir} from 'node:fs/promises';
import {readJson, writeJson} from './lib.mjs';

const dir = p => new URL(p, import.meta.url).pathname;
const max = Number(process.argv[2]) || 1400;
const cands = await readJson(dir('./data/candidates.json'), []);
const resolved = {};
for (const f of (await readdir(dir('./data/'))).filter(f => /^resolved-/.test(f))) Object.assign(resolved, await readJson(dir('./data/' + f), {}));

const key = c => `${c.artist}|${c.title}`.toLowerCase();
// Names that are clearly chatter, emoji or profanity-laden fragments rather than an artist or a title.
const JUNK = /[\u{1F300}-\u{1FAFF}☀-➿]|^\W|\W$|;|\b(lol|lmao|idk|imo|tbh)\b|\b(fuck|shit|cunt|nigg)/iu;
const words = s => new Set(s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/\(.*?\)|\[.*?\]/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(w => w.length > 1 && w !== 'the'));
const overlap = (a, b) => { const B = words(b); let n = 0; for (const w of words(a)) if (B.has(w)) n++; return n / Math.max(1, words(a).size); };
// "A - B" in a comment can be either order; the verified video decides. The artist is the half that matches the
// channel or the text before the dash in the video title; ties keep the commenter's order.
function orient(c, r) {
  const head = (r.ytTitle.split(/\s[-–—|]\s/)[0] || '') + ' ' + r.channel.replace(/ - Topic$|VEVO$|Official$/i, '');
  const a = overlap(c.artist, head), t = overlap(c.title, head);
  return t > a + .2 ? {artist: c.title, title: c.artist} : {artist: c.artist, title: c.title};
}
const seen = new Map();
for (const c of cands) {
  const r = resolved[key(c)];
  if (!r?.yt || r.match < 8) continue;
  if (JUNK.test(c.artist) || JUNK.test(c.title.replace(/[?!.)"']+$/, ''))) continue;
  const len = r.len ? r.len.split(':').reverse().reduce((s, p, i) => s + Number(p) * 60 ** i, 0) : 0;
  const kind = /full album|\balbum\b|\[full\]/i.test(r.ytTitle) || len > 1500 ? (len > 3000 ? 'mix' : 'album') : 'song';
  const track = {
    id: r.yt, yt: r.yt, ...orient(c, r), kind, len: r.len || '',
    ytTitle: r.ytTitle, channel: r.channel,
    authors: c.authors, threads: c.threads, score: c.score, subs: c.subs,
    ctx: c.ctx.slice(0, 3),
    src: (c.ctx || []).map(x => ({sub: x.sub, tid: x.tid, ask: x.ask})).filter(x => x.tid).slice(0, 3),
  };
  const prev = seen.get(r.yt);
  if (!prev || track.authors > prev.authors) seen.set(r.yt, track);
}
const out = [...seen.values()]
  .sort((a, b) => (b.authors * 2 + b.threads + Math.log1p(b.score)) - (a.authors * 2 + a.threads + Math.log1p(a.score)))
  .slice(0, max);
await writeJson(dir('./data/merged.json'), out);
const by = {};
for (const t of out) for (const s of t.subs) by[s] = (by[s] || 0) + 1;
console.log({candidates: cands.length, resolved: Object.keys(resolved).length, kept: out.length, kinds: out.reduce((m, t) => (m[t.kind] = (m[t.kind] || 0) + 1, m), {}), bySubreddit: by});
console.log(out.slice(0, 8).map(t => `${t.authors}a  ${t.artist} — ${t.title}  [${t.kind}]`).join('\n'));
