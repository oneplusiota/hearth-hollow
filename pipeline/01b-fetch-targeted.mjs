// Stage 1b: topic searches in subreddits where music questions are a small share of traffic.
// Writes threads-<sub>.json in the same shape as stage 1, so stages 2-6 pick them up unchanged.
// Usage: node pipeline/01b-fetch-targeted.mjs
import {api, readJson, writeJson} from './lib.mjs';

const SEARCHES = [
  ['DnD', 'music'], ['DnD', 'playlist'], ['DnD', 'ambience'], ['DungeonsAndDragons', 'music'], ['DMAcademy', 'music'], ['DMAcademy', 'ambience'],
  ['DMAcademy', 'playlist'], ['rpg', 'music'], ['Fantasy', 'music'], ['Fantasy', 'soundtrack'], ['dungeonsynth', 'recommend'],
  ['GetStudying', 'music'], ['studying', 'music'], ['studytips', 'music'], ['productivity', 'music'], ['books', 'reading music'], ['suggestmeabook', 'music'],
  ['sleep', 'music'], ['insomnia', 'music'], ['running', 'music'], ['weightlifting', 'music'], ['CampingandHiking', 'music'], ['roadtrip', 'playlist'],
  ['Cooking', 'music'], ['AskReddit', 'songs'], ['Music', 'recommend'], ['lofi', 'recommend'], ['synthwave', 'recommend'],
  ['Documentaries', 'music'], ['gamedev', 'music'], ['programming', 'music'], ['coding', 'music'], ['ADHD', 'music'], ['ADHD_Programmers', 'music'],
  ['WeAreTheMusicMakers', 'ambient'], ['ambientmusic', 'sleep'], ['ambientmusic', 'rain'], ['ambientmusic', 'reading'], ['ambientmusic', 'study'],
  ['ambientmusic', 'recommend'], ['classicalmusic', 'recommend'], ['classicalmusic', 'sleep'], ['jazz', 'recommend'], ['postrock', 'recommend'],
  ['Folk', 'recommend'], ['folkmusic', 'recommend'], ['celticmusic', 'music'], ['medievalmusic', 'music'], ['Metal', 'recommend'], ['hiphopheads', 'recommend'],
  ['indieheads', 'recommend'], ['electronicmusic', 'recommend'], ['shoegaze', 'recommend'], ['soundtracks', 'recommend'], ['gamemusic', 'recommend'],
  ['VGMusic', 'recommend'], ['FolkPunk', 'recommend'], ['progrockmusic', 'recommend'], ['truemetal', 'recommend'],
];
const FIELDS = 'id,title,url,score,num_comments,created_utc,link_flair_text,author,over_18,selftext';
for (const [sub, query] of SEARCHES) {
  const OUT = new URL(`./data/threads-${sub}.json`, import.meta.url).pathname;
  const db = await readJson(OUT, {done: {}, threads: {}});
  const key = `q:${query}`;
  if (db.done[key] !== undefined) continue;
  let kept = 0, upper = Date.now(), total = 0, failed = false;
  for (let page = 0; page < 4; page++) {
    const rows = await api('/posts/search', {subreddit: sub, query, after: '2022-01-01', before: new Date(upper).toISOString(), limit: '100', sort: 'desc', fields: FIELDS}, {tries: 3, pause: 1500});
    if (!rows) { failed = !total; break; }
    total += rows.length;
    for (const p of rows) {
      if (p.over_18 || p.num_comments < 6) continue;
      db.threads[p.id] = {sub, kind: 'ask', id: p.id, title: p.title, url: p.url, score: p.score, n: p.num_comments, t: p.created_utc, flair: p.link_flair_text, author: p.author, body: (p.selftext || '').slice(0, 600)};
      kept++;
    }
    if (rows.length < 100) break;
    upper = Math.min(...rows.map(r => r.created_utc)) * 1000;
  }
  if (failed) { console.log(sub.padEnd(20), query.padEnd(14), 'FAILED (will retry next run)'); continue; }
  db.done[key] = kept;
  await writeJson(OUT, db);
  console.log(sub.padEnd(20), query.padEnd(14), 'posts', total, 'kept', kept);
}
console.log('done');
