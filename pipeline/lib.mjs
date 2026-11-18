// Shared helpers for the catalog pipeline. Plain Node 22, no dependencies.
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';

export const API = 'https://arctic-shift.photon-reddit.com/api';
export const sleep = ms => new Promise(r => setTimeout(r, ms));

// Arctic Shift has no SLA and times out on broad queries (HTTP 422 "Timeout"); retry gently.
export async function api(path, params, {tries = 4, pause = 1200} = {}) {
  const url = `${API}${path}?${new URLSearchParams(params)}`;
  for (let i = 0; i < tries; i++) {
    await sleep(pause * (i + 1));
    try {
      const res = await fetch(url, {headers: {'User-Agent': 'hollow-catalog/0.1 (personal project)'}});
      const body = await res.json().catch(() => null);
      if (res.ok && body?.data) return body.data;
    } catch { /* network blip: retry */ }
  }
  return null;
}

export async function readJson(path, fallback) {
  try { return JSON.parse(await readFile(path, 'utf8')); } catch { return fallback; }
}
export async function writeJson(path, value) {
  await mkdir(dirname(path), {recursive: true});
  await writeFile(path, JSON.stringify(value, null, 1));
}

const ID = /^[\w-]{11}$/;
// Mirrors lib/youtube-model.mjs videoId(): only real YouTube hosts, 11-char ids.
export function videoId(value) {
  if (typeof value !== 'string') return null;
  try {
    const u = new URL(value.trim());
    if (!['http:', 'https:'].includes(u.protocol)) return null;
    const host = u.hostname.toLowerCase().replace(/^www\./, '');
    let id = null;
    if (host === 'youtu.be') id = u.pathname.split('/')[1];
    else if (['youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtube-nocookie.com'].includes(host))
      id = u.pathname === '/watch' ? u.searchParams.get('v') : ['embed', 'shorts', 'live'].includes(u.pathname.split('/')[1]) ? u.pathname.split('/')[2] : null;
    return id && ID.test(id) ? id : null;
  } catch { return null; }
}

// Pull every YouTube video id out of free text (comment bodies, markdown links, bare urls).
export function youtubeIds(text) {
  const out = new Set();
  for (const m of String(text || '').matchAll(/https?:\/\/[^\s)\]>"']+/g)) {
    const id = videoId(m[0].replace(/[.,;:!?]+$/, ''));
    if (id) out.add(id);
  }
  return [...out];
}
