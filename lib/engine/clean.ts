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
  if (/^\d[\d.,KM]*(\s+\d[\d.,KM]*)*$/.test(trimmed)) return true; // engagement-count row(s): "1.2K" or "1 4 14"
  if (/Views\]\(/.test(trimmed)) return true; // view-count link
  if (/^Read \d/.test(trimmed)) return true; // "Read 48 replies"
  if (/^Log\s?in\s?Sign\s?up$/i.test(trimmed)) return true; // run-together X login wall
  if (/^#\s+.*\bon X:.*\/\s*X\s*$/i.test(trimmed)) return true; // X tweet-title heading "# foo on X: ... / X"
  return false;
}

/** Pull the `Title:` value (X titles span to `/ X`; articles to `URL Source:`). */
function extractTitle(raw: string): string {
  const m = raw.match(/Title:\s*([\s\S]*?)(?:\n\s*URL Source:|\/ X\b)/);
  if (!m) return '';
  return m[1].replace(/\s+/g, ' ').trim();
}

/**
 * An X long-form-article link renders in the tweet capture as an image-link card:
 * `[![…Article cover image](img) Article <title> <excerpt…>](https://x.com/i/article/…)`.
 * `clean()` would otherwise drop the whole line as a linked image, discarding the real
 * content. Pull the title+excerpt text out so the ranker sees substance, not a bare URL.
 */
const ARTICLE_CARD_RE =
  /\]\([^)]*\)\s*Article\s+([\s\S]*?)\]\(https?:\/\/[^)\s]*\/i\/article\/[^)\s]*\)/i;

function articleCardText(raw: string): string | null {
  const m = raw.match(ARTICLE_CARD_RE);
  if (!m) return null;
  const t = m[1].replace(/\s+/g, ' ').trim();
  return t || null;
}

/** A tweet "title" whose quoted text is just a link (e.g. `mem0 on X: "https://t.co/…"`). */
function isBareUrlTitle(title: string): boolean {
  return /"\s*https?:\/\/\S+\s*"/.test(title) || /^\s*https?:\/\/\S+\s*$/.test(title);
}

/** A display headline from the article-card text: the leading words, capped at ~70 chars. */
function leadTitle(s: string): string {
  let out = '';
  for (const w of s.split(/\s+/)) {
    if (out && (out + ' ' + w).length > 70) break;
    out = out ? `${out} ${w}` : w;
  }
  return out || s.slice(0, 70);
}

export interface CleanResult {
  title: string;
  text: string;
}

export function clean(raw: string, _sourceType: SourceType): CleanResult {
  let title = extractTitle(raw);

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
    // Re-test after reduction: concatenated chrome links (e.g. `[Log in](…)[Sign up](…)`)
    // only collapse to noise ("Log inSign up") once the link syntax is gone.
    if (isNoiseLine(cleaned)) continue;
    kept.push(cleaned);
  }

  // Collapse runs of blank lines.
  let text = kept.join('\n').replace(/\n{3,}/g, '\n\n').trim();

  // Recover the embedded X-article card (title+excerpt) that the linked-image filter
  // dropped. For a link-only tweet this is the only real content; prepend it so it
  // leads the body, and borrow it for the title when the tweet's own title is a bare URL.
  const card = articleCardText(raw);
  if (card) {
    text = text ? `${card}\n\n${text}` : card;
    if (!title || isBareUrlTitle(title)) title = leadTitle(card);
  }

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
