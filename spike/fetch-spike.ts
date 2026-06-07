/**
 * Phase 0 — Fetch Spike (THROWAWAY, delete after Phase 0).
 *
 * One job: prove we can retrieve full, clean content for the real source mix —
 * especially X threads — reliably and for cents, BEFORE building anything.
 *
 * Run:  cd spike && npm install && npm run spike
 * Output: spike/scorecard.md  (fill the `whole?` column by eye — that's the real bar)
 *         spike/out/<id>__<adapter>.md  (full captured text per URL+adapter, for the
 *           wholeness/cleanliness check — compare against the live source)
 *
 * See ../docs/phase-0-fetch-spike.md for the spec, success bars, and decision rule.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type SourceType = "x" | "youtube" | "article" | "pdf" | "other";

type TestUrl = { url: string; type: SourceType; note: string };

type AdapterResult = { text: string | null; estCostUsd: number; failure?: string };
type Adapter = (url: string) => Promise<AdapterResult>;

type FetchResult = {
  url: string;
  type: SourceType;
  note: string;
  adapter: string;
  ok: "yes" | "partial" | "no";
  chars: number;
  latencyMs: number;
  estCostUsd: number;
  firstChars: string; // first ~200 chars, for eyeballing
  failure?: string;
  whole: ""; // HUMAN fills after: was the WHOLE thread captured, clean? (Y / N)
};

// ---------------------------------------------------------------------------
// Config / env  (see .env.example). Loaded best-effort from spike/.env
// ---------------------------------------------------------------------------
await loadDotEnv(join(HERE, ".env"));
const env = process.env;

// Rough per-call cost guesses — REPLACE with real figures from each vendor's pricing.
const COST = {
  jina: 0, // free tier
  firecrawl: 0.001, // ~$/scrape, approximate
  twitterapiPerTweet: 0.00015, // ~$/tweet, approximate — verify
  og: 0,
  youtube: 0,
  pdf: 0,
};

// ---------------------------------------------------------------------------
// Adapters — each returns the extracted text (or null) + an est. cost.
// Add/swap candidates here; the spike is about comparing them.
// ---------------------------------------------------------------------------

/** Jina Reader: GET https://r.jina.ai/<url> -> markdown. Cheap baseline for anything. */
const jina: Adapter = async (url) => {
  const key = env.JINA_KEY;
  const res = await fetch("https://r.jina.ai/" + url, {
    headers: {
      Accept: "text/plain",
      "X-Return-Format": "markdown",
      ...(key ? { Authorization: `Bearer ${key}` } : {}),
    },
  });
  if (!res.ok) return { text: null, estCostUsd: COST.jina, failure: `jina HTTP ${res.status}` };
  return { text: await res.text(), estCostUsd: COST.jina };
};

/** Firecrawl scrape v1: POST /v1/scrape -> data.markdown. Needs FIRECRAWL_KEY. */
const firecrawl: Adapter = async (url) => {
  const key = env.FIRECRAWL_KEY;
  if (!key) return { text: null, estCostUsd: 0, failure: "no FIRECRAWL_KEY" };
  const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
  });
  if (!res.ok) return { text: null, estCostUsd: COST.firecrawl, failure: `firecrawl HTTP ${res.status}` };
  const json: any = await res.json();
  return { text: json?.data?.markdown ?? null, estCostUsd: COST.firecrawl };
};

/**
 * twitterapi.io — THE CRUX. Validating this is the whole point of the spike.
 *
 * Verified against https://docs.twitterapi.io (2026-06-07):
 *   - thread/conversation endpoint: GET /twitter/tweet/thread_context?tweetId={id}
 *     (the old default hit /twitter/tweets — single head tweet only, which is why
 *      every "yes" was ~500 chars and X-articles came back as a bare t.co link)
 *   - auth header: X-API-Key
 *   - response: { replies: [{ text, ... }], has_next_page, next_cursor }
 *   - pagination: pass &cursor=<next_cursor> while has_next_page — we follow it so a
 *     long thread isn't capped at one ~20-reply page (the whole point of the depth test).
 * Still shape-agnostic: harvestText() pulls every text-ish field, so a thread that's
 * *present* in the JSON is captured even if the shape drifts.
 * Override the base endpoint via env TWITTERAPI_IO_ENDPOINT (use {id} as placeholder).
 */
