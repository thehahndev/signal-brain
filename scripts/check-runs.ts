/** Diagnostic: list the most recent digest runs + current backlog size. */
import { config } from 'dotenv';
config({ path: '.env.local' });
config();
import { desc, isNull, and, eq, sql } from 'drizzle-orm';
import { db } from '../lib/db/client';
import { runs as runsTable, items as itemsTable } from '../lib/db/schema';

async function main() {
  const recent = await db().select().from(runsTable).orderBy(desc(runsTable.createdAt)).limit(10);
  console.log(`\nNow (UTC): ${new Date().toISOString()}`);
  console.log(`\nLast ${recent.length} runs:`);
  for (const r of recent) {
    console.log(
      `  ${r.createdAt?.toISOString?.() ?? r.createdAt}  key=${r.idempotencyKey}  status=${r.status}  items=${r.itemCount} (r${r.readCount}/s${r.skimCount}/b${r.buryCount})`,
    );
  }

  const backlog = await db()
    .select({ url: itemsTable.url, capturedAt: itemsTable.capturedAt, status: itemsTable.fetchStatus })
    .from(itemsTable)
    .where(and(isNull(itemsTable.surfacedInRun), eq(itemsTable.fetchStatus, 'ok')))
    .orderBy(itemsTable.capturedAt);
  console.log(`\nUn-surfaced fetched backlog (${backlog.length}):`);
  for (const b of backlog) {
    console.log(`  ${b.capturedAt?.toISOString?.() ?? b.capturedAt}  ${b.url.slice(0, 70)}`);
  }
}

main().catch((e) => {
  console.error('✗', e);
  process.exit(1);
});
