const TIMEOUT_MS = 15_000;
const UA =
  'Mozilla/5.0 (compatible; SignalBrainBot/0.2; +https://github.com/thehahndev/signal-brain)';

function metaContent(html: string, key: string): string | null {
  // Match <meta property="og:title" content="..."> in either attribute order.
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']*)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${key}["']`, 'i'),
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) return decodeEntities(m[1]).trim();
  }
  return null;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;|&#x27;/gi, "'")
    .replace(/&#x2F;/gi, '/');
}

export interface OgResult {
  title: string;
  text: string;
}

/**
 * Last-resort degrade-to-metadata adapter: fetch the page HTML and pull OG/meta
 * title + description. Every primary adapter falls back here on failure so an item
 * always carries at least a headline, never an empty card.
 */
export async function fetchOgMetadata(url: string): Promise<OgResult> {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`OG fetch ${res.status}`);
  const html = await res.text();

  const title =
    metaContent(html, 'og:title') ||
    decodeEntities(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '').trim();
  const desc = metaContent(html, 'og:description') || metaContent(html, 'description') || '';

  return { title, text: desc };
}