const xTwitterApi: Adapter = async (url) => {
  const key = env.TWITTERAPI_IO_KEY;
  if (!key) return { text: null, estCostUsd: 0, failure: "no TWITTERAPI_IO_KEY" };
  const id = url.match(/status\/(\d+)/)?.[1];
  if (!id) return { text: null, estCostUsd: 0, failure: "no tweet id in URL" };

  const base = (env.TWITTERAPI_IO_ENDPOINT ?? "https://api.twitterapi.io/twitter/tweet/thread_context?tweetId={id}").replace(
    "{id}",
    id,
  );

  const parts: string[] = [];
  let cursor: string | undefined;
  let pages = 0;
  const MAX_PAGES = 10; // safety cap; 10 * ~20 replies covers any realistic thread
  while (pages < MAX_PAGES) {
    const endpoint = cursor ? `${base}${base.includes("?") ? "&" : "?"}cursor=${encodeURIComponent(cursor)}` : base;
    // 429 backoff: the key is rate-limited, so retry a few times before giving up.
    let res: Response | undefined;
    for (let attempt = 0; attempt < 4; attempt++) {
      res = await fetch(endpoint, { headers: { "X-API-Key": key } });
      if (res.status !== 429) break;
      await sleep(1000 * Math.pow(2, attempt)); // 1s, 2s, 4s, 8s
    }
    if (!res || !res.ok) {
      if (parts.length) break; // keep what we have if a later page fails
      return { text: null, estCostUsd: 0, failure: `twitterapi HTTP ${res?.status ?? "no response"}` };
    }
    const json: any = await res.json();
    harvestText(json, parts);
    pages++;
    if (json?.has_next_page && json?.next_cursor) cursor = json.next_cursor;
    else break;
  }

  const text = parts.join("\n\n---\n\n");
  const est = COST.twitterapiPerTweet * Math.max(1, parts.length);
  return { text: text || null, estCostUsd: est, failure: text ? undefined : "no text harvested (check shape)" };
};

/** YouTube transcript via the `youtube-transcript` package (optional dep). */
const youtube: Adapter = async (url) => {
  try {
    const mod: any = await import("youtube-transcript");
    const segs = await mod.YoutubeTranscript.fetchTranscript(url);
    const text = segs.map((s: any) => s.text).join(" ");
    return { text: text || null, estCostUsd: COST.youtube };
  } catch (e: any) {
    return { text: null, estCostUsd: 0, failure: `youtube-transcript: ${e?.message ?? e}` };
  }
};

/** PDF via fetch + `pdf-parse` (optional dep). */
const pdf: Adapter = async (url) => {
  try {
    const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
    const mod: any = await import("pdf-parse");
    const parsed = await (mod.default ?? mod)(buf);
    return { text: parsed.text || null, estCostUsd: COST.pdf };
  } catch (e: any) {
    return { text: null, estCostUsd: 0, failure: `pdf-parse: ${e?.message ?? e}` };
  }
};

/** Last-resort fallback: OpenGraph title + description from raw HTML <head>. */
const ogFallback: Adapter = async (url) => {
  try {
    const html = await (await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } })).text();
    const og = (p: string) =>
      html.match(new RegExp(`<meta[^>]+property=["']og:${p}["'][^>]+content=["']([^"']+)`, "i"))?.[1] ?? "";
    const title = og("title") || html.match(/<title>([^<]+)/i)?.[1] || "";
    const desc = og("description");
    const text = [title, desc].filter(Boolean).join("\n\n");
    return { text: text || null, estCostUsd: COST.og, failure: text ? undefined : "no OG metadata" };
  } catch (e: any) {
    return { text: null, estCostUsd: 0, failure: `og: ${e?.message ?? e}` };
  }
};

