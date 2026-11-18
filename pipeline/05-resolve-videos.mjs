// Stage 5: give every candidate song a video that is KNOWN to play in an embedded player.
// For each candidate: take any Reddit-linked video, else search YouTube; check oEmbed (200 = embeddable);
// prefer the official channel / "Topic" upload and a plausible length. Resumable; results cached by song key.
// Usage: node pipeline/05-resolve-videos.mjs [limit] [shard] [shards]
import {readJson, writeJson, sleep} from './lib.mjs';

const dir = p => new URL(p, import.meta.url).pathname;
const limit = Number(process.argv[2]) || 1500, SHARD = Number(process.argv[3] || 0), SHARDS = Number(process.argv[4] || 1);
const cands = (await readJson(dir('./data/candidates.json'), [])).slice(0, limit);
const OUT = dir(`./data/resolved-${SHARD}.json`);
const done = await readJson(OUT, {});

const key = c => `${c.artist}|${c.title}`.toLowerCase();
const words = s => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/\(.*?\)|\[.*?\]/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(w => w.length > 1 && !['the', 'and', 'feat', 'ft'].includes(w));
const BAD = /\b(cover|karaoke|reaction|tutorial|lesson|how to|slowed|reverb|sped up|nightcore|8d|lyrics? video|1 ?hour|hours?|10 ?h|loop|bass boosted|remix|live at|instrumental version|piano version|guitar lesson|\bamv\b)\b/i;

async function search(q) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch('https://www.youtube.com/youtubei/v1/search?prettyPrint=false', {
        method: 'POST', headers: {'content-type': 'application/json', 'user-agent': 'Mozilla/5.0'},
        body: JSON.stringify({context: {client: {clientName: 'WEB', clientVersion: '2.20250101.00.00', hl: 'en', gl: 'US'}}, query: q, params: 'EgIQAQ%3D%3D'}),
      });
      if (r.status === 429) { await sleep(8000); continue; }
      if (!r.ok) return [];
      const out = [];
      const walk = o => { if (o && typeof o === 'object') { if (o.videoRenderer) out.push(o.videoRenderer); for (const v of Object.values(o)) walk(v); } };
      walk(await r.json());
      return out.slice(0, 8).map(v => ({id: v.videoId, title: v.title?.runs?.[0]?.text || '', channel: v.ownerText?.runs?.[0]?.text || '', len: v.lengthText?.simpleText || '', views: v.viewCountText?.simpleText || ''}));
    } catch { await sleep(1500); }
  }
  return [];
}
const seconds = t => t.split(':').reverse().reduce((s, p, i) => s + Number(p) * 60 ** i, 0);
async function embeddable(id) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`);
      if (r.status === 429) { await sleep(6000); continue; }
      return r.status === 200;
    } catch { await sleep(1000); }
  }
  return false;
}

function score(c, v) {
  const want = new Set([...words(c.artist), ...words(c.title)]);
  const got = new Set(words(v.title + ' ' + v.channel));
  const hit = [...want].filter(w => got.has(w)).length;
  let s = hit / Math.max(1, want.size) * 10;
  if (BAD.test(v.title) && !BAD.test(c.title)) s -= 6;
  if (/topic$/i.test(v.channel) || /vevo$/i.test(v.channel) || /official/i.test(v.title + v.channel)) s += 2.5;
  if (words(c.artist).every(w => words(v.channel).includes(w))) s += 2;
  const sec = v.len ? seconds(v.len) : 0;
  if (sec && sec < 45) s -= 5;
  if (sec > 1500) s -= 3; // long uploads are usually mixes, unless the song itself is long (ambient)
  return s;
}

let n = 0;
const swapped = c => `${c.title}|${c.artist}`.toLowerCase();
const mine = cands.filter((c, i) => i % SHARDS === SHARD && !done[key(c)] && !done[swapped(c)]);
console.log('to resolve:', mine.length);
for (const c of mine) {
  const found = await search(`${c.artist} ${c.title}`);
  const ranked = found.map(v => ({...v, s: score(c, v)})).sort((a, b) => b.s - a.s);
  let pick = null;
  for (const v of ranked.slice(0, 4)) {
    if (v.s < 6) break;
    if (await embeddable(v.id)) { pick = v; break; }
    await sleep(80);
  }
  done[key(c)] = pick ? {yt: pick.id, ytTitle: pick.title, channel: pick.channel, len: pick.len, match: Math.round(pick.s * 10) / 10} : {yt: null, tried: ranked.slice(0, 2).map(v => v.title)};
  if (++n % 25 === 0) { await writeJson(OUT, done); console.log(n, '/', mine.length, 'resolved so far:', Object.values(done).filter(d => d.yt).length); }
  await sleep(250);
}
await writeJson(OUT, done);
console.log('finished. playable:', Object.values(done).filter(d => d.yt).length, 'of', Object.keys(done).length);
