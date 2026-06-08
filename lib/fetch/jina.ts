const JINA_BASE = 'https://r.jina.ai/';
const TIMEOUT_MS = 25_000;

/**
 * Fetch a URL's full content via Jina Reader (locked in Phase 0 for X + articles:
 * free, ~460ms, full bodies incl. X-article text). Returns the raw markdown, which
 * begins with the `Title: … / URL Source: … Markdown Content:` header that clean()
 * knows how to strip. Optional JINA_API_KEY lifts the free rate limit.
 */
export async function fetchViaJina(url: string): Promise<string> {
  const headers: Record<string, string> = { 'X-Return-Format': 'markdown' };
  if (process.env.JINA_API_KEY) headers.Authorization = `Bearer ${process.env.JINA_API_KEY}`;

  const res = await fetch(JINA_BASE + url, {
    headers,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`Jina ${res.status} ${res.statusText}`);
  }
  return res.text();
}