// Which adapters to trial per source type.
// twitterapi.io and firecrawl are RULED OUT (see scorecard.md Decision section —
// twitterapi over-fetches/unbounded-cost/misses article bodies; firecrawl untested
// but moot since Jina already wins) — excluded so they don't burn quota/credit.
const PLAN: Record<SourceType, { name: string; fn: Adapter }[]> = {
  x: [
    { name: "x:jina", fn: jina },
    { name: "fallback:og", fn: ogFallback },
  ],
  youtube: [
    { name: "yt:transcript", fn: youtube },
    { name: "fallback:og", fn: ogFallback },
  ],
  article: [
    { name: "article:jina", fn: jina },
    { name: "fallback:og", fn: ogFallback },
  ],
  pdf: [
    { name: "pdf:parse", fn: pdf },
    { name: "fallback:og", fn: ogFallback },
  ],
  other: [{ name: "fallback:og", fn: ogFallback }],
};

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------
/** Filesystem-safe slug for "<id-or-last-path-segment>__<adapter>.md" output filenames. */
function slugFor(url: string, adapter: string): string {
  const id = url.match(/status\/(\d+)/)?.[1] ?? url.replace(/^https?:\/\//, "").replace(/[^a-z0-9]+/gi, "-").slice(0, 60);
  return `${id}__${adapter.replace(/[^a-z0-9]+/gi, "-")}.md`;
}

async function run() {
  const urls: TestUrl[] = JSON.parse(await readFile(join(HERE, "urls.json"), "utf8"));
  const real = urls.filter((u) => !u.url.includes("..."));
  if (real.length === 0) {
    console.error("⚠  urls.json still has only the template placeholders. Add real URLs first.");
    return;
  }

  const outDir = join(HERE, "out");
  await mkdir(outDir, { recursive: true });

  const results: FetchResult[] = [];
  for (const u of real) {
    for (const { name, fn } of PLAN[u.type] ?? PLAN.other) {
      process.stdout.write(`· ${name}  ${u.url.slice(0, 60)} … `);
      const t0 = Date.now();
      let r: AdapterResult;
      try {
        r = await fn(u.url);
      } catch (e: any) {
        r = { text: null, estCostUsd: 0, failure: e?.message ?? String(e) };
      }
      const latencyMs = Date.now() - t0;
      const text = r.text ?? "";
      const chars = text.length;
      const ok: FetchResult["ok"] = chars > 200 ? "yes" : chars > 0 ? "partial" : "no";

      // Dump full captured text so the `whole?`/cleanliness check can be done against
      // the real content, not just the 200-char scorecard snippet.
      if (text) {
        const dumpPath = join(outDir, slugFor(u.url, name));
        await writeFile(dumpPath, `<!-- source: ${u.url} | adapter: ${name} | ${chars} chars -->\n\n${text}`, "utf8");
      }

      results.push({
        url: u.url,
        type: u.type,
        note: u.note,
        adapter: name,
        ok,
        chars,
        latencyMs,
        estCostUsd: r.estCostUsd,
        firstChars: text.replace(/\s+/g, " ").slice(0, 200),
        failure: r.failure,
        whole: "",
      });
      console.log(`${ok} (${chars} chars, ${latencyMs}ms)${r.failure ? " — " + r.failure : ""}`);
    }
  }

  await writeFile(join(HERE, "scorecard.md"), renderScorecard(results), "utf8");
  console.log(`\n✓ wrote scorecard.md  (now fill the "whole?" column by eye — that's the real bar)`);
}

// ---------------------------------------------------------------------------
// Scorecard rendering
// ---------------------------------------------------------------------------
function renderScorecard(rows: FetchResult[]): string {
  const types: SourceType[] = ["x", "youtube", "article", "pdf", "other"];
  let md = `# Phase 0 — Fetch Spike Scorecard\n\n`;
  md += `Generated ${new Date().toISOString()}. Auto-fills everything except **whole?** — fill that by eye:\n`;
  md += `did the adapter return the *whole* thread/content, clean enough to rank? (Y / N)\n\n`;

  for (const t of types) {
    const r = rows.filter((x) => x.type === t);
    if (!r.length) continue;
    md += `## ${t}\n\n`;
    md += `| url | adapter | ok | whole? | chars | ms | ~$ | first 200 chars / failure |\n`;
    md += `|---|---|---|---|---|---|---|---|\n`;
    for (const x of r) {
      const last = x.url.split("/").slice(-2).join("/").slice(0, 28);
      const detail = (x.failure ? `⚠ ${x.failure}` : x.firstChars).replace(/\|/g, "\\|");
      md += `| ${last} | ${x.adapter} | ${x.ok} | ${x.whole} | ${x.chars} | ${x.latencyMs} | ${x.estCostUsd.toFixed(
        4,
      )} | ${detail} |\n`;
    }
    md += `\n`;
  }

  // Per-adapter summary
  md += `## Summary (per adapter)\n\n| adapter | runs | ok=yes | mean chars | mean ms | total ~$ |\n|---|---|---|---|---|---|\n`;
  const byAdapter = new Map<string, FetchResult[]>();
  for (const x of rows) (byAdapter.get(x.adapter) ?? byAdapter.set(x.adapter, []).get(x.adapter)!).push(x);
  for (const [name, r] of byAdapter) {
    const yes = r.filter((x) => x.ok === "yes").length;
    const meanChars = Math.round(r.reduce((a, x) => a + x.chars, 0) / r.length);
    const meanMs = Math.round(r.reduce((a, x) => a + x.latencyMs, 0) / r.length);
    const cost = r.reduce((a, x) => a + x.estCostUsd, 0);
    md += `| ${name} | ${r.length} | ${yes}/${r.length} | ${meanChars} | ${meanMs} | ${cost.toFixed(4)} |\n`;
  }

  md += `\n## Decision (fill in)\n\n`;
  md += `- X threads ≥80% **whole+clean** at cents/run?  GO / CONDITIONAL / NO-GO: \n`;
  md += `- Chosen adapter per source_type → becomes \`lib/fetch/*\` in Phase 2: \n`;
  md += `- Projected weekly cost (15–20 items): \n`;
  md += `- Does the two-pass model collapse for X (full thread cheap in one call)? \n`;
  return md;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
/** Recursively collect text-ish string fields from arbitrary JSON, in order. */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function harvestText(node: any, out: string[] = []): string[] {
  if (node == null) return out;
  if (Array.isArray(node)) {
    for (const v of node) harvestText(v, out);
    return out;
  }
  if (typeof node === "object") {
    for (const [k, v] of Object.entries(node)) {
      if (typeof v === "string" && /^(text|full_text|note_tweet|content)$/i.test(k) && v.trim()) out.push(v.trim());
      else harvestText(v, out);
    }
  }
  return out;
}

/** Minimal .env loader (no dep). KEY=value lines; ignores # comments and blanks. */
async function loadDotEnv(path: string) {
  try {
    const raw = await readFile(path, "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (m && !line.trimStart().startsWith("#")) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    /* no .env — rely on real env vars */
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
