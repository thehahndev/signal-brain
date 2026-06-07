# Signal Brain — MVP Plan (agreed 2026-06-06)

Structured to the dev-brain `greenfield-mvp-planning` format. Status: agreed; building starts at Phase 0.

## Concept
Ruthless attention-filter for AI-dev content. **Capture → Fetch → Rank+cluster → Digest.**
Input pipeline feeding the separate **dev-brain** knowledge store.

**North star value:** AI software development + **novel AI products/ideas to build, market, and sell**
(opportunity is first-class, not a footnote). Rank up for: novelty, proximity to stack
(Claude Code, Codex, web dev, browsers, AI design tools), actionability, **opportunity**.
Bury: hot takes, prediction/"X is dead" threads, rehashed basics, engagement-bait, substance-free announcements.
**Signal vs hype test:** named, shippable, datable, primary-sourced (release/repo/docs/reproducible) = signal;
reaction/prediction/vibe = hype.

## Locked decisions
- Name **Signal Brain**; surface **Telegram bot**; **single ranked list + Opportunity flag** (boosted slot + header count);
  rubric = **git markdown file** (read via GitHub raw, feedback commits back via API; DB-only fallback);
  pay the cents; Android; single-user/no-auth; **daily batch** (one cron).
- Consumption = **push a bounded, ranked view of the rolling backlog with closure** (not a thin daily slice;
  not a PWA yet). Surface is not lock-in — engine is identical if a PWA is built later.

## 1. Product scope
- **Must (MVP):** Telegram capture → two-pass fetch (X-first) → single-call rubric rank + inline cluster →
  daily Telegram digest (single ranked list, Opportunity flagged, closure) → 👍/👎 feedback into rubric.
- **Nice (defer):** `→ dev-brain` promotion, searchable archive, PWA feed.
- **Out (cut):** auth, multi-user, web UI, embeddings/vector clustering, paywall bypass, real-time processing.
- **Build-first:** fetch spike (Phase 0), then judgment engine (Phase 1) — before any plumbing.

## 2. User flow (daily loop)
- All day: scroll X/YT → Android share sheet → Telegram bot chat (one tap, absorbs existing save reflex).
- Each morning (cron): pipeline pushes ONE bounded digest to the chat.
- Consumption (new reflex): open Telegram, read 3 / skim 2 / ignore buried; tap 👍/👎 on a few. "✅ caught up."

## 3. Multi-user model
None. Single allow-listed Telegram chat ID. No accounts.

## 4. Data model (Neon Postgres)
- **items:** id, url (normalized, unique), source_type (x/youtube/article/pdf/other), captured_at,
  fetch_status, title, snippet, full_text?, fetch_error?, score, signal_or_hype, verdict (read/skim/bury),
  opportunity_flag, cluster_id, why (one-liner), condensation? (~200w), feedback? (gold/noise), surfaced_in_run?.
- **runs** (optional): digest run log.
- **Rubric:** NOT in DB (canonical = git markdown file). If GitHub-API-commit path is rejected, fall back to a
  `rubric_examples` table; otherwise no rubric table.

## 5. UX (Telegram digest)
- Header: `Signal · Fri 6 Jun — 3 read · 2 skim · 12 buried · 🟢 1 opportunity`.
- One message per READ card (so each gets buttons): *what it is · 1–2 key claims · why it matters · verdict*
  + link + `[👍 gold] [👎 noise] [→ brain]`; 🟢 prefix if opportunity.
- Skim: terse one-liners. Buried: collapsed count; `/why` expands bury reasons (ruthless but auditable).
- Footer: `✅ You're caught up.` (closure = finite-feed psychology in a push surface).
- Per-card messages sidestep Telegram's 4096-char limit and give per-item buttons.

## 6. Technical architecture
- Next.js App Router on Vercel, TypeScript.
- `/api/telegram` route handler = bot webhook (inbound shares = capture; button callbacks = feedback). No polling.
- `/api/cron/digest` = daily pipeline via Vercel Cron (configured in `vercel.ts`).
- Fetch adapters `lib/fetch/*` (chosen in Phase 0): `x.ts`, `youtube.ts`, `article.ts`, `pdf.ts`, `fallback.ts`
  (OG metadata). Every adapter degrades to metadata on failure.
- Two-pass: cheap fetch all → single Claude (Sonnet) ranking+clustering JSON call → full-fetch survivors →
  condense survivors → assemble → push.
- Engine = one prompt + rubric.md + recent feedback exemplars. No vector DB; clustering inline.

## 7. CI/CD & deployment
- GitHub → Vercel (preview on PR, prod on main).
- Env via `vercel env`: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID, ANTHROPIC_API_KEY, X_API_KEY, DATABASE_URL (Neon).
- Migrations: Drizzle (Neon branch for preview to protect prod data). Cron + config in `vercel.ts`.
  Telegram webhook registered once against the prod URL.

## 8. Implementation phases
- **Phase 0 — Fetch spike (gates everything, ~1–2 days).** Throwaway local script. Bar: X threads ≥80%
  whole+clean at cents/run. Output: chosen adapter per source_type. See `phase-0-fetch-spike.md`.
- **Phase 1 — Judgment engine (real build-first).** Local script; feed ~20 fetched items → ranking+clustering
  call → iterate `rubric.md` until it cleanly separates signal/hype and flags opportunity. No capture/surface.
- **Phase 2 — Plumbing.** Telegram bot (webhook capture + push), Neon, Vercel Cron, wire Phase-0 fetchers +
  Phase-1 engine, two-pass, daily digest with buttons.
- **Phase 3 — Close the loop.** 👍/👎 → exemplar committed to rubric file → into the prompt; verify ranking
  drifts toward taste. `→ brain` tags gold.
- **Phase 4+ (deferred).** dev-brain auto-promotion (generate markdown stub from a tagged-gold condensation),
  searchable archive, PWA feed only if Telegram adherence proves out.

## 9. Risks & trade-offs
- **X fetch (top risk):** reliability, ToS, cost → Phase 0 spike; vendor with conversation API; degrade to head-tweet.
- **Adherence (ultimate risk):** ride Telegram + daily cue + closure; watch whether it actually gets opened.
- **Ranking miscalibration:** feedback loop; human-in-loop; "bury" is recoverable (never delete).
- **Cost creep:** expected cents/week; log per-run cost.

## 10. Deliberate exclusions
No auth, no web UI, no embeddings, no paywall bypass, no auto-promotion, no PWA until Telegram earns it,
no over-engineered rubric versioning.

## Build this first
Phase 0 fetch spike, then Phase 1 judgment engine — both throwaway local scripts, zero infra.
Step one: *can we pull a full X thread cleanly for cents?* Everything downstream is plumbing around a "yes."
