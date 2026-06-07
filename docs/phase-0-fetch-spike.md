# Phase 0 — Fetch Spike Spec

Throwaway, read-only diagnostic. No DB, no Telegram, no Claude, no Vercel. One job: prove fetch works
**before** building anything. Time-box: 1–2 days.

## The one question
**Can we retrieve full, clean content for the real source mix — especially X threads — reliably and for cents?**
Everything downstream assumes "yes." This makes it a measured fact.

## Success bar (GO/NO-GO)
| Source | Coverage target | "Complete & clean" means |
|---|---|---|
| **X threads (primary)** | **≥ 80%** | the *whole* author thread in order — not just the head tweet — text + linked URLs + image alt; no nav/ad junk |
| YouTube | ≥ 90% | full transcript (manual or auto captions) |
| Articles | ≥ 90% | readable body, no chrome; paywalled → clean degrade to abstract/metadata |
| PDF | ≥ 90% | extracted text |
| Other | n/a | graceful degrade to OG metadata, never a crash |

- **Cost bar:** < ~$0.02/item all-in → < ~$0.40/week at 15–20 volume. Convert any per-1k-tweet pricing and confirm.
- **Also record:** latency per fetch; failure behavior on protected/deleted tweet, paywall, no-caption video.
- The decisive bar is **X completeness** — the head-tweet-only trap passes char-count checks but makes the tool
  useless, so the scorecard has a human "is this whole & clean enough to rank?" column.

## Test set (user supplies real URLs from their saves; ~17 total)
- **~10 X** — long thread; thread w/ images; thread w/ quote-tweet; thread w/ external link; reply-chain;
  niche vs big account; **one protected/deleted** (failure handling).
- **~3 YouTube** — real captions; auto-captions only; very long / no captions.
- **~3 articles** — clean blog; JS-heavy SPA; paywalled (expect degrade).
- **~1 PDF** — e.g. arXiv.

```jsonc
// spike/urls.json
[
  { "url": "https://x.com/...",         "type": "x",       "note": "long thread + images" },
  { "url": "https://x.com/...",         "type": "x",       "note": "deleted — expect fail" },
  { "url": "https://youtube.com/...",   "type": "youtube", "note": "auto-captions only" },
  { "url": "https://...blog...",        "type": "article", "note": "clean" },
  { "url": "https://...paywall...",     "type": "article", "note": "expect degrade" },
  { "url": "https://arxiv.org/pdf/...", "type": "pdf",     "note": "" }
]
```

## Candidate adapters (run MULTIPLE on the same X URLs to compare)
- **X (the crux):** `twitterapi.io` (conversation endpoint, ~cents/1k tweets) primary; `apidance` / `SocialData`
  alternates; `Firecrawl` and Jina Reader (`r.jina.ai/<url>`) as baselines. Official X API priced out (record why,
  don't trial). Key test: from a thread-head URL, can it return the *full conversation in order*?
- **YouTube:** `youtube-transcript` (npm) or Supadata; YouTube Data API for metadata fallback.
- **Articles:** Jina Reader first (cheapest), Firecrawl scrape fallback; Mozilla Readability as self-hosted last resort.
- **PDF:** download → `pdf-parse`/`pdfjs` (or let Jina handle it).
- **Fallback (any):** OG/`<head>` metadata via `open-graph-scraper`.
- **Procure first:** twitterapi.io key + a few $ credit; optional Firecrawl key; Jina has a keyless/free tier.
  Keys in `spike/.env`.

## Harness (throwaway script outline — ~150 lines)
```ts
// spike/fetch-spike.ts  — throwaway, delete after Phase 0
type TestUrl     = { url: string; type: SourceType; note: string };
type FetchResult = {
  url: string; type: SourceType; adapter: string;
  ok: "yes" | "partial" | "no";
  chars: number; latencyMs: number; estCostUsd: number;
  firstChars: string;       // first ~200 chars for eyeballing
  failure?: string;
  whole?: "" | "Y" | "N";   // HUMAN fills: full thread & clean?
};

const adapters: Record<string, (u: string) => Promise<Partial<FetchResult>>> = {
  "x:twitterapi":  fetchXTwitterApi,
  "x:firecrawl":   fetchFirecrawl,
  "x:jina":        fetchJina,
  "yt:transcript": fetchYouTubeTranscript,
  "article:jina":  fetchJina,
  "pdf:parse":     fetchPdf,
  "fallback:og":   fetchOgMetadata,
};
// for each url -> run every adapter for its type -> time it, count chars, capture firstChars,
// catch failures -> collect FetchResult[] -> write spike/scorecard.md (table per source type)
```
Auto-fills everything except `whole` — that column is filled by eye (no char-count proves "whole & clean").

## Deliverable: `spike/scorecard.md`
Table per source type + summary: coverage % per adapter, mean cost/item, mean latency, projected weekly cost,
then the written GO/CONDITIONAL/NO-GO call.

## Decision rule
- **GO** → X ≥ 80% whole+clean at target cost AND a working/degrading adapter per other type. Output: chosen
  adapter per `source_type` (becomes the `lib/fetch/*` decisions for Phase 2).
- **CONDITIONAL** → X only partial (head-tweet-only). Options: accept ranking on partial, switch vendor, or add
  a logged-in browser-session scraper as heavier fallback.
- **NO-GO** → no cheap reliable route to full X threads. Since X is the majority source, rethink premise
  (heavier scraper, or rebalance source emphasis) before building the engine — surfaced day one for a few dollars.

## Bonus finding to capture
For X, the two-pass model may **collapse** (if a thread API returns full text cheaply in one call, skip the
separate cheap-metadata pass). Note per source type whether cheap-vs-full passes are worth keeping → feeds Phase 2.

## Explicitly NOT in this spike
Ranking, Claude, clustering, Telegram, DB, cron, two-pass orchestration, auth. Fetch only.
