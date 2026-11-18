'use client';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {forYou, similarTo, autoplayNext, search} from './recommend.mjs';
import type {Track, Taste} from './catalog-types';

const KEY = 'tavern-taste-v1';
const MAX_EVENTS = 400;

// The catalog is a static file; taste (likes, plays, skips) lives only in this browser.
export function useLibrary() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [error, setError] = useState('');
  const [events, setEvents] = useState<Taste[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch('/catalog.json').then(r => { if (!r.ok) throw Error(); return r.json(); })
      .then((list: Track[]) => setTracks(list))
      .catch(() => setError('The shelves could not be opened. Check your connection and reload.'));
    try { const p = JSON.parse(localStorage.getItem(KEY) || 'null'); if (Array.isArray(p)) setEvents(p.filter(e => typeof e?.id === 'string' && ['like', 'play', 'skip'].includes(e.kind)).slice(-MAX_EVENTS)); } catch { /* fresh start */ }
    setLoaded(true);
  }, []);
  useEffect(() => { if (loaded) try { localStorage.setItem(KEY, JSON.stringify(events.slice(-MAX_EVENTS))); } catch { /* optional */ } }, [events, loaded]);

  const byId = useMemo(() => new Map(tracks.map(t => [t.id, t])), [tracks]);
  const liked = useMemo(() => {
    const state = new Map<string, boolean>();
    for (const e of events) if (e.kind === 'like') state.set(e.id, !state.get(e.id));
    return new Set([...state].filter(([, on]) => on).map(([id]) => id));
  }, [events]);

  const record = useCallback((id: string, kind: Taste['kind']) => setEvents(list => {
    // A play right after the same play is noise; likes toggle and are handled in toggleLike.
    if (kind === 'play' && list.at(-1)?.id === id && list.at(-1)?.kind === 'play') return list;
    return [...list, {id, kind}].slice(-MAX_EVENTS);
  }), []);
  const toggleLike = useCallback((id: string) => setEvents(list => [...list, {id, kind: 'like' as const}].slice(-MAX_EVENTS)), []);

  return {
    tracks, byId, error, events, liked, loaded: loaded && tracks.length > 0, record, toggleLike,
    forYou: (limit = 24, exclude = new Set<string>()) => forYou(tracks, events, {limit, exclude}) as Track[],
    similar: (t: Track, n = 6) => similarTo(t, tracks, n) as Track[],
    autoplay: (t: {id: string}, recent: string[]) => { const base = byId.get(t.id); return base ? autoplayNext(base, tracks, recent) as Track | null : null; },
    search: (q: string) => search(tracks, q) as Track[],
  };
}
export type Library = ReturnType<typeof useLibrary>;
