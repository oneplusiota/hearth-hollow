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
const compact = s => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
// Names that headline several different songs are almost certainly artists (Pink Floyd, Tool, Radiohead).
const headliners = new Map();
for (const c of cands) for (const name of new Set([compact(c.artist), compact(c.title)])) if (name) headliners.set(name, (headliners.get(name) || 0) + 1);
function orient(c, r) {
  // Signals, strongest first: the uploader's channel, how often a name headlines other songs, the video title's lead.
  const channel = r.channel.replace(/ - Topic$|VEVO$|Official$/i, '');
  const head = r.ytTitle.split(/\s[-–—|~]\s/)[0] || '';
  const inChannel = x => compact(channel).includes(compact(x)) && compact(x).length > 2 ? 1 : overlap(x, channel);
  const seenAs = x => Math.min(1, Math.log2(headliners.get(compact(x)) || 1) / 4);
  const score = x => inChannel(x) * 2 + seenAs(x) * 1.5 + overlap(x, head) * .3;
  const a = score(c.artist), t = score(c.title);
  return t > a + .25 ? {artist: c.title, title: c.artist} : {artist: c.artist, title: c.title};
}
const seen = new Map();
for (const c of cands) {
  // The same song can be stored as "artist|title" or "title|artist" depending on which comment was seen first.
  const r = resolved[key(c)] || resolved[key({artist: c.title, title: c.artist})];
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
// The same song is often spelled several ways in comments ("Exit Music (For A Film)" / "Exit Music for a Film"), and
// each spelling resolves to its own video. Keep the best-recommended copy and fold the others' evidence into it.
const spelling = t => compact(t.artist.replace(/\b(\d+)\b/g, '$1')) + '|' + compact(t.title);
const byName = new Map();
for (const t of seen.values()) {
  const k = spelling(t), prev = byName.get(k);
  if (!prev) { byName.set(k, t); continue; }
  const [keep, drop] = t.authors > prev.authors ? [t, prev] : [prev, t];
  keep.authors += drop.authors; keep.threads += drop.threads; keep.score += drop.score;
  keep.src = [...keep.src, ...drop.src.filter(x => !keep.src.some(y => y.tid === x.tid))].slice(0, 3);
  byName.set(k, keep);
}
seen.clear();
for (const t of byName.values()) seen.set(t.yt, t);
const out = [...seen.values()]
  .sort((a, b) => (b.authors * 2 + b.threads + Math.log1p(b.score)) - (a.authors * 2 + a.threads + Math.log1p(a.score)))
  .slice(0, max);
await writeJson(dir('./data/merged.json'), out);
const by = {};
for (const t of out) for (const s of t.subs) by[s] = (by[s] || 0) + 1;
console.log({candidates: cands.length, resolved: Object.keys(resolved).length, kept: out.length, kinds: out.reduce((m, t) => (m[t.kind] = (m[t.kind] || 0) + 1, m), {}), bySubreddit: by});
console.log(out.slice(0, 8).map(t => `${t.authors}a  ${t.artist} — ${t.title}  [${t.kind}]`).join('\n'));
