import { and, asc, eq, isNull } from 'drizzle-orm';
import { db } from '../db/client';
import { items as itemsTable, runs as runsTable } from '../db/schema';
import type { Item } from '../engine/types';
import { rank } from '../engine/rank';
import { loadRubric } from '../engine/rubric';
import { costUsd, tokenRecord } from '../engine/cost';
import { sendMessage } from '../telegram/send';
import { assembleDigest, digestCounts } from './assemble';

/** Cap the backlog per run so the ranking call stays bounded if captures pile up. */
const MAX_BACKLOG = 40;

export interface DigestOptions {
  /** Bypass the one-per-day idempotency guard (local/manual re-runs). */
  force?: boolean;
  now?: Date;
  model?: string;
  /** Rank + persist as usual but print the digest instead of pushing to Telegram. */
  dryRun?: boolean;
}

export interface DigestOutcome {
  status: 'ok' | 'empty' | 'skipped' | 'error';
  runId?: string;
  itemCount?: number;
  reason?: string;
  /** Assembled message texts (populated on dryRun for local inspection). */
  messages?: string[];
}

function dayKey(now: Date, force: boolean): string {
  if (force) return `digest:${now.toISOString()}`; // unique each run
  return `digest:${now.toISOString().slice(0, 10)}`; // digest:YYYY-MM-DD
}

/**
 * The daily pipeline: claim today's run (idempotency-keyed), rank the rolling
 * un-surfaced backlog, persist verdicts, push the digest, and mark items surfaced.
 * Fetch already happened at capture time (single full-extract), so this only ranks.
 */
export async function runDigest(opts: DigestOptions = {}): Promise<DigestOutcome> {
  const now = opts.now ?? new Date();
  const d = db();

  // 1. Claim the run — the unique idempotency key is the real concurrency guard.
  let runId: string;
  try {
    const [run] = await d
      .insert(runsTable)
      .values({ idempotencyKey: dayKey(now, opts.force ?? false), status: 'ok' })
      .returning({ id: runsTable.id });
    runId = run.id;
  } catch (err) {
    if (String(err).includes('idempotency') || String(err).toLowerCase().includes('unique')) {
      return { status: 'skipped', reason: 'a digest already ran for this period' };
    }
    throw err;
  }

  try {
    // 2. Load the rolling backlog (un-surfaced, successfully fetched).
    const rows = await d
      .select()
      .from(itemsTable)
      .where(and(isNull(itemsTable.surfacedInRun), eq(itemsTable.fetchStatus, 'ok')))
      .orderBy(asc(itemsTable.capturedAt))
      .limit(MAX_BACKLOG);

    if (rows.length === 0) {
      await d.update(runsTable).set({ status: 'empty' }).where(eq(runsTable.id, runId));
      const text = '✅ You’re caught up. Nothing new in the backlog.';
      if (!opts.dryRun) await sendMessage(text);
      return { status: 'empty', runId, itemCount: 0, messages: [text] };
    }

    // 3. Build engine Items with short refs (the model echoes these reliably).
    const items: Item[] = rows.map((row, i) => ({
      id: row.id,
      ref: String(i + 1),
      source_type: row.sourceType,
      url: row.url,
      adapter: '',
      title: row.title ?? '',
      text: row.fullText ?? '',
      fetch_miss: false,
    }));

    // 4. Rank the whole batch in one call (clustering needs to see everything).
    const run = await rank(items, { rubric: loadRubric(), model: opts.model });
    const byRef = new Map(items.map((it) => [it.ref, it]));

    // 5. Persist verdicts + mark surfaced (read/skim/bury all leave the backlog).
    for (const r of run.result.items) {
      const it = byRef.get(r.id);
      if (!it) continue;
      await d
        .update(itemsTable)
        .set({
          score: r.score,
          signalOrHype: r.signal_or_hype,
          verdict: r.verdict,
          opportunityFlag: r.opportunity_flag,
          clusterId: r.cluster_id,
          why: r.why,
          keyClaims: r.key_claims,
          rankedAt: now,
          surfacedInRun: runId,
        })
        .where(eq(itemsTable.id, it.id));
    }

    // 6. Assemble + push the digest; record message ids for READ cards (Phase-3 edits).
    const messages = assembleDigest(run, items, now);
    for (const msg of messages) {
      if (opts.dryRun) continue;
      const messageId = await sendMessage(msg.text, {
        buttons: msg.buttons,
        disablePreview: msg.disablePreview ?? true,
      });
      if (msg.itemId) {
        await d
          .update(itemsTable)
          .set({ telegramMessageId: messageId })
          .where(eq(itemsTable.id, msg.itemId));
      }
    }

    // 7. Finalize the run row.
    const counts = digestCounts(run.result.items);
    await d
      .update(runsTable)
      .set({
        status: 'ok',
        itemCount: items.length,
        model: run.model,
        tokens: tokenRecord(run.usage),
        costUsd: costUsd(run.usage, run.model).toFixed(4),
        ...counts,
      })
      .where(eq(runsTable.id, runId));

    return { status: 'ok', runId, itemCount: items.length, messages: messages.map((m) => m.text) };
  } catch (err) {
    await d
      .update(runsTable)
      .set({ status: 'error' })
      .where(eq(runsTable.id, runId))
      .catch(() => {});
    return { status: 'error', runId, reason: err instanceof Error ? err.message : String(err) };
  }
}
