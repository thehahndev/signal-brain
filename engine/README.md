# Signal Brain — Judgment Engine (Phase 1)

The differentiator of the whole project: a `rubric.md` + **one structured Claude call** that ranks
captured AI-dev content into a ruthless read/skim/bury list with an opportunity flag. Local script, no
infra. The logic graduates into Phase 2 `lib/`.

## Setup
```
cd engine
npm install
cp .env.example .env   # then add your ANTHROPIC_API_KEY
```

## Run
```
npm run rank                 # rank all spike/out fixtures, print the digest preview
npm run rank -- --json       # dump the raw validated structured output
npm run rank -- --limit 5    # only the first 5 items (faster iteration)
npm run rank -- --model claude-opus-4-8   # A/B against Opus if Sonnet feels not-ruthless-enough
```

Default model is `claude-sonnet-4-6` (the locked production model — calibrate on what Phase 2 ships).

## How it works
- `src/fixtures.ts` — loads the real Phase-0 captures from `../spike/out/*.md` (skips `__fallback-og`),
  infers `source_type` from the adapter tag.
- `src/clean.ts` — strips Jina/transcript boilerplate (nav, login, "Trending now", footers) so the call
  ranks on substance. Flags deleted/missing pages as `fetch_miss` and excludes them.
- `rubric.md` — **the taste**. Signal vs. noise vs. opportunity, tuned to the north star. Hand-edit this.
- `src/rank.ts` — one Sonnet call over the whole batch (so clustering/dedupe sees everything): adaptive
  thinking, `effort: high`, structured JSON output (`src/schema.ts`), rubric cached for cheap re-runs.
- `src/render.ts` — prints the PLAN §5 digest shape: header counts, READ cards, SKIM one-liners,
  collapsed BURIED list, dedupe clusters, token/cost line.

## Calibration loop (the actual work)
1. Run it. Read the digest.
2. Disagree with verdicts? That's the point — say which.
3. Tune `rubric.md` (and the prompt in `src/rank.ts` if needed). Re-run.
4. Repeat until the ranking reads as *ruthless*.
5. Capture the agreed gold/noise calls as exemplar lines at the bottom of `rubric.md` (seeds the Phase 3
   feedback→rubric loop).

No automated tests — the human-eyeball calibration loop is the verification. Taste, not assertions.
