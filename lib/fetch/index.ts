import { clean, isFetchMiss, substanceLength } from '../engine/clean';
import type { SourceType } from '../engine/types';
import type { FetchStatus } from '../db/schema';
import { detectSourceType, findOutboundLink, normalizeUrl } from './normalize';
import { resolveUrl } from './resolve';
import { fetchViaJina } from './jina';
import { fetchYoutubeTranscript } from './youtube';
import { fetchOgMetadata } from './fallback';

/**
 * Minimum "real" (non-URL, non-whitespace) characters a cleaned capture must carry to
 * count as content. Below this it's a hollow shell — a link-only tweet, a login wall,
 * or a redirect stub — which we reject as a `miss` rather than ship a bare URL to the
 * ranker. The observed link-only-tweet shells net ~11–25 here once cleaned; even a terse
 * real tweet clears ~50. Kept deliberately low: missing a hollow item is mild (the ranker
 * buries it anyway), but rejecting a real short tweet would silently drop signal.
 */
const MIN_SUBSTANCE = 40;

export interface FetchResult {
  status: FetchStatus; // ok | miss | error  (never 'pending' — that's the pre-fetch state)
  adapter: string;
  title: string;
  text: string;
  charCount: number;
  error?: string;
}

/** Turn a raw adapter capture into a cleaned result, honouring the deleted-page guard. */
function finalize(adapter: string, raw: string, sourceType: SourceType): FetchResult {
  if (isFetchMiss(raw.length, raw)) {
    return { status: 'miss', adapter, title: '', text: '', charCount: raw.length, error: 'deleted/missing page' };
  }
  const { title, text } = clean(raw, sourceType);
  if (!text.trim()) {
    return { status: 'error', adapter, title, text: '', charCount: raw.length, error: 'empty after clean' };
  }
  // Hollow capture: a cleaned body that's essentially just a URL / chrome (link-only
  // tweet, login wall, redirect stub). Reject as a miss so it never reaches the ranker
  // as `ok` — for X the caller first tries to recover the linked content.
  if (substanceLength(text) < MIN_SUBSTANCE) {
    return { status: 'miss', adapter, title, text: '', charCount: text.length, error: 'no extractable content (bare URL / stub)' };
  }
  return { status: 'ok', adapter, title, text, charCount: text.length };
}

/**
 * Recover a link-only tweet: pull the outbound link out of the hollow X capture,
 * resolve any shortener to its destination, and full-extract THAT as the real item.
 * The destination is often an X long-form article (`x.com/i/article/…`) — which Jina
 * *does* extract — so X destinations are allowed; we only refuse a self-loop back to
 * the same post or an unfetchable target. Returns null if there's nothing to recover
 * or the destination is itself hollow — the caller then keeps the original miss.
 */
async function recoverLinkOnlyTweet(rawTweet: string, sourceUrl: string): Promise<FetchResult | null> {
  const outbound = findOutboundLink(rawTweet);
  if (!outbound) return null;

  const dest = await resolveUrl(outbound);
  if (normalizeUrl(dest) === normalizeUrl(sourceUrl)) return null; // points back at itself
  const destType = detectSourceType(dest);
  if (destType === 'other') return null; // unknown/unfetchable target

  try {
    const destRaw =
      destType === 'youtube' ? await fetchYoutubeTranscript(dest) : await fetchViaJina(dest);
    const recovered = finalize(`x→${destType}`, destRaw, destType);
    return recovered.status === 'ok' ? recovered : null;
  } catch {
    return null;
  }
}

/**
 * Last-resort degrade to OG metadata so a card is never empty. For an article-link
 * tweet, X exposes the linked article's title as the tweet's `og:description`, so this
 * recovers a usable headline even when the primary extractor can't read the page.
 * Returns null if OG itself yields nothing. Not subject to the substance floor — a short
 * real headline still beats a bare URL.
 */
async function ogFallback(url: string): Promise<FetchResult | null> {
  const og = await fetchOgMetadata(url);
  const text = (og.text || og.title).trim();
  if (!text) return null;
  return { status: 'ok', adapter: 'fallback:og', title: og.title, text, charCount: text.length };
}

/**
 * Single full-extract fetch (two-pass is dropped). Dispatches by source_type to the
 * Phase-0 adapters — Jina for x/article/pdf/other, youtube-transcript for YouTube —
 * then degrades to OG metadata on any primary failure so a card is never empty.
 */
export async function fetchItem(url: string, sourceType?: SourceType): Promise<FetchResult> {
  const st = sourceType ?? detectSourceType(url);

  try {
    if (st === 'youtube') {
      const raw = await fetchYoutubeTranscript(url);
      return finalize('yt:transcript', raw, st);
    }
    const raw = await fetchViaJina(url);
    const result = finalize(st === 'x' ? 'x:jina' : 'article:jina', raw, st);

    // Link-only tweet: the tweet body is just an outbound link (usually a t.co), so the
    // X capture comes back hollow. The real signal is the linked page — resolve the
    // shortener and fetch that; failing that, degrade to OG (which carries the linked
    // article's title) rather than ship an empty shell to the ranker.
    if (st === 'x' && result.status === 'miss') {
      const recovered = await recoverLinkOnlyTweet(raw, url);
      if (recovered) return recovered;
      const og = await ogFallback(url).catch(() => null);
      if (og) return og;
    }
    return result;
  } catch (primaryErr) {
    const primaryAdapter = st === 'youtube' ? 'yt:transcript' : 'jina';
    try {
      const og = await ogFallback(url);
      if (og) return og;
      return { status: 'error', adapter: 'fallback:og', title: '', text: '', charCount: 0, error: String(primaryErr) };
    } catch (fallbackErr) {
      return {
        status: 'error',
        adapter: primaryAdapter,
        title: '',
        text: '',
        charCount: 0,
        error: `${primaryErr instanceof Error ? primaryErr.message : primaryErr}; og: ${fallbackErr instanceof Error ? fallbackErr.message : fallbackErr}`,
      };
    }
  }
}

export { detectSourceType, normalizeUrl, extractUrl } from './normalize';
