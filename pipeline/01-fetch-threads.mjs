// Stage 1: list candidate threads per subreddit in small time windows (resumable).
// Usage: node pipeline/01-fetch-threads.mjs <sub1,sub2,...|all> [fromDate]
// One data file per subreddit, so several workers can run in parallel.
import {api, readJson, writeJson} from './lib.mjs';

// kind: 'ask' = a question whose comments answer it; 'link' = the post itself is the recommendation.
const SUBS = [
  {sub: 'musicsuggestions', kind: 'ask', days: 5, minComments: 8},
  {sub: 'ifyoulikeblank', kind: 'ask', days: 7, minComments: 8},
  {sub: 'ambientmusic', kind: 'ask', days: 30, minComments: 6},
  {sub: 'synthwave', kind: 'ask', days: 30, minComments: 6},
  {sub: 'postrock', kind: 'ask', days: 30, minComments: 6},
  {sub: 'classicalmusic', kind: 'ask', days: 30, minComments: 8},
  {sub: 'jazz', kind: 'ask', days: 30, minComments: 8},
  {sub: 'LetsTalkMusic', kind: 'ask', days: 30, minComments: 15},
  {sub: 'listentothis', kind: 'link', days: 10, minComments: 3}, // archived scores are early snapshots (mostly 1-4), so use comment count
  {sub: 'DnD', kind: 'ask', days: 30, minComments: 8, titleRe: /music|playlist|soundtrack|ambien|song/i},
  {sub: 'DungeonSynth', kind: 'ask', days: 60, minComments: 4},
  {sub: 'lofi', kind: 'ask', days: 60, minComments: 4},
];
const WANT = (process.argv[2] || 'all').split(',');
const FROM = Date.parse(process.argv[3] || '2024-01-01'), TO = Date.now();
const ASK = /recommend|suggest|similar|like |songs? (for|that|about|with)|what (do|should|are)|best|favou?rite|looking for|help|anything|playlist|music for|listen/i;

for (const cfg of SUBS.filter(c => WANT[0] === 'all' || WANT.includes(c.sub))) {
  const OUT = new URL(`./data/threads-${cfg.sub}.json`, import.meta.url).pathname;
  const db = await readJson(OUT, {done: {}, threads: {}});
  for (let t = FROM; t < TO; t += cfg.days * 864e5) {
    const key = `${cfg.sub}:${t}`;
    if (db.done[key]) continue;
    // Page backwards through the window: the API returns at most 100 rows, newest first.
    const posts = [];
    let upper = t + cfg.days * 864e5, failed = false;
    for (let page = 0; page < 12; page++) {
      const rows = await api('/posts/search', {
        subreddit: cfg.sub, after: new Date(t).toISOString(), before: new Date(upper).toISOString(),
        limit: '100', sort: 'desc', fields: 'id,title,url,score,num_comments,created_utc,link_flair_text,author,over_18,selftext',
      });
      if (!rows) { failed = true; break; }
      posts.push(...rows);
      if (rows.length < 100) break;
      upper = Math.min(...rows.map(r => r.created_utc)) * 1000;
    }
    if (failed && !posts.length) { console.log('skip (timeout)', key); continue; }
    let kept = 0;
    for (const p of posts) {
      if (p.over_18) continue;
      const ok = cfg.kind === 'link' ? (p.num_comments >= cfg.minComments && /youtu/.test(p.url || '')) :
        p.num_comments >= cfg.minComments && (cfg.titleRe ? cfg.titleRe.test(p.title) : ASK.test(p.title));
      if (!ok) continue;
      db.threads[p.id] = {sub: cfg.sub, kind: cfg.kind, id: p.id, title: p.title, url: p.url, score: p.score, n: p.num_comments, t: p.created_utc, flair: p.link_flair_text, author: p.author, body: (p.selftext || '').slice(0, 600)};
      kept++;
    }
    db.done[key] = kept;
    await writeJson(OUT, db);
    console.log(cfg.sub, new Date(t).toISOString().slice(0, 10), 'posts', posts.length, 'kept', kept, 'total', Object.keys(db.threads).length);
  }
}
console.log('done');
