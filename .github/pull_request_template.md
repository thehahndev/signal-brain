<!--
Title: one plain sentence describing the outcome, e.g. "Surface links on
SKIM items". Write for a reviewer deciding whether to merge from this
description alone: plain sentences, no shorthand, no undefined
abbreviations. The reader did not watch the session that produced this
change. Answer their questions in order; do not walk the diff file by
file.
For a trivial change, one sentence plus a risk note is enough — delete
the headings below.
Delete these comments before submitting.
-->

<!-- Lead sentence: the outcome in plain English. Fold "Closes #N" in. -->

## Issue

<!-- The problem or goal, stated plainly. -->

## Implementation

<!-- What changed, described by what a user or a queued item now does
differently — behaviour first. If a mechanism matters (a capture-pipeline
change, a digest format change, a cron change), say why in the same
breath. -->

## Assumptions — worth checking

<!-- Things taken as true without confirming them, which this change may
be wrong if violated. Or "No material assumptions". -->
-

## Decisions — overrule if you disagree

<!-- Points where real alternatives existed and one was chosen: what and
why, so the reviewer can agree or overrule. -->
-

## Outcome

- **Verified** <!-- a scannable list, one line per check; group alike
  checks (typecheck and lint on one line). Each line names what ran and
  its result WITH COUNTS and the claim-strength visible: `npm test — 25
  passed` (executed) reads differently from "read it and it looks right"
  (inspected); include any live check against production or queued items.
  Put anything NOT verified on its own line, never buried at the tail of
  a sentence. -->
  -
- **Risk.** <!-- What could break, what is hard to reverse, what you are
  unsure of — digest formatting regressions, the cron timeout budget
  (Vercel Hobby, 60 seconds), capture-pipeline changes that affect
  already-queued items. If none, "No significant risk" and one line why. -->
- **Decision:** <!-- The specific thing the reviewer must decide beyond
  "merge", or "none — straightforward approve". -->
