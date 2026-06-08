import type { Item, RankedItem } from '../engine/types';
import type { RankRun } from '../engine/rank';
import type { InlineButton } from '../telegram/types';
import { escapeHtml } from '../telegram/send';
import { encodeCallback } from './callbacks';

export interface DigestMessage {
  text: string;
  buttons?: InlineButton[][];
  /** Set on READ cards so the pipeline can persist the returned telegram_message_id. */
  itemId?: string;
  disablePreview?: boolean;
}

function shortUrl(url: string): string {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

function dateLabel(d: Date): string {
  return new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).format(d);
}

/** Buttons for a READ card: 👍 gold / 👎 noise / → brain (Phase 3 closes these loops). */
function cardButtons(itemId: string): InlineButton[][] {
  return [
    [
      { text: '👍 gold', callback_data: encodeCallback('gold', itemId) },
      { text: '👎 noise', callback_data: encodeCallback('noise', itemId) },
    ],
    [{ text: '→ brain', callback_data: encodeCallback('brain', itemId) }],
  ];
}

/**
 * Build the PLAN §5 digest as a list of Telegram messages: a header with counts +
 * 🟢 opportunity badge, one message per READ card (so each carries its own buttons),
 * a terse SKIM block, a collapsed BURIED block, and the closure footer. Returns an
 * empty-state single message when the backlog is empty.
 */
export function assembleDigest(run: RankRun, items: Item[], now: Date = new Date()): DigestMessage[] {
  const byRef = new Map(items.map((i) => [i.ref, i]));
  const ranked = [...run.result.items].sort((a, b) => b.score - a.score);

  const reads = ranked.filter((r) => r.verdict === 'read');
  const skims = ranked.filter((r) => r.verdict === 'skim');
  const buries = ranked.filter((r) => r.verdict === 'bury');
  const opps = ranked.filter((r) => r.opportunity_flag).length;

  const messages: DigestMessage[] = [];

  // Header.
  const oppBadge = opps > 0 ? ` · 🟢 ${opps} opportunity` : '';
  messages.push({
    text:
      `<b>Signal</b> · ${dateLabel(now)}\n` +
      `${reads.length} read · ${skims.length} skim · ${buries.length} buried${oppBadge}`,
  });

  // READ cards — one message each, with buttons.
  for (const r of reads) {
    const it = byRef.get(r.id);
    if (!it) continue;
    const flag = r.opportunity_flag ? '🟢 ' : '';
    const title = escapeHtml(it.title || it.url);
    const claims = r.key_claims.map((c) => `• ${escapeHtml(c)}`).join('\n');
    const body =
      `${flag}<b>${title}</b>  <code>[${r.score}]</code>\n` +
      (claims ? `${claims}\n` : '') +
      `<i>${escapeHtml(r.why)}</i>\n` +
      `<a href="${escapeHtml(it.url)}">${escapeHtml(shortUrl(it.url))}</a>`;
    messages.push({ text: body, buttons: cardButtons(it.id), itemId: it.id, disablePreview: true });
  }

  // SKIM — one terse block.
  if (skims.length) {
    const lines = skims.map((r) => {
      const it = byRef.get(r.id);
      const flag = r.opportunity_flag ? '🟢 ' : '';
      const title = escapeHtml(it?.title || it?.url || r.id);
      return `${flag}• <b>${title}</b> — ${escapeHtml(r.why)}`;
    });
    messages.push({ text: `<b>SKIM</b>\n${lines.join('\n')}` });
  }

  // BURIED — collapsed count + compact, auditable list of reasons.
  if (buries.length) {
    const lines = buries.map((r) => {
      const it = byRef.get(r.id);
      const title = escapeHtml(it?.title || it?.url || r.id);
      return `• ${title} — ${escapeHtml(r.why)}`;
    });
    messages.push({ text: `🪦 <b>${buries.length} buried</b>\n<blockquote expandable>${lines.join('\n')}</blockquote>` });
  }

  // Closure footer.
  messages.push({ text: '✅ You’re caught up.' });

  return messages;
}

/** Counts for the `runs` row. */
export function digestCounts(ranked: RankedItem[]) {
  return {
    readCount: ranked.filter((r) => r.verdict === 'read').length,
    skimCount: ranked.filter((r) => r.verdict === 'skim').length,
    buryCount: ranked.filter((r) => r.verdict === 'bury').length,
    opportunityCount: ranked.filter((r) => r.opportunity_flag).length,
  };
}
