import { after } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/client';
import { items as itemsTable } from '@/lib/db/schema';
import { captureUrl } from '@/lib/capture';
import { extractUrl } from '@/lib/fetch/normalize';
import { verifyWebhookSecret, isAllowedChat } from '@/lib/telegram/verify';
import { sendMessage, answerCallback } from '@/lib/telegram/send';
import { decodeCallback } from '@/lib/digest/callbacks';
import type { TelegramUpdate } from '@/lib/telegram/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Telegram bot webhook: inbound shares (capture) + button callbacks (feedback). */
export async function POST(req: Request): Promise<Response> {
  if (!verifyWebhookSecret(req)) {
    return new Response('unauthorized', { status: 401 });
  }

  let update: TelegramUpdate;
  try {
    update = (await req.json()) as TelegramUpdate;
  } catch {
    return new Response('ok'); // malformed — ack so Telegram stops retrying
  }

  if (update.callback_query) {
    await handleCallback(update);
    return new Response('ok');
  }

  const message = update.message;
  if (!message || !isAllowedChat(message.chat?.id)) {
    return new Response('ok'); // ignore non-allow-listed chats and non-message updates
  }

  const url = message.text ? extractUrl(message.text) : null;
  if (!url) {
    after(async () => {
      await sendMessage('Send me a link (X, YouTube, or an article) and I’ll queue it for the next digest.').catch(() => {});
    });
    return new Response('ok');
  }

  // Ack Telegram immediately; fetch + confirm after the response (Jina must not block the 200).
  after(async () => {
    try {
      const res = await captureUrl(url);
      // Never echo a bare URL as if it were a headline — a title that's just a link
      // means the capture was hollow, so show no title rather than a misleading one.
      const headline = res.title && !/^\s*https?:\/\/\S+\s*$/.test(res.title) ? res.title : '';
      const title = headline ? `: ${headline.slice(0, 120)}` : '';
      const msg =
        res.outcome === 'captured'
          ? `✓ Captured${title}`
          : res.outcome === 'duplicate'
            ? `↩︎ Already captured${title}`
            : res.outcome === 'fetch-failed'
              ? `⚠ Saved the link, but couldn’t fetch it cleanly${title}`
              : '⚠ No link found.';
      await sendMessage(msg);
    } catch (err) {
      await sendMessage(`⚠ Capture failed: ${err instanceof Error ? err.message : String(err)}`).catch(() => {});
    }
  });

  return new Response('ok');
}

/** Phase-2 feedback: store gold/noise on the item + ack. (Rubric commit-back is Phase 3.) */
async function handleCallback(update: TelegramUpdate): Promise<void> {
  const cq = update.callback_query!;
  if (!isAllowedChat(cq.message?.chat?.id ?? cq.from?.id)) {
    await answerCallback(cq.id).catch(() => {});
    return;
  }

  const parsed = decodeCallback(cq.data);
  if (!parsed) {
    await answerCallback(cq.id).catch(() => {});
    return;
  }

  try {
    if (parsed.kind === 'gold' || parsed.kind === 'noise') {
      await db().update(itemsTable).set({ feedback: parsed.kind }).where(eq(itemsTable.id, parsed.itemId));
      await answerCallback(cq.id, parsed.kind === 'gold' ? '👍 Marked gold' : '👎 Marked noise');
    } else {
      // → brain: Phase 3 tags this as gold into dev-brain. For now, acknowledge.
      await answerCallback(cq.id, '→ brain (coming in Phase 3)');
    }
  } catch (err) {
    await answerCallback(cq.id, `⚠ ${err instanceof Error ? err.message : 'error'}`).catch(() => {});
  }
}
