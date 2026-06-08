import { eq } from 'drizzle-orm';
import { db } from './db/client';
import { items as itemsTable } from './db/schema';
import { fetchItem } from './fetch';
import { normalizeUrl, detectSourceType } from './fetch/normalize';

export interface CaptureResult {
  outcome: 'captured' | 'fetch-failed' | 'duplicate' | 'no-url';
  url?: string;
  title?: string;
}

/**
 * Capture one shared URL: normalize → dedup-insert (url is unique) → single
 * full-extract fetch → persist. Returns a result the webhook turns into a one-line
 * confirmation. Designed to run inside `waitUntil` after the webhook has already
 * acked Telegram, so the Jina fetch never blocks the 200.
 */
export async function captureUrl(rawUrl: string): Promise<CaptureResult> {
  const url = normalizeUrl(rawUrl);
  const sourceType = detectSourceType(url);
  const d = db();

  // Dedup on the unique URL — a repeated share is a no-op.
  const [inserted] = await d
    .insert(itemsTable)
    .values({ url, sourceType, fetchStatus: 'pending' })
    .onConflictDoNothing({ target: itemsTable.url })
    .returning({ id: itemsTable.id });

  if (!inserted) {
    const [existing] = await d
      .select({ title: itemsTable.title })
      .from(itemsTable)
      .where(eq(itemsTable.url, url))
      .limit(1);
    return { outcome: 'duplicate', url, title: existing?.title ?? undefined };
  }

  const result = await fetchItem(url, sourceType);
  await d
    .update(itemsTable)
    .set({
      fetchStatus: result.status,
      fetchError: result.error ?? null,
      title: result.title || null,
      fullText: result.text || null,
      charCount: result.charCount,
      fetchedAt: new Date(),
    })
    .where(eq(itemsTable.id, inserted.id));

  if (result.status === 'ok') return { outcome: 'captured', url, title: result.title };
  return { outcome: 'fetch-failed', url, title: result.title };
}
