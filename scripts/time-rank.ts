/**
 * READ-ONLY: load the current un-surfaced backlog, run the ranking call, and print
 * timing + verdicts. Does NOT persist or mark anything surfaced — safe to run against
 * prod without consuming the backlog. Verifies the latency cap + that taste holds.
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
config();
import { and, asc, eq, isNull } from 'drizzle-orm';
import { db } from '../lib/db/client';
import { items as itemsTable } from '../lib/db/schema';
import type { Item } from '../lib/engine/types';
import { rank } from '../lib/engine/rank';
import { loadRubric } from '../lib/engine/rubric';

async function main() {
  const rows = await db()
    .select()
    .from(itemsTable)
    .where(and(isNull(itemsTable.surfacedInRun), eq(itemsTable.fetchStatus, 'ok')))
    .orderBy(asc(itemsTable.capturedAt))
    .limit(40);

  const limitArg = Number(process.argv.find((a) => a.startsWith('--limit='))?.split('=')[1] ?? rows.length);
  const items: Item[] = rows.slice(0, limitArg).map((row, i) => ({
    id: row.id,
    ref: String(i + 1),
    source_type: row.sourceType,
    url: row.url,
    adapter: '',
    title: row.title ?? '',
    text: row.fullText ?? '',
    fetch_miss: false,
  }));

  const effort = (process.argv.find((a) => a.startsWith('--effort='))?.split('=')[1] ?? 'high') as
    | 'low'
    | 'medium'
    | 'high'
    | 'max';
  console.log(`Ranking ${items.length} backlog items (read-only, effort=${effort})…`);
  const t0 = Date.now();
  const run = await rank(items, { rubric: loadRubric(), timeoutMs: 200_000, effort });
  const secs = ((Date.now() - t0) / 1000).toFixed(1);

  const byRef = new Map(items.map((it) => [it.ref, it]));
  for (const r of [...run.result.items].sort((a, b) => b.score - a.score)) {
    const it = byRef.get(r.id);
    console.log(`  [${String(r.score).padStart(3)}] ${r.verdict.padEnd(4)} ${(it?.title || it?.url || r.id).slice(0, 70)}`);
  }
  console.log(`\n⏱  rank() completed in ${secs}s · out_tokens=${run.usage.output_tokens} · model=${run.model}`);
}

main().catch((e) => {
  console.error('✗', e);
  process.exit(1);
});
