// Lock-screen and notification controls.
// The YouTube iframe runs its own media session that knows nothing about our queue, so the phone shows only
// "play/pause" for the current video. A quiet looping <audio> element on OUR page lets the page own the
// session instead, with previous/next wired to the queue. Whether a given phone prefers our session or the
// iframe's is up to the browser, so treat this as best effort.
type Handlers = {play?: () => void; pause?: () => void; next?: () => void; prev?: () => void};
type Meta = {title: string; artist?: string; art?: string};

let silent = '';
// Ten seconds at 8 kHz, 8-bit, with a whisper of noise (+-1 step): inaudible, but not digital silence,
// which some browsers refuse to treat as playing media.
export function silentWavUrl() {
  if (silent) return silent;
  const rate = 8000, n = rate * 10, bytes = new Uint8Array(44 + n), view = new DataView(bytes.buffer);
  const text = (at: number, s: string) => { for (let i = 0; i < s.length; i++) bytes[at + i] = s.charCodeAt(i); };
  text(0, 'RIFF'); view.setUint32(4, 36 + n, true); text(8, 'WAVE'); text(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, rate, true); view.setUint32(28, rate, true); view.setUint16(32, 1, true); view.setUint16(34, 8, true);
  text(36, 'data'); view.setUint32(40, n, true);
  for (let i = 0; i < n; i++) bytes[44 + i] = 127 + Math.floor(Math.random() * 3);
  silent = URL.createObjectURL(new Blob([bytes], {type: 'audio/wav'}));
  return silent;
}

let holder: HTMLAudioElement | null = null;

// Call from a user gesture (a click on Play): browsers only allow the first play() then.
export async function hold() {
  if (typeof window === 'undefined') return;
  if (!holder) { holder = new Audio(silentWavUrl()); holder.loop = true; holder.volume = .02; }
  try { await holder.play(); } catch { /* blocked until the next gesture */ }
}

// Pausing the silent loop with the music lets the phone drop the media card instead of showing "playing".
export function rest() { holder?.pause(); }

export function release() {
  holder?.pause();
  if (!('mediaSession' in navigator)) return;
  navigator.mediaSession.metadata = null;
  navigator.mediaSession.playbackState = 'none';
  for (const a of ['play', 'pause', 'previoustrack', 'nexttrack'] as const) { try { navigator.mediaSession.setActionHandler(a, null); } catch { /* unsupported action */ } }
}

export function show(meta: Meta, handlers: Handlers, playing: boolean) {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
  const session = navigator.mediaSession;
  session.metadata = new MediaMetadata({title: meta.title, artist: meta.artist || 'The Hollow Hearth', artwork: meta.art ? [{src: meta.art, sizes: '480x360', type: 'image/jpeg'}] : []});
  session.playbackState = playing ? 'playing' : 'paused';
  const set = (action: MediaSessionAction, fn?: () => void) => { try { session.setActionHandler(action, fn ? () => fn() : null); } catch { /* unsupported action */ } };
  set('play', handlers.play); set('pause', handlers.pause); set('previoustrack', handlers.prev); set('nexttrack', handlers.next);
}
