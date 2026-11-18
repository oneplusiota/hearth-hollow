// Stage 3: find YouTube links in comments/link-posts, merge by video id, then check each with oEmbed.
// oEmbed: 200 = embeddable, 401 = owner disabled embedding, 400/404 = gone/private.
// Usage: node pipeline/03-extract-videos.mjs
import {readdir} from 'node:fs/promises';
import {readJson, writeJson, youtubeIds, sleep} from './lib.mjs';

const dir = p => new URL(p, import.meta.url).pathname;
const threads = {};
for (const f of (await readdir(dir('./data/'))).filter(f => /^threads-.*\.json$/.test(f))) Object.assign(threads, (await readJson(dir('./data/' + f), {threads: {}})).threads);
const comments = {};
for (const f of (await readdir(dir('./data/'))).filter(f => /^comments-.*\.json$/.test(f))) Object.assign(comments, await readJson(dir('./data/' + f), {}));
const OUT = dir('./data/videos.json');
const videos = await readJson(OUT, {});

const BOTS = /^(automoderator|\[deleted\]|.*bot)$/i;
const seen = {}; // id -> {authors:Set, threads:Set, score, subs:Set, first, last, ctx:[]}
const note = (id, {author, thread, score, t, text}) => {
  const v = seen[id] ??= {authors: new Set(), threads: new Set(), score: 0, subs: new Set(), first: t, last: t, ctx: []};
  if (author && BOTS.test(author)) return;
  v.authors.add(author); v.threads.add(thread.id); v.subs.add(thread.sub); v.score += Math.max(0, score || 0);
  v.first = Math.min(v.first, t); v.last = Math.max(v.last, t);
  if (v.ctx.length < 4) v.ctx.push({thread: thread.id, ask: thread.title.slice(0, 140), text: String(text).slice(0, 300)});
};

for (const th of Object.values(threads)) {
  if (th.kind === 'link') for (const id of youtubeIds(th.url)) note(id, {author: th.author, thread: th, score: th.score, t: th.t, text: th.title});
  for (const c of comments[th.id] || []) for (const id of youtubeIds(c.body)) note(id, {author: c.author, thread: th, score: c.score, t: c.t, text: c.body});
}

const ids = Object.keys(seen);
console.log('distinct videos mentioned:', ids.length);
let n = 0;
for (const id of ids) {
  const s = seen[id];
  const base = {authors: s.authors.size, threads: s.threads.size, score: s.score, subs: [...s.subs], first: s.first, last: s.last, ctx: s.ctx};
  if (videos[id]?.status) { videos[id] = {...videos[id], ...base}; continue; }
  let status = 0, meta = {};
  for (let tries = 0; tries < 3 && !status; tries++) {
    try {
      const r = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`);
      status = r.status;
      if (r.ok) { const j = await r.json(); meta = {title: j.title, channel: j.author_name}; }
      if (r.status === 429) { status = 0; await sleep(5000); }
    } catch { await sleep(1500); }
  }
  videos[id] = {...base, status, ...meta};
  if (++n % 100 === 0) { await writeJson(OUT, videos); console.log('checked', n, '/', ids.length); }
  await sleep(120);
}
await writeJson(OUT, videos);
const all = Object.values(videos);
console.log('embeddable:', all.filter(v => v.status === 200).length, ' embed-disabled:', all.filter(v => v.status === 401).length, ' gone:', all.filter(v => [400, 404].includes(v.status)).length);
