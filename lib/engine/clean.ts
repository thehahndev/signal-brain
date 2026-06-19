import type { SourceType } from './types';

/**
 * Thin heuristic cleaner for Jina/transcript captures. The Jina markdown carries
 * heavy interleaved chrome (nav menus, login/signup, "Trending now", "Relevant
 * people", cookie footers — the 47k-char article fixture is mostly this). We strip
 * the gross noise so the ranking call spends tokens on substance, not chrome.
 * It does NOT need to be perfect — Sonnet tolerates residue; this is about tokens
 * and gross distraction. Tune the marker lists as calibration surfaces misses.
 */

/** Cut everything from the first marker onward — these reliably sit AFTER real content. */
const TAIL_MARKERS = [
  '## New to X?',
  '## Relevant people',
  '# Trending now',
  "## What's happening",
  '### Cookie settings',
  '## Related posts',
  'Get the developer newsletter',
  'By signing up, you agree',
];

/** Whole lines dropped if (trimmed) they exactly match one of these. */
const DROP_EXACT = new Set([
  "Don't miss what's happening",
  'People on X are the first to know.',
  'Log in',
  'Sign up',
  'See new posts',
  '## Post',
  '# Conversation',
  'New to X?',
  'Sign up with Apple',
  'Create account',
  'Explore here',
  'No items found.',
  'Show more',
  '·',
]);

const MAX_CHARS = 12000; // cap per item to bound token cost during calibration

function isNoiseLine(trimmed: string): boolean {
  if (!trimmed) return false; // keep blanks; collapsed later
  if (DROP_EXACT.has(trimmed)) return true;
  if (/^!\[/.test(trimmed)) return true; // image
  if (/^\[!\[/.test(trimmed)) return true; // linked image
  if (/^#+\s*\[\]/.test(trimmed)) return true; // empty heading link "# []"
  if (/^\*?\s*\[[^\]]*\]\([^)]*\)\s*$/.test(trimmed)) return true; // link-only line
  if (/^\d[\d.,]*[KM]?$/.test(trimmed)) return true; // lone engagement count
  if (/Views\]\(/.test(trimmed)) return true; // view-count link
  if (/^Read \d/.test(trimmed)) return true; // "Read 48 replies"
  if (/^Log\s?in\s?Sign\s?up$/i.test(trimmed)) return true; // run-together X login wall
  return false;
}

/** Pull the `Title:` value (X titles span to `/ X`; articles to `URL Source:`). */
function extractTitle(raw: string): string {
  const m = raw.match(/Title:\s*([\s\S]*?)(?:\n\s*URL Source:|\/ X\b)/);
  if (!m) return '';
  return m[1].replace(/\s+/g, ' ').trim();
}

export interface CleanResult {
  title: string;
  text: string;
}

export function clean(raw: string, _sourceType: SourceType): CleanResult {
  const title = extractTitle(raw);

  // Prefer the body after `Markdown Content:` (Jina), else everything after the
  // `Published Time:` header line, else the whole thing (YouTube transcripts).
  let body = raw;
  const mdIdx = raw.indexOf('Markdown Content:');
  if (mdIdx !== -1) {
    body = raw.slice(mdIdx + 'Markdown Content:'.length);
  } else {
    const pubMatch = raw.match(/Published Time:.*\n/);
    if (pubMatch) body = raw.slice((pubMatch.index ?? 0) + pubMatch[0].length);
  }

  // Truncate at the earliest tail marker present.
  let cut = body.length;
  for (const marker of TAIL_MARKERS) {
    const i = body.indexOf(marker);
    if (i !== -1 && i < cut) cut = i;
  }
  body = body.slice(0, cut);

  const lines = body.split('\n');
  const kept: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (isNoiseLine(trimmed)) continue;
    // Strip inline images and reduce markdown links to their anchor text.
    const cleaned = trimmed
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .trim();
    kept.push(cleaned);
  }

  // Collapse runs of blank lines.
  let text = kept.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  if (text.length > MAX_CHARS) {
    text = text.slice(0, MAX_CHARS) + '\n…[truncated]';
  }
  return { title, text };
}

/** Deleted/missing page guard (scorecard: ~<700 chars + "cached snapshot"). */
export function isFetchMiss(rawChars: number, raw: string): boolean {
  return rawChars < 700 && /cached snapshot/i.test(raw);
}

/**
 * Count of "real" characters — text with URLs and whitespace removed. A link-only
 * tweet ("# mem0 on X: \"https://t.co/…\" / X  Log inSign up") nets only a couple
 * dozen here, which lets the fetch layer reject it as a hollow capture instead of
 * stamping it `ok` and shipping a bare URL to the ranker.
 */
export function substanceLength(text: string): number {
  return text
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\s+/g, '')
    .length;
}
