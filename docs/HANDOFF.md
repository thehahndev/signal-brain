# Signal Brain — Session Handoff (updated 2026-06-09, post-Phase-2 + cron-timeout fix)

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

## NEXT ACTION (Phase 3 — BUILT on a branch, not yet shipped; resume carefully)
**Phase 2 is DONE — input pipeline built, deployed, LIVE (2026-06-08), and cron-timeout-hardened (2026-06-09).**
Lives in the Next.js App Router app at the repo root (`app/`, `lib/`), deployed to
`https://signal-brain.vercel.app` (prod-on-main, Vercel + Neon `neon-indigo-castle` + GitHub-connected CI).
Telegram capture → Jina/transcript fetch → the graduated engine (`lib/engine/`, reads root `rubric.md`) →
daily cron digest (07:00 local) with `[👍][👎][→ brain]` buttons. Engine `rank()` takes the rubric as a param;
`engine/` stays as the calibration harness importing `lib/engine` + root `rubric.md` (one source of truth).
Plan: `~/.claude/plans/hidden-gliding-summit.md`. **Read "Runtime constraints" below before touching the digest.**

**Phase 3 is BUILT but UNMERGED + UNSHIPPED — it lives on branch `phase-3-feedback-loop`.** What it built:
`lib/github.ts` (GitHub Contents API write + raw-CDN read, scoped to `thehahndev/signal-brain`@`main`);
async `lib/engine/rubric.ts#loadRubric` (reads GitHub-raw with a bundled-`fs` fallback); `lib/feedback/exemplar.ts`
(commits 👍/👎 exemplar lines into a `## Feedback exemplars` subsection of `rubric.md` — reuses the engine's own
`why`/`signal_or_hype` rather than inventing a rationale for *why* the user (dis)agreed, since a thumb-tap alone
doesn't say); `lib/feedback/brain.ts` (commits a markdown stub to `inbox/` for `→ brain` — the only writable
bridge from serverless to the *local* dev-brain vault); `items.promotedAt` (migration `0001`) as a
double-commit guard; `app/api/telegram/route.ts#handleCallback` wires all three buttons via `after()`. See PLAN §8.

### Resuming Phase 3 safely
The branch was cut **before** the 2026-06-09 cron-timeout fix landed on `main`, so it is now BEHIND `main` and
WILL conflict. Resume in this order:
1. **Merge `main` into the branch first:** `git switch phase-3-feedback-loop && git merge main`. Expect a
   conflict in `lib/digest/pipeline.ts` at the `rank(...)` call (both sides changed that line). **Keep BOTH** —
   the branch's async `await loadRubric()` AND main's `effort` arg + 4-item cap:
   `await rank(items, { rubric: await loadRubric(), model: opts.model, effort: RUNTIME_EFFORT })`, and keep
   main's `MAX_BACKLOG = 4` / `RUNTIME_EFFORT = 'medium'`. `lib/engine/rank.ts` should merge clean (only `main`
   changed it — it gained `effort`/`timeoutMs` opts, `max_tokens` 16000, and a 45s `AbortSignal`).
2. **Re-check the time budget.** The digest already uses ~39s of the 60s Hobby ceiling; Phase 3's async
   `loadRubric` adds a GitHub-raw fetch per run (small, ~hundreds of ms, with an `fs` fallback) — confirm with
   `npm run` `scripts/time-rank.ts` after merging so you don't reintroduce the 60s hard-kill.
3. **Provision + migrate:** create a fine-grained PAT (repo-scoped to `thehahndev/signal-brain`,
   Contents: Read & write), set `GITHUB_TOKEN` in Vercel env (see `.env.example`); run `npm run db:migrate`
   against prod Neon (applies migration `0001`, adds `items.promoted_at`).
4. **Verify live:** tap 👍/👎/→brain on a real digest card; confirm the commit lands in `rubric.md` / `inbox/`
   on `main`, and the *next* digest reads the updated rubric (GitHub-raw, no redeploy). Note GitHub-raw has
   **~5min CDN caching**, so a freshly-committed exemplar may not appear until a later run.
5. **Watch drift at medium:** runtime now ranks at **effort:medium**, not the converged high (see Runtime
   constraints) — re-confirm appended exemplars steer taste sensibly *at medium*; prune the exemplar section
   by hand if it bloats the prompt.

