import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { clean, isFetchMiss } from './clean.ts';
import type { Item, SourceType } from './types.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(HERE, '..', '..', 'spike', 'out');

const ADAPTER_TO_SOURCE: Record<string, SourceType> = {
  'x:jina': 'x',
  'article:jina': 'article',
  'yt:transcript': 'youtube',
};

/** Header line: `<!-- source: URL | adapter: ADAPTER | N chars -->` */
function parseHeader(raw: string): { url: string; adapter: string } | null {
  const m = raw.match(/<!--\s*source:\s*(.*?)\s*\|\s*adapter:\s*(.*?)\s*\|/);
  if (!m) return null;
  return { url: m[1], adapter: m[2] };
}

/**
 * Load the real Phase-0 captures from spike/out as fixtures. Keeps the chosen
 * adapter capture per item; skips the `__fallback-og.md` duplicates.
 */
export function loadFixtures(): Item[] {
  const files = readdirSync(OUT_DIR).filter(
    (f) => f.endsWith('.md') && !f.endsWith('__fallback-og.md'),
  );

  const items: Item[] = [];
  for (const file of files) {
    const raw = readFileSync(join(OUT_DIR, file), 'utf8');
    const header = parseHeader(raw);
    if (!header) continue;

    const source_type = ADAPTER_TO_SOURCE[header.adapter] ?? 'other';
    const id = file.split('__')[0];
    const { title, text } = clean(raw, source_type);
    const fetch_miss = isFetchMiss(raw.length, raw);

    items.push({ id, ref: '', source_type, url: header.url, adapter: header.adapter, title, text, fetch_miss });
  }
  return items;
}
