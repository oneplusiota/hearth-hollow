# Hollow — sound for being here

Next.js App Router, React and TypeScript. Live: https://hearth-hollow-pi.vercel.app/

## Run and validate

Use Node.js 22+, then `npm ci`, `npm run dev`. Validation: `npm test`, `npm run typecheck`, `npm run build`. Deploy using Vercel's Next.js preset. No API keys or environment variables are required.

## Features

- Listen: six listening scenarios and eight procedural textures, including white/pink/brown noise, rain, surf, drone, tavern music and pulse. Volume, harmonic variation and session timer controls.
- Discover: 18 hand-reviewed recommendations drawn from linked Reddit discussions, scenario filters, search and browser-local saved favorites. External listening links; no live ingestion or embedded commercial catalog.
- The Signal: six phrases in Velin, a small fictional language. Experimental synthesized syllables, clues, local notes and a server-side translation checker. This is a phonetic prototype, not realistic singing.

## Implementation

`components/hollow-app.tsx` owns the UI. `lib/catalog.ts` records recommendations and source discussions. `lib/sound-engine.ts` manages audio lifecycle; `public/soundscape-worklet.js` synthesizes noise, drone, pulse and vowel-formant syllables on the audio thread. `public/music-worklet.js` supplies the original tavern generator using bounded random walks and changing arrangements. Audio is generated continuously rather than streamed from recordings; motifs and phrases can repeat.

`lib/signal-private.ts` is server-only and contains the miniature vocabulary and answer key. The public signal endpoint returns phrase text, syllables and a clue; the decipher endpoint returns a boolean. Keep this source private if the puzzle answer key should remain private. This is a casual puzzle, not an abuse-resistant prize system.

Favorites, preferences and notes remain in localStorage. Translation guesses go to the app's checker. Recommendation links open external services. No analytics SDK is included.

## Research basis

The source links and short paraphrases are in `lib/catalog.ts` and accessible in Discover. The reviewed threads suggest lyric-free music for some coding/reading listeners, slow ambient music for some sleep listeners, and varied rhythmic music for running. Colored-noise preferences differ. These are anecdotes from a small selected sample, not clinical findings or a representative popularity ranking. Reviewed November 18, 2026.

The invented-vocals idea has precedents, including Sigur Rós's Hopelandic: https://sigurros.com/music/untitled/. Velin adds a consistent tiny vocabulary and a deciphering game; it is explicitly fictional.

## Limits

Audio needs a user gesture. Browsers and mobile operating systems can suspend background audio, especially on lock; uninterrupted playback is not guaranteed. Tests cover bounded audio output, switching and timer completion, not listening quality on every device. The original YouTube reference was not accessible for listening and was not sampled.

Future work: human-reviewed vocal production, larger permission-compatible recommendation ingestion, direct track metadata and device listening tests.

## YouTube listening room

The official IFrame API supports visible playback, automatic queue advancement, previous/next, repeat, and skipping unplayable entries. YouTube controls and ads remain intact. Playback continues when you switch sections; minimizing the browser or locking the screen does not pause it by the app's own doing (the browser or OS may still suspend an embedded player, especially on mobile). Browsers may require a fresh play gesture. Live streams have no natural track end; use Next.

Add individual watch, Shorts, live or youtu.be links. Three discovery entries have selected upload shortcuts; others offer Add video link to choose your preferred recording. This is not an in-app YouTube search service and requires no Data API key. YouTube playlists are not imported or synced.

Queues (up to 200 entries) and playlists (up to 50) persist in localStorage under hollow-youtube-v1. Save the queue as a playlist, load it to edit order, then Update from queue. JSON export/import provides portable backups. Clearing browser storage deletes local collections. YouTube receives playback/connection data after starting its player. This is a video embed, not audio extraction or background playback.
