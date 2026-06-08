import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFixtures } from './fixtures.ts';
import { rank, DEFAULT_MODEL } from '../../lib/engine/rank.ts';
import { renderDigest } from './render.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const RUBRIC_PATH = join(HERE, '..', '..', 'rubric.md');

interface Flags {
  json: boolean;
  limit: number | null;
  model: string;
}

function parseFlags(argv: string[]): Flags {
  const flags: Flags = { json: false, limit: null, model: DEFAULT_MODEL };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') flags.json = true;
    else if (a === '--limit') flags.limit = Number(argv[++i]);
    else if (a === '--model') flags.model = argv[++i];
  }
  return flags;
}

async function main() {
  const flags = parseFlags(process.argv.slice(2));

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('✗ ANTHROPIC_API_KEY not set. Copy .env.example to .env and fill it in.');
    process.exit(1);
  }

  let items = loadFixtures();
  const misses = items.filter((i) => i.fetch_miss);
  items = items.filter((i) => !i.fetch_miss);
  if (flags.limit) items = items.slice(0, flags.limit);
  // Assign short, contiguous refs — the model echoes these reliably; long ids get mangled.
  items = items.map((it, i) => ({ ...it, ref: String(i + 1) }));

  console.error(
    `Loaded ${items.length} items for ranking` +
      (misses.length ? ` (excluded ${misses.length} fetch-miss: ${misses.map((m) => m.id).join(', ')})` : '') +
      `. Calling ${flags.model}…`,
  );

  const rubric = readFileSync(RUBRIC_PATH, 'utf8');
  const run = await rank(items, { rubric, model: flags.model });

  if (flags.json) {
    console.log(JSON.stringify(run.result, null, 2));
    console.error(`\ntokens: in=${run.usage.input_tokens} out=${run.usage.output_tokens}`);
  } else {
    console.log('\n' + renderDigest(run, items));
  }
}

main().catch((err) => {
  console.error('✗', err instanceof Error ? err.message : err);
  process.exit(1);
});
