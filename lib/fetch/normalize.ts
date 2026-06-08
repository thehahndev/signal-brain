import type { SourceType } from '../engine/types';

/** Query params that carry no content identity — stripped so the dedup key is stable. */
const TRACKING_PARAMS = [
  /^utm_/i,
  /^fbclid$/i,
  /^gclid$/i,
  /^mc_/i,
  /^ref$/i,
  /^ref_src$/i,
  /^ref_url$/i,
  /^s$/i, // x.com share token
  /^t$/i, // x.com share token
  /^cxt$/i, // x.com
  /^twclid$/i,
];

/** YouTube keeps `v` (and playlist `list`); everything else (incl. `si`, `t`) is noise. */
const YOUTUBE_KEEP = new Set(['v', 'list']);

function isTracking(key: string): boolean {
  return TRACKING_PARAMS.some((re) => re.test(key));
}

/** Pull the first http(s) URL out of a free-text Telegram message. */
export function extractUrl(text: string): string | null {
  const m = text.match(/https?:\/\/[^\s<>"')]+/i);
  return m ? m[0] : null;
}

export function detectSourceType(url: string): SourceType {
  let host = '';
  try {
    host = new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return 'other';
  }
  if (host === 'x.com' || host === 'twitter.com' || host === 'mobile.twitter.com') return 'x';
  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtu.be') return 'youtube';
  if (url.toLowerCase().split('?')[0].endsWith('.pdf')) return 'pdf';
  return 'article';
}

/**
 * Normalize a URL into a stable dedup key: lowercase host, drop `www.`, strip the
 * fragment + tracking params, normalize the x.com host, and remove a trailing slash.
 * Returns the input trimmed if it can't be parsed.
 */
export function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  let u: URL;
  try {
    u = new URL(trimmed);
  } catch {
    return trimmed;
  }

  u.hostname = u.hostname.replace(/^www\./, '').toLowerCase();
  if (u.hostname === 'twitter.com' || u.hostname === 'mobile.twitter.com') u.hostname = 'x.com';
  if (u.hostname === 'm.youtube.com') u.hostname = 'youtube.com';
  u.hash = '';

  const isYoutube = u.hostname === 'youtube.com' || u.hostname === 'youtu.be';
  const kept = new URLSearchParams();
  for (const [k, v] of u.searchParams) {
    if (isYoutube) {
      if (YOUTUBE_KEEP.has(k)) kept.set(k, v);
    } else if (!isTracking(k)) {
      kept.set(k, v);
    }
  }
  // Re-serialize params in sorted order so key ordering can't split the dedup key.
  kept.sort();
  u.search = kept.toString();

  let out = u.toString();
  // Drop a trailing slash on the path (but keep "https://host/").
  out = out.replace(/\/(\?|$)/, '$1');
  return out;
}
