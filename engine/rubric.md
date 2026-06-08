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
- **Capability shift on an in-stack tool** — a new or graduated feature in Claude Code, Codex, Claude,
  browsers, or AI design tools, from the vendor's own post/docs, is READ-worthy even when phrased as an
  "announcement." A named, datable, usable capability on a tool the reader uses is signal, not noise.

## Bury (toward BURY)
- Hot takes, vibes, "this changes everything," reaction threads.
- Prediction / "X is dead" / "the end of Y" threads.
- Rehashed basics, beginner explainers, listicles a builder already knows.
- Engagement-bait: rage-bait, "🧵 a thread", "you're using X wrong", giveaway/clout posts.
- Substance-free announcements: hype with no named capability, no date, no link to the actual thing.
  (A primary-source announcement of a real, named, datable capability is signal — not this.)
- Pure self-promotion, course/cohort shilling, "DM me" funnels.

## Skim floor (don't over-bury credible pointers)
A post can carry bait or prediction framing and still deserve a glance — but only when it **faithfully
relays a specific, attributable primary thing**: a named talk or demo by a named credible figure (the
tool's creator, a vendor/Anthropic engineer), or an official/primary release you could go verify. Then it
lands at **SKIM, not bury**, even if the framing is hype.
The floor does NOT apply when the credibility or the release is merely *asserted* by a low-authority or
anonymous account — vague, unverified claims like "X quietly released Y" or "this guy is giving away Z"
with no named credible figure behind them. Judge those on their own thin substance and bury them. Bury, too,
when the underlying thing is itself thin: no named substance, pure opinion/prediction with no real event,
beginner basics, or engagement-bait wrapping nothing.

## Signal vs. hype test
**Signal** = named, shippable, datable, primary-sourced. A specific named thing exists, you could try or
verify it, there's a release/repo/doc/reproducible result behind it.
**Hype** = reaction, prediction, or vibe. The value is the take, not a verifiable artifact.

A post can be *about* a real release and still be hype if it adds only reaction. A scrappy post can be
signal if it carries a concrete, reproducible technique. Judge the substance, not the tone or the metrics.

## Opportunity (the 🟢 flag) — RESERVE IT HARD
Default to **false**. Set `opportunity_flag` = true ONLY when the item itself surfaces a **gap or wedge the
reader could turn into a product to build, sell, or market** — an unmet need, an underserved niche, a
genuine "someone should build X." The test: *could the reader start a new product or offer from this?*
If not, it is false.

NOT opportunities (these are signal, not 🟢 — no matter how good):
- A technique, workflow, config, or tip — even an excellent one (e.g. a dynamic-workflow harness pattern).
- A tool / library / repo someone *else* shipped that you could merely use or build on (e.g. an OSS
  security scanner, an open-sourced agent-skill pack).
- A vendor capability announcement.

When unsure, false. A typical weekly batch has **zero or one** opportunity. Over-flagging defeats the
badge — the whole value of 🟢 is that it's rare. A true opportunity may be pulled into READ at ~65.

## Verdict bands
Score 0–100, then map to a verdict. Be ruthless: at ~15–20 items/week only a handful earn READ.
- **READ (≈75–100)** — high signal, close to stack, actionable or a real opportunity. The few things the
  reader would regret missing. Aim for roughly the top 3–5 of a weekly batch, not more.
- **SKIM (≈45–74)** — real but marginal: tangential, partially known, or signal-but-low-stakes. A
  one-line glance, not a click.
- **BURY (≈0–44)** — noise by the rules above. Recoverable (never deleted) but off the main view.
Opportunity items may be pulled up into READ even at ~65 if the idea is strong.

## Clustering
Two items share a `cluster_id` ONLY if they are about the **same specific thing** — the same release, the
same repo, the same talk, the same announcement. Merely sharing a theme is NOT enough: two items both
"about agents," or both "about Claude Code," or one on multi-agent workflows and another on agent memory,
stay in **separate** clusters. Dedupe is for "the reader would otherwise see the same story twice," not for
topical grouping. When in doubt, give distinct ids. Two different posts that merely reference the same
*tool* (e.g. two separate "Claude Design" posts by different authors) are NOT one cluster — that's a shared
theme, not the same specific artifact; split them.

## Exemplars
Worked calls, seeded during calibration against real items. This is the shape Phase 3's feedback loop
(👍 gold / 👎 noise) will append to. Format: `verdict | source | one-line reason`.

Seeded from the first calibration pass (2026-06-08):

```
READ (signal)    | claude.com/blog/...how-we-use-skills        | primary Anthropic post; 9 named skill types + gotchas/verification advice; on-stack, actionable.
READ (signal)    | x.com/zodchiii/status/2057071039314542668   | copy-paste CC config (settings.json, hooks, workflow); immediately usable.
READ (signal)    | x.com/trq212/status/2061907337154367865     | primary CC-team deep dive on dynamic workflows w/ concrete patterns. NOT opportunity — it's a technique.
READ (signal)    | vercel.com/blog/...deepsec                  | named tool release (npx deepsec) close to the stack w/ real results; earns a top slot. NOT opportunity — it's someone else's tool to use.
READ (signal)    | x.com/OpenAIDevs/status/2057530209470210453 | primary-source capability shift on Codex (/goal graduated); in-stack, named, datable → READ, not skim.
SKIM (floor)     | x.com/.../boris-cherny-talk-summary         | hype "single-agent is dead" framing, BUT faithfully relays a named talk by the CC creator → glance-worthy, skim not bury.
BURY (floor n/a) | x.com/.../"Anthropic quietly released ..."   | low-authority account, unverified "quietly released" claim, no named credible figure → floor doesn't apply, judge on its own thin substance.
BURY (hype)      | x.com/charly.../status/2049796012370473241  | engagement-bait framing ("LITERALLY GIVING AWAY 🤯"); commentary on someone else's content, no primary substance.
BURY (off-stack) | youtube.com CSS scroll/conference talks     | strong content but zero AI-dev relevance for this reader.
```

Note from this pass: 🟢 opportunity was over-triggered (flagged on a technique, an OSS tool, and a skill
pack — all signal, not opportunity). Bar tightened above; expect 0 opportunities in this batch now.
