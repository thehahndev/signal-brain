# Phase 3 kick-off prompt

Paste the block below into a fresh agent session to resume Phase 3 (the 👍/👎 → rubric commit-back
loop). It's self-contained — a cold session has no memory of how the branch got here — and it leads
with the merge resolution so work starts clean. Background lives in [`HANDOFF.md`](HANDOFF.md) →
"Resuming Phase 3 safely" + "Runtime constraints".

---

> **Signal Brain — Phase 3 (close the feedback loop). Resume work that's BUILT but unmerged.** Repo: `D:\htdocs\claude\signal-brain` (single-user, prod-on-main, LIVE at `signal-brain.vercel.app`). Don't relitigate settled decisions.
>
> **START by reading, in order — treat as canonical:**
> 1. `docs/HANDOFF.md` → the **"Resuming Phase 3 safely"** and **"Runtime constraints"** sections (and the per-phase model/effort guidance). This is the source of truth.
> 2. `docs/PLAN.md` §8 (Phase 3) and §5 (digest UX / buttons).
> 3. Dev-brain learning `D:\htdocs\claude\dev-brain\learnings\llm-rubric-as-git-file-commit-back.md` (the locked commit-back + GitHub-raw approach).
> 4. The already-built Phase-3 code on branch `phase-3-feedback-loop`: `lib/github.ts`, `lib/engine/rubric.ts` (async `loadRubric`), `lib/feedback/exemplar.ts`, `lib/feedback/brain.ts`, `app/api/telegram/route.ts#handleCallback`, migration `drizzle/0001_*`. Plus what changed on `main` after the branch was cut: `lib/engine/rank.ts` (gained `effort`/`timeoutMs` opts, `max_tokens` 16000, 45s `AbortSignal`) and `lib/digest/pipeline.ts` (`RUNTIME_EFFORT='medium'`, `MAX_BACKLOG=4`, parallel writes).
>
> **GOAL:** ship the feedback loop — 👍/👎 commits an exemplar line back into `rubric.md` via the GitHub API; the rubric reads via GitHub-raw so the deployed bundle isn't stale; `→ brain` commits a stub to `inbox/`. The engine is converged — wrap it, no re-ranking work.
>
> **DO THIS FIRST — the merge (the branch is BEHIND `main` and WILL conflict):**
> 1. `git switch phase-3-feedback-loop && git merge main` (main tip `a0efc2d`).
> 2. **The one conflict that needs care is in `lib/digest/pipeline.ts`** at the `rank(...)` call — both sides changed that line. **Keep BOTH:** `await rank(items, { rubric: await loadRubric(), model: opts.model, effort: RUNTIME_EFFORT })`, and keep main's `MAX_BACKLOG = 4` and `RUNTIME_EFFORT = 'medium'` constants.
> 3. `lib/engine/rank.ts` should merge clean (only `main` touched it). `HANDOFF.md` and `.env.example` will also conflict — those are **trivial, keep the newer/combined version**.
> 4. After resolving: `npm run typecheck && npm run lint && npm test && npm run build` must be green.
> 5. **Re-check the time budget** — the digest already uses ~39s of Hobby's 60s limit, and async `loadRubric` adds a GitHub-raw fetch per run. Run `npx tsx scripts/time-rank.ts` to confirm it still completes well under ~45s, so you don't reintroduce the 60s hard-kill.
>
> **Locked, don't reopen:** rubric = single git markdown file; commit-back via GitHub API; single-user / allow-listed chat. Exemplar format = `verdict | source | one-line reason`, reusing the engine's own `why`/`signal_or_hype` (a thumb-tap doesn't tell us *why* the user (dis)agreed — don't fabricate a rationale). **Runtime ranking is pinned to `effort:medium` + 4-item cap** (Vercel Hobby 60s limit — don't change without re-measuring; `effort:high` needs Pro).
>
> **Genuinely undecided — ASK me before building/provisioning:** (a) the fine-grained PAT (repo-scoped to `thehahndev/signal-brain`, **Contents: Read & write**) — I'll create it and set `GITHUB_TOKEN` in Vercel env; (b) running `npm run db:migrate` (migration `0001`, `items.promoted_at`) against **prod Neon** — confirm before touching prod data; (c) note GitHub-raw has **~5min CDN caching**, so a freshly-committed exemplar won't appear until a later run — confirm that's acceptable; (d) the runtime now ranks at **medium, not the converged high**, so confirm appended exemplars steer taste sensibly *at medium*.
>
> **Model/effort (per HANDOFF):** Sonnet/medium for the plumbing (GitHub API, raw read, callback wiring, the merge); bump to Opus/high for the two taste-sensitive pieces — designing the exemplar-capture format so it steers without bloating, and verifying the loop drifts ranking toward taste (at medium).
>
> **Workflow:** do the merge + green build + timing re-check first (it's mechanical, fully specified above). THEN enter plan mode, scope the remaining ship steps (PAT, migration, deploy, live button-verify), ask me the undecided items, get approval, and only then provision/deploy.

---

> Note: `main` tip is `a0efc2d` at the time of writing. If `main` has moved on, the conflict set may
> differ — but the `pipeline.ts` `rank(...)` call is the load-bearing merge either way.