## Runtime constraints (Vercel Hobby — IMPORTANT, do not relitigate without re-measuring)
The daily ranking call's latency is dominated by **thinking time**, not tokens. Measured (2026-06-09) on a real
9-item backlog: `effort:high` ≈ **111s**, `medium` ≈ 59s, `low` ≈ 51s — and ~55s for `high` even at a 4-item
batch. **Vercel Hobby hard-kills functions at 60s.** A timed-out run leaves a zombie row + no digest. So the
runtime digest is pinned to **`effort:medium` with `MAX_BACKLOG = 4` (FIFO, oldest-first)** in
`lib/digest/pipeline.ts` (~39s on prod incl. cold start). Consequences, all accepted: ranking diverges from the
converged-high calibration (taste holds close); the backlog drains **4/day oldest-first** (a heavy day takes
several days; newer-but-better items can wait); each day's ≤4 are ranked/clustered only against each other.
`rank.ts` also has a **45s `AbortSignal` backstop** (fails cleanly as `status='error'` instead of a silent kill).
**To restore the full converged `effort:high` (and drop the cap) you need Vercel Pro (300s limit).** Diagnostics:
`scripts/check-runs.ts` (recent runs + backlog), `scripts/time-rank.ts` (read-only latency/taste probe).

## Historical: Phase 1 → Phase 2 handoff (superseded by the above)
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
- **Phase 2** — Plumbing: Telegram bot + Neon + Vercel Cron + wire fetchers/engine + digest. ✅ DONE + LIVE
  2026-06-08 (`signal-brain.vercel.app`). Single full-extract (two-pass dropped).
- **Phase 3** — Close feedback loop (👍/👎 → rubric commit; `→ brain` tags gold). ← we are here:
  **BUILT on branch `phase-3-feedback-loop`, unmerged + unshipped** — see "Resuming Phase 3 safely" above.
- **Phase 4+** — Deferred: dev-brain auto-promotion, searchable archive, PWA feed.

## Stack (agreed)
Next.js App Router on Vercel · TypeScript · Telegram Bot API (webhook) · Vercel Cron (in `vercel.json`,
`30 21 * * *` UTC = 07:00 local) · Neon Postgres (Vercel Postgres/KV are discontinued) ·
Claude API (`claude-sonnet-4-6`; runtime ranking at **effort:medium** on Hobby — see Runtime constraints) ·
**Jina Reader for X + articles, `youtube-transcript` for YouTube** (decided in Phase 0 — supersedes the
original "third-party X API" hypothesis below the line) · rubric as markdown in a git repo.

## Relevant prior art in dev-brain (already checked)
- `prompts/greenfield-mvp-planning.md` — the 10-section planning format PLAN.md follows.
- `howtos/ai-development-workflow.md` — the plan→implement→review loop.

## Model/effort guidance (by phase)
- **Phase 1 — Opus, high effort.** Fundamentally taste-calibration — designing a rubric and ranking
  prompt that makes nuanced "signal vs. noise" / "is this an opportunity" judgment calls. That's the
  entire differentiator of "ruthless." Concentrated reasoning quality on a few small artifacts beats
  throughput here.
- **Phase 2 — Sonnet, medium effort (confirmed).** Infra/plumbing was mechanical (Next.js routes,
  fetch adapters, Drizzle/Neon, Telegram, cron); medium-effort Sonnet was the right trade-off, bumping
  only for the webhook + digest-assembly + migrations. The *runtime ranking call* stays `claude-sonnet-4-6`,
  but the **runtime thinking effort had to drop high→medium** to fit Hobby's 60s limit (see Runtime constraints).
- **Phase 3 — mostly Sonnet/medium, with Opus/high for the taste-sensitive bits.** The plumbing — GitHub
  API commit-back, switching the rubric read to GitHub-raw, `→ brain` dev-brain promotion — is mechanical
  (Sonnet, medium). But two pieces are taste-calibration and deserve Opus/high: (1) *designing how a 👍/👎
  becomes an exemplar line* — the format and phrasing that actually steers the rubric without bloating it
  (same craft as Phase 1's exemplar seeding), and (2) *verifying the loop drifts ranking toward taste*
  after feedback accrues — and note this now happens at **runtime effort:medium**, not the converged high,
  so confirm exemplars steer sensibly at medium. Don't let an auto-appended exemplar degrade the rubric.
