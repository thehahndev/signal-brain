/**
 * Run the digest pipeline locally. Default is a dry run (ranks + persists, prints the
 * digest, does NOT push to Telegram). Pass --send to actually push to the bot.
 * Run: npm run digest:local            (dry run)
 *      npm run digest:local -- --send  (push to Telegram)
 */
import { config } from 'dotenv';
config({ path: '.env.local' });
config(); // .env fallback (dotenv does not override already-set vars)
import { runDigest } from '../lib/digest/pipeline';

async function main() {
  const send = process.argv.includes('--send');
  const outcome = await runDigest({ force: true, dryRun: !send });

  if (outcome.messages) {
    for (const m of outcome.messages) console.log('\n' + m);
  }
  console.log('\n---');
  console.log({ status: outcome.status, runId: outcome.runId, itemCount: outcome.itemCount, reason: outcome.reason });
}

main().catch((err) => {
  console.error('✗', err);
  process.exit(1);
});
