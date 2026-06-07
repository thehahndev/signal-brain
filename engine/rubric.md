# Signal Brain Rubric

The single source of truth for what counts as **signal vs. noise vs. opportunity**. Hand-editable;
the ranking call reads this verbatim each run. Be ruthless — surfacing too much is the failure mode.

## North star
The reader is an AI-software builder. They care about exactly two things:
1. **Building better with AI** — Claude Code, Codex, agents, web dev, browsers, AI design tools, the
   craft and tooling of shipping software with AI.
2. **Novel AI products/ideas to build, market, and sell** — opportunity is first-class, not a footnote.

Everything is judged against that reader. Generic AI news, mass-market takes, and content aimed at
non-builders is noise here even when it's "interesting."

## Rank UP (toward READ)
- **Novelty** — a genuinely new capability, technique, pattern, or release. Not a restatement of what a
  competent builder already knows.
- **Proximity to stack** — directly touches Claude Code, Codex, Claude/Anthropic tooling, agent harnesses,
  web dev, browsers, or AI design tools. The closer to what the reader actually uses, the higher.
- **Actionability** — the reader could *do* something with it today: a config to copy, a technique to try,
  a repo to clone, a workflow to adopt.
- **Opportunity** — points at something to build, sell, or market (see Opportunity below).
- **Primary source** — the release/repo/doc/benchmark itself, or a reproduction, beats commentary on it.

## Bury (toward BURY)
- Hot takes, vibes, "this changes everything," reaction threads.
- Prediction / "X is dead" / "the end of Y" threads.
- Rehashed basics, beginner explainers, listicles a builder already knows.
- Engagement-bait: rage-bait, "🧵 a thread", "you're using X wrong", giveaway/clout posts.
- Substance-free announcements: hype with no named capability, no date, no link to the actual thing.
- Pure self-promotion, course/cohort shilling, "DM me" funnels.

## Signal vs. hype test
**Signal** = named, shippable, datable, primary-sourced. A specific named thing exists, you could try or
verify it, there's a release/repo/doc/reproducible result behind it.
**Hype** = reaction, prediction, or vibe. The value is the take, not a verifiable artifact.

A post can be *about* a real release and still be hype if it adds only reaction. A scrappy post can be
signal if it carries a concrete, reproducible technique. Judge the substance, not the tone or the metrics.

## Opportunity (the 🟢 flag)
Set `opportunity_flag` = true ONLY when the item points at a **concrete thing the reader could build,
sell, or market** — a product gap, an unmet need, a monetizable workflow, a "someone should build X,"
a wedge a small builder could exploit. It must be specific enough to act on.
- Not every useful item is an opportunity. A great Claude Code tip is signal, not opportunity.
- Opportunity items get a guaranteed surfaced slot and the 🟢 badge even at a slightly lower score.
- When unsure, it is NOT an opportunity. Reserve the flag.

## Verdict bands
Score 0–100, then map to a verdict. Be ruthless: at ~15–20 items/week only a handful earn READ.
- **READ (≈75–100)** — high signal, close to stack, actionable or a real opportunity. The few things the
  reader would regret missing. Aim for roughly the top 3–5 of a weekly batch, not more.
- **SKIM (≈45–74)** — real but marginal: tangential, partially known, or signal-but-low-stakes. A
  one-line glance, not a click.
- **BURY (≈0–44)** — noise by the rules above. Recoverable (never deleted) but off the main view.
Opportunity items may be pulled up into READ even at ~65 if the idea is strong.

## Clustering
Items covering the **same** release/story/topic share one `cluster_id` (dedupe — the reader sees the
story once, ranked by the strongest member). Distinct topics get distinct ids.

## Exemplars
Worked calls, seeded during calibration against real items. This is the shape Phase 3's feedback loop
(👍 gold / 👎 noise) will append to. Format: `verdict | source | one-line reason`.

<!-- Seed these from the fixture calibration pass, e.g.:
READ (signal)      | x.com/.../status/... | named CC plugin + copyable config; primary source; on-stack.
BURY (hype)        | x.com/.../status/... | "single-agent is dead" prediction thread; no artifact.
READ (opportunity) | x.com/.../status/... | concrete unmet need a solo builder could ship this week.
-->
