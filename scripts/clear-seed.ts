/**
 * Delete ONLY the seed fixtures (the spike/out captures inserted by seed.ts), matched
 * by their exact URLs. Leaves any real captures and all run rows untouched.
 * Run: npm run seed:clear
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
config(); // .env fallback (dotenv does not override already-set vars)
import { inArray } from 'drizzle-orm';
import { db } from '../lib/db/client';
import { items as itemsTable } from '../lib/db/schema';
import { loadFixtures } from '../engine/src/fixtures';

async function main() {
  const seedUrls = loadFixtures().map((f) => f.url);
  const deleted = await db()
    .delete(itemsTable)
    .where(inArray(itemsTable.url, seedUrls))
    .returning({ url: itemsTable.url });
  console.log(`Cleared ${deleted.length} seed-fixture items (live captures + runs left intact).`);
}

main().catch((err) => {
  console.error('✗', err);
  process.exit(1);
});
