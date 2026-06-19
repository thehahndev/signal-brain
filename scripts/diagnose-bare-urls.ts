/**
 * Diagnostic for the "buried bare URL" symptom: items that reach the ranker as
 * fetch_status='ok' but carry empty/contentless bodies — typically because a link
 * shortener (t.co, bit.ly, lnkd.in, …) was stored and fetched instead of the real
 * destination URL.
 *
 * Usage:
 *   npx tsx scripts/diagnose-bare-urls.ts            # inspect the latest non-empty run
 *   npx tsx scripts/diagnose-bare-urls.ts <run-id>   # inspect a specific run
 *   npx tsx scripts/diagnose-bare-urls.ts --scan     # scan ALL items for the anomaly
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
config();
import { desc, eq, gt, isNotNull } from 'drizzle-orm';
import { db } from '../lib/db/client';
import { runs as runsTable, items as itemsTable, type ItemRow } from '../lib/db/schema';

/** Known link shorteners — a stored URL on one of these was never unwrapped. */
const SHORTENER_HOSTS = new Set([
  't.co',
  'bit.ly',
  'buff.ly',
  'lnkd.in',
  'ow.ly',
  'tinyurl.com',
  'trib.al',
  'dlvr.it',
  'youtu.be', // legitimate, but flagged so it's visible in the scan
]);

function host(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '(unparseable)';
  }
}

/** The two failure modes we're hunting, flagged per item for at-a-glance triage. */
function flags(row: ItemRow): string[] {
  const out: string[] = [];
  const h = host(row.url);
  if (SHORTENER_HOSTS.has(h)) out.push(`SHORTENER(${h})`);
  const textLen = row.fullText?.trim().length ?? 0;
  if (row.fetchStatus === 'ok' && textLen < 200) out.push(`OK-BUT-EMPTY(${textLen}c)`);
  if (row.fetchStatus === 'ok' && !row.title?.trim()) out.push('NO-TITLE');
  return out;
}

function dump(row: ItemRow): void {
  const textLen = row.fullText?.trim().length ?? 0;
  const f = flags(row);
  console.log(`\n  • ${row.url}`);
  console.log(`    source_type=${row.sourceType}  fetch_status=${row.fetchStatus}  char_count=${row.charCount ?? '∅'}  full_text_len=${textLen}`);
  console.log(`    title:    ${JSON.stringify(row.title ?? null)}`);
  if (row.fetchError) console.log(`    fetch_error: ${row.fetchError}`);
  if (textLen) console.log(`    full_text[0..200]: ${JSON.stringify(row.fullText!.trim().slice(0, 200))}`);
  if (row.verdict) console.log(`    verdict=${row.verdict}  score=${row.score ?? '∅'}`);
  if (row.why) console.log(`    why: ${row.why}`);
  if (f.length) console.log(`    ⚠ FLAGS: ${f.join('  ')}`);
}

async function inspectRun(runId?: string): Promise<void> {
  const d = db();

  let run;
  if (runId) {
    [run] = await d.select().from(runsTable).where(eq(runsTable.id, runId)).limit(1);
    if (!run) {
      console.error(`✗ No run with id=${runId}`);
      process.exit(1);
    }
  } else {
    // Latest run that actually ranked something.
    [run] = await d
      .select()
      .from(runsTable)
      .where(gt(runsTable.itemCount, 0))
      .orderBy(desc(runsTable.createdAt))
      .limit(1);
    if (!run) {
      console.error('✗ No runs with item_count > 0 found.');
      process.exit(1);
    }
  }

  console.log(
    `\nRun ${run.id}\n  created=${run.createdAt?.toISOString?.() ?? run.createdAt}  key=${run.idempotencyKey}  status=${run.status}` +
      `  items=${run.itemCount} (read ${run.readCount} / skim ${run.skimCount} / bury ${run.buryCount})`,
  );

  const rows = await d
    .select()
    .from(itemsTable)
    .where(eq(itemsTable.surfacedInRun, run.id))
    .orderBy(itemsTable.capturedAt);

  console.log(`\nItems surfaced in this run (${rows.length}):`);
  for (const row of rows) dump(row);

  const flagged = rows.filter((r) => flags(r).length);
  console.log(
    `\nSummary: ${flagged.length}/${rows.length} item(s) flagged` +
      (flagged.length ? ` — likely root cause: shortener URLs stored/fetched unresolved.` : ` — no anomaly detected.`),
  );
}

async function scanAll(): Promise<void> {
  const d = db();
  const rows = await d
    .select()
    .from(itemsTable)
    .where(isNotNull(itemsTable.url))
    .orderBy(desc(itemsTable.capturedAt));

  const flagged = rows.filter((r) => flags(r).length);
  console.log(`\nScanned ${rows.length} item(s); ${flagged.length} flagged:\n`);
  for (const row of flagged) dump(row);

  // Host histogram for the flagged set — shows which shorteners dominate.
  const byHost = new Map<string, number>();
  for (const r of flagged) byHost.set(host(r.url), (byHost.get(host(r.url)) ?? 0) + 1);
  console.log('\nFlagged hosts:');
  for (const [h, n] of [...byHost.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${n.toString().padStart(3)}  ${h}`);
  }
}

async function main() {
  const arg = process.argv[2];
  if (arg === '--scan') return scanAll();
  return inspectRun(arg);
}

main().catch((e) => {
  console.error('✗', e);
  process.exit(1);
});
