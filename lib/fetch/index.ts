import { clean, isFetchMiss } from '../engine/clean';
import type { SourceType } from '../engine/types';
import type { FetchStatus } from '../db/schema';
import { detectSourceType } from './normalize';
import { fetchViaJina } from './jina';
import { fetchYoutubeTranscript } from './youtube';
import { fetchOgMetadata } from './fallback';

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
  return { status: 'ok', adapter, title, text, charCount: text.length };
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
    return finalize(st === 'x' ? 'x:jina' : 'article:jina', raw, st);
  } catch (primaryErr) {
    const primaryAdapter = st === 'youtube' ? 'yt:transcript' : 'jina';
    try {
      const og = await fetchOgMetadata(url);
      const text = (og.text || og.title).trim();
      if (!text) {
        return { status: 'error', adapter: 'fallback:og', title: og.title, text: '', charCount: 0, error: String(primaryErr) };
      }
      return { status: 'ok', adapter: 'fallback:og', title: og.title, text, charCount: text.length };
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
