const TIMEOUT_MS = 10_000;
const MAX_HOPS = 5;
const UA =
  'Mozilla/5.0 (compatible; SignalBrainBot/0.2; +https://github.com/thehahndev/signal-brain)';

/**
 * Follow a shortener (t.co, bit.ly, …) to its final destination by chasing redirect
 * `Location` headers manually with HEAD requests — cheap, no body download. Falls back
 * to a redirect-following GET if HEAD isn't honoured. Returns the original URL if it
 * can't resolve (caller then degrades gracefully), never throws.
 */
export async function resolveUrl(url: string): Promise<string> {
  let current = url;

  for (let hop = 0; hop < MAX_HOPS; hop++) {
    let res: Response;
    try {
      res = await fetch(current, {
        method: 'HEAD',
        redirect: 'manual',
        headers: { 'User-Agent': UA },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch {
      return current;
    }

    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location');
      if (!loc) return current;
      try {
        current = new URL(loc, current).toString();
      } catch {
        return current;
      }
      continue;
    }

    // Not a redirect. If HEAD wasn't honoured (e.g. 405), try one GET that follows
    // redirects and read the resolved URL off the response.
    if (res.status === 405 || res.status === 403) {
      try {
        const get = await fetch(current, {
          method: 'GET',
          redirect: 'follow',
          headers: { 'User-Agent': UA },
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        return get.url || current;
      } catch {
        return current;
      }
    }

    return current;
  }

  return current;
}
