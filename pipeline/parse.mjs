// Text helpers shared by the candidate extractor and the notice-board builder.
export const clean = s => s.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/https?:\/\/\S+/g, ' ').replace(/[*_~`>#]/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
export const norm = s => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/\(.*?\)|\[.*?\]/g, '').replace(/\b(feat|ft)\.?\b.*$/, '').replace(/^the /, '').replace(/[^a-z0-9]+/g, ' ').trim();
const WORDS = s => s.split(/\s+/).length;
// Sentence-y starts are chatter ("I love this - ..."), not names.
const CHATTER = /^(i|i'm|im|it|its|it's|this|that|my|you|your|we|they|he|she|also|and|but|so|if|for|the best|try|check|listen|maybe|definitely|any|anything|some|just|what|how|why|yes|no|not|one|all|most|lots)\b/i;
const good = s => s.length >= 2 && s.length <= 60 && WORDS(s) <= 8 && !CHATTER.test(s) && /[a-z0-9]/i.test(s) && !/[?!]{2,}/.test(s);

export function parseLine(line) {
  const s = clean(line).replace(/^\d+[.)]\s*/, '').replace(/^[-•·]\s*/, '');
  if (s.length < 5 || s.length > 140) return null;
  let m;
  if ((m = s.match(/^"([^"]{2,60})"\s+by\s+([^"(]{2,50})$/i))) return {artist: m[2].trim(), title: m[1].trim()};
  if ((m = s.match(/^([^-–—:"]{2,50}?)\s+[-–—]\s+"?([^"]{2,60}?)"?$/))) return good(m[1].trim()) && good(m[2].trim()) ? {artist: m[1].trim(), title: m[2].trim()} : null;
  if ((m = s.match(/^([^"]{2,60}?)\s+by\s+([A-Z][^"(]{1,50})$/))) return good(m[1].trim()) && good(m[2].trim()) ? {artist: m[2].trim(), title: m[1].trim()} : null;
  return null;
}

// A song is identified by its two normalised halves in sorted order, since "A - B" may be artist-title or title-artist.
export function pairKey(a, b) {
  const x = norm(a), y = norm(b);
  return x && y && x !== y ? [x, y].sort().join('|') : '';
}
