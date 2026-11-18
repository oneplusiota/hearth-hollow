// Stage 7: combine merged tracks with tags into public/catalog.json (what the app loads).
// Occasions come from the QUESTIONS people asked ("songs for a night drive"), a signal no model has to guess.
// Tags written by the tagging pass (data/tags-*.json) override the heuristics where present.
// Usage: node pipeline/07-build-catalog.mjs
import {readdir, writeFile} from 'node:fs/promises';
import {readJson} from './lib.mjs';

const dir = p => new URL(p, import.meta.url).pathname;
const merged = await readJson(dir('./data/merged.json'), []);
const tags = {};
for (const f of (await readdir(dir('./data/'))).filter(f => /^tags-.*\.json$/.test(f))) Object.assign(tags, await readJson(dir('./data/' + f), {}));

const SCENES = ['focus', 'read', 'sleep', 'unwind', 'rain', 'drive', 'move', 'chores', 'party', 'quest', 'heartache'];
const MOODS = ['calm', 'dreamy', 'melancholic', 'warm', 'eerie', 'euphoric', 'driving', 'dark', 'nostalgic', 'hopeful', 'heavy', 'playful', 'epic'];
const ASK_SCENES = [
  ['focus', /\b(study|studying|focus|concentrat|coding|programming|work(ing)? (music|to)|homework|productiv)/i],
  ['read', /\b(read(ing)?|book|library|novel)\b/i],
  ['sleep', /\b(sleep|bed ?time|insomnia|lullab|fall asleep|drift)/i],
  ['unwind', /\b(relax|chill|calm|unwind|peaceful|soothing|decompress|meditat|ambient)/i],
  ['rain', /\b(rain|storm|cozy|cosy|autumn|fall vibes|winter)/i],
  ['drive', /\b(driv(e|ing)|road ?trip|night ?(drive|time)|highway|car\b|cruis)/i],
  ['move', /\b(run(ning)?|gym|workout|lift(ing)?|cardio|exercise|hype|pump|training|hik(e|ing))/i],
  ['chores', /\b(cook(ing)?|clean(ing)?|chores|dishes|kitchen|morning|shower|sunday)/i],
  ['party', /\b(party|dance|dancing|drinking|friends|bbq|barbecue|sing ?along|karaoke|feel.?good|upbeat|happy)/i],
  ['quest', /\b(d&d|dnd|dungeon|tavern|fantasy|medieval|epic|adventure|rpg|campaign|battle|celtic|viking)/i],
  ['heartache', /\b(sad|breakup|break-up|heartbreak|cry(ing)?|lonely|melanchol|grief|depress|miss(ing)? (you|someone)|nostalg)/i],
];
const ASK_MOODS = [
  ['calm', /\b(calm|relax|peaceful|soothing|gentle|quiet|soft)/i], ['dreamy', /\b(dream|ethereal|hazy|float|shoegaze)/i],
  ['melancholic', /\b(sad|melanchol|lonely|depress|heartbreak|cry|grief)/i], ['warm', /\b(warm|cozy|cosy|comfort|wholesome)/i],
  ['eerie', /\b(eerie|creepy|haunt|spooky|unsettl|dark ambient)/i], ['euphoric', /\b(euphor|uplift|ecstatic|rave|trance)/i],
  ['driving', /\b(driv|road ?trip|highway|momentum)/i], ['dark', /\b(dark|brood|gothic|doom|sinister)/i],
  ['nostalgic', /\b(nostalg|retro|childhood|throwback|80s|90s|old school)/i], ['hopeful', /\b(hope|inspir|motivat|optimis|uplift)/i],
  ['heavy', /\b(heavy|metal|hardcore|aggressive|angry|rage|loud)/i], ['playful', /\b(fun|quirky|silly|upbeat|bouncy|happy)/i],
  ['epic', /\b(epic|cinematic|orchestr|soaring|anthemic|grand)/i],
];
const SUB_SCENES = {ambientmusic: ['unwind'], postrock: ['unwind'], DungeonSynth: ['quest'], DnD: ['quest'], DMAcademy: ['quest'], classicalmusic: ['read'], lofi: ['focus'], synthwave: ['drive'], jazz: ['unwind']};
const SUB_GENRE = {ambientmusic: 'ambient', postrock: 'post-rock', DungeonSynth: 'dungeon synth', classicalmusic: 'classical', jazz: 'jazz', lofi: 'lo-fi', synthwave: 'synthwave'};

const pickAll = (rules, text, max) => rules.filter(([, re]) => re.test(text)).map(([k]) => k).slice(0, max);
const clean = (list, allowed, max) => [...new Set((Array.isArray(list) ? list : []).map(s => String(s).toLowerCase().trim()))].filter(s => allowed.includes(s)).slice(0, max);

const out = merged.map(t => {
  const asks = t.src.map(s => s.ask).join(' | ');
  const tag = tags[t.id] || {};
  let scenes = clean(tag.scenes, SCENES, 3);
  if (!scenes.length) scenes = [...new Set([...pickAll(ASK_SCENES, asks, 3), ...t.subs.flatMap(s => SUB_SCENES[s] || [])])].slice(0, 3);
  let mood = clean(tag.mood, MOODS, 3);
  if (!mood.length) mood = pickAll(ASK_MOODS, asks, 2);
  const genres = (Array.isArray(tag.genres) && tag.genres.length ? tag.genres : t.subs.map(s => SUB_GENRE[s]).filter(Boolean)).map(g => String(g).toLowerCase().slice(0, 28)).slice(0, 3);
  const why = typeof tag.why === 'string' && tag.why.length > 15 ? tag.why.slice(0, 220)
    : `Named by ${t.authors} different people across ${t.threads} Reddit ${t.threads === 1 ? 'thread' : 'threads'}.`;
  return {
    id: t.id, yt: t.yt, title: t.title, artist: t.artist, kind: t.kind, len: t.len, ...(Number.isInteger(tag.year) ? {year: tag.year} : {}),
    why, mood, scenes, genres, energy: Math.min(5, Math.max(1, Number(tag.energy) || 3)),
    vocals: ['none', 'sparse', 'sung'].includes(tag.vocals) ? tag.vocals : 'sung',
    similar: (Array.isArray(tag.similar) ? tag.similar : []).map(s => String(s).slice(0, 40)).slice(0, 4),
    authors: t.authors, threads: t.threads, score: t.score, subs: t.subs,
    src: t.src.map(s => ({sub: s.sub, tid: s.tid, ask: s.ask.slice(0, 110)})),
  };
}).filter(t => t.title && t.artist);

await writeFile(dir('../public/catalog.json'), JSON.stringify(out));
const tagged = out.filter(t => tags[t.id]).length;
const by = id => out.filter(t => t.scenes.includes(id)).length;
console.log({tracks: out.length, hand_tagged: tagged, withScene: out.filter(t => t.scenes.length).length, withMood: out.filter(t => t.mood.length).length});
console.log(Object.fromEntries(SCENES.map(s => [s, by(s)])));
