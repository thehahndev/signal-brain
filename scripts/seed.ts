/**
 * Seed the local Neon dev branch with the 18 real Phase-0 captures (already fetched
 * + cleaned), so the digest pipeline can be exercised end-to-end without network.
 * Run: npm run seed:local
 */
import 'dotenv/config';
import { db } from '../lib/db/client';
import { items as itemsTable } from '../lib/db/schema';
import { loadFixtures } from '../engine/src/fixtures';

async function main() {
  const fixtures = loadFixtures().filter((f) => !f.fetch_miss);
  let inserted = 0;
  for (const f of fixtures) {
    const [row] = await db()
      .insert(itemsTable)
      .values({
        url: f.url,
        sourceType: f.source_type,
        title: f.title || null,
        fullText: f.text,
        charCount: f.text.length,
        fetchStatus: 'ok',
        fetchedAt: new Date(),
      })
      .onConflictDoNothing({ target: itemsTable.url })
      .returning({ id: itemsTable.id });
    if (row) inserted++;
  }
  console.log(`Seeded ${inserted} new items (${fixtures.length - inserted} already present).`);
}

main().catch((err) => {
  console.error('✗', err);
  process.exit(1);
});
