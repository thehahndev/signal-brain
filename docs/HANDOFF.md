# Signal Brain — Session Handoff (updated 2026-06-07, post-Phase-0)

Read this first, then [`PLAN.md`](PLAN.md). `phase-0-fetch-spike.md` and `spike/` are now historical —
the spike is **DONE and decided** (see `spike/scorecard.md` for the full record); no need to relitigate.

## What this is
A ruthless attention-filter for AI-dev content. Pipeline (distinct stages, don't conflate):
**Capture** (one inbox for URLs) → **Fetch** (retrieve content behind the URL) → **Rank + cluster**
(apply rubric, group dupes) → **Digest** (push ranked result). Fetch and Rank are the hard parts.
This is the *input pipeline*; the existing **dev-brain** markdown vault is the *knowledge store* — keep separate.

## Decisions LOCKED (planning session + Phase 0)
- **Name:** Signal Brain (pairs with dev-brain; "signal" = signal-vs-noise, not the messaging app).
- **Surface = Telegram bot.** Best bot API, native Android share target, one chat carries
  capture + consumption + feedback. WhatsApp = approval-gated; Signal app = no bot API.
- **Consumption model:** push a **daily, bounded, ranked view of the rolling backlog** (not the day's
  arrivals) with explicit closure ("✅ you're caught up"). Finite-feed psychology without a PWA.
  PWA feed deferred — only if Telegram adherence proves out (engine identical, no lock-in).
- **Output = single ruthless ranked list + Opportunity flag** (NOT two lanes). Volume (~3–5 surfaced/wk)
  is too thin for sections. Opportunity-flagged items get a **score boost / guaranteed slot** + a header
  count (`🟢 1 opportunity`) + inline 🟢 so a build/sell idea is never missed.
- **Rubric storage = single markdown file in a git repo.** Read at runtime via GitHub raw; **feedback
  (👍gold/👎noise) commits an exemplar line back to the file via GitHub API.** One source of truth,
  versioned, hand-editable. DB-only is the fallback if GitHub API plumbing is unwanted. In **Phase 1
  the rubric is just a local file** — the commit-back loop only matters in Phase 3.
- **Pay the cents** for hosted extractors + Claude API. Android. Single-user, no auth. Daily batch (one cron).
- **FETCH ADAPTERS — decided in Phase 0 (overturns the original hypothesis below):**
  **X + articles → Jina Reader** (`https://r.jina.ai/<url>`, free, 14/14 ok on the spike corpus,
  ~460ms, full content incl. X-article bodies). **YouTube → `youtube-transcript` package** (free, 2/2).
  **twitterapi.io and Firecrawl are RULED OUT** — removed from the spike harness entirely. twitterapi,
  even tested fairly on the correct thread-context endpoint, over-fetches the whole reply tree (noisy,
  slow, *unbounded* cost — exhausted its credit mid-test) and still misses X-article bodies. See
  `spike/scorecard.md` Decision section for the full reasoning and numbers.
- **Capture-time curation for "X article" preview cards:** Jina drops the destination URL of X-article
  preview cards entirely (not even an unresolved shortlink — verified by grep, zero trace). User has
  taken on the responsibility: when capturing a tweet that has a linked-article card, push the
  **card's URL**, not the tweet's; otherwise push the tweet URL as normal. This needs **zero fetch-side
  code** — the chosen URL is itself `x.com`, routes through the same `x:jina` adapter either way.

## Source mix reality (the #1 risk — NOW RESOLVED, see Phase 0 below)
**X/Twitter threads are the MAJORITY**, then YouTube, then web articles.
~~X is also the hardest to fetch → fetching is the project-gating risk. Generic readers (Jina/Firecrawl)
are weak on X; the realistic path is a cheap third-party X API.~~ **Phase 0 found the OPPOSITE:** Jina
(a generic reader) is the clear winner on X — free, fast, complete, and beats the purpose-built X API
on every axis. The fetch risk is **retired**. Don't second-guess this; it's empirically settled
(14/14 ok, full captures saved + eyeballed in `spike/out/` and `spike/CHECKLIST.md`).

## Key architectural insights (don't relitigate)
- **Two-pass fetch is DROPPED** (was: cheap snippet → rank → full extract only for survivors). Phase 0
  found Jina full-extracts *everything* free in ~460ms — the cost pressure that motivated two-pass
  doesn't exist. **Full-extract up front for $0; rank on full text.** Simpler pipeline, one less stage.
- **Engine = one prompt + one rubric.md + thin plumbing.** At ~15–20 items/wk, a *single* Claude (Sonnet)
  call does scoring + signal/hype + verdict + clustering + opportunity-flag in one structured (JSON-schema) pass.
  **No embeddings, no vector DB, no clustering algorithm** — over-engineering at this volume.
- **Capture & feedback need no polling:** Telegram webhook for inbound shares and button callbacks.
- **Minor fetch nuance for later (low priority, don't block Phase 1 on it):** inline `t.co` links in
  tweet bodies are captured as opaque unresolved shortlinks. They resolve cheaply (one HTTP redirect,
  $0) but mostly point to the tweet's own attached media, not external content — would need a
  resolve-then-filter step in `lib/fetch/x.ts` in Phase 2. See `spike/scorecard.md` for detail.

## NEXT ACTION (pick up here — Phase 2: plumbing)
**Phase 1 is DONE — judgment engine built and CONVERGED (2026-06-08).** It lives in `engine/` (TypeScript,
tsx, `@anthropic-ai/sdk`): one structured `claude-sonnet-4-6` call (adaptive thinking, `effort: high`,
`output_config.format` JSON schema, rubric cached) over the whole batch → score / verdict (read|skim|bury) /
signal_or_hype / opportunity_flag / cluster_id / why / key_claims. `engine/rubric.md` is the tuned taste
(north star, rank-up/bury, signal-vs-hype, hard-reserved 🟢 opportunity flag, a "skim floor" for credible
summaries, conservative clustering, seeded exemplars). `engine/src/clean.ts` strips Jina/transcript chrome.
Calibrated against the 18 real `spike/out/*.md` fixtures until the ranking reads ruthless (final: 5 read /
4 skim / 8 buried, 0 over-flagged opportunities). Run: `cd engine && npm run rank` (needs `ANTHROPIC_API_KEY`
in `engine/.env`; `--json`, `--limit N`, `--model` flags). ~$0.18/run.

**Phase 2 — plumbing (build this next):** Telegram bot (webhook capture + push), Neon Postgres, Vercel Cron,
wire the Phase-0 fetchers (`lib/fetch/*`: X+articles→Jina, YouTube→youtube-transcript) and the Phase-1 engine
(graduate `engine/` logic into `lib/`), single full-extract step (two-pass is dropped), daily digest with
buttons. Model/effort for Phase 2 is more mechanical — Sonnet at medium effort is likely the better trade-off.

## Phase roadmap (summary — full detail in PLAN.md §8)
- **Phase 0** — Fetch spike (GATES everything). ✅ DONE 2026-06-07 → GO (Jina). Throwaway harness in `spike/`.
- **Phase 1** — Judgment engine (real build-first): local script, rubric + ranking call, no infra/surface.
  ✅ DONE 2026-06-08 → CONVERGED. Built in `engine/`; ranking reads ruthless on the 18 fixtures.
- **Phase 2** — Plumbing: Telegram bot + Neon + Vercel Cron + wire fetchers/engine + digest. ← we are here (NOTE:
  two-pass is dropped — see above — so "wire fetchers" is now a single full-extract step, not two.)
- **Phase 3** — Close feedback loop (👍/👎 → rubric commit; `→ brain` tags gold).
- **Phase 4+** — Deferred: dev-brain auto-promotion, searchable archive, PWA feed.

## Stack (agreed)
Next.js App Router on Vercel · TypeScript · Telegram Bot API (webhook) · Vercel Cron (in `vercel.ts`) ·
Neon Postgres (Vercel Postgres/KV are discontinued) · Claude API (Sonnet for ranking) ·
**Jina Reader for X + articles, `youtube-transcript` for YouTube** (decided in Phase 0 — supersedes the
original "third-party X API" hypothesis below the line) · rubric as markdown in a git repo.

## Relevant prior art in dev-brain (already checked)
- `prompts/greenfield-mvp-planning.md` — the 10-section planning format PLAN.md follows.
- `howtos/ai-development-workflow.md` — the plan→implement→review loop.

## Model/effort guidance for Phase 1
**Opus, high effort.** This phase is fundamentally taste-calibration — designing a rubric and ranking
prompt that makes nuanced "signal vs. noise" / "is this an opportunity" judgment calls. That's the
entire differentiator of "ruthless." Concentrated reasoning quality on a few small artifacts beats
throughput here. (Phase 2 — infra/plumbing — is more mechanical; Sonnet at medium effort will likely
be the better trade-off there. Re-evaluate when you get to it.)
