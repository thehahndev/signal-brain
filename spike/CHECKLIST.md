# Phase 0 — Wholeness/Cleanliness Checklist

Click **Live** to open the tweet, click **Capture** to open the saved Jina output. Compare side
by side: does the capture contain the *whole* thread/article (not truncated), and is it *clean*
enough to rank without too much wrapper noise (`Title:… / X URL Source:… Markdown Content:`
boilerplate, "Don't miss what's happening" filler, unrelated reply-tweets, etc.)?

You don't need to check all 14 — the ⭐ five below are the longest/most complex captures
(by char count), so they're the best stress-test of depth + noise. If those look whole and
clean, the shorter single-tweet captures are very likely fine too (much less surface area to
go wrong).

## ⭐ Recommended (check these first — longest/most complex, ~12k–20k chars)

- [ ] ⭐ **PrajwalTomar_** (19,705 chars — longest capture; "Claude Design Workflow" thread+article)
      [Live](https://x.com/PrajwalTomar_/status/2056347864822083809) · [Capture](out/2056347864822083809__x-jina.md)

- [ ] ⭐ **trq212** (19,576 chars — long thread; "dynamic workflows in Claude Code")
      [Live](https://x.com/trq212/status/2061907337154367865) · [Capture](out/2061907337154367865__x-jina.md)

- [ ] ⭐ **zodchiii / darkzodchi** (13,045 chars — "Claude Code Setup" article+thread)
      [Live](https://x.com/zodchiii/status/2057071039314542668) · [Capture](out/2057071039314542668__x-jina.md)

- [ ] ⭐ **aiedge_** (12,900 chars — "How to Automate Your Life" guide)
      [Live](https://x.com/aiedge_/status/2057816817708789940) · [Capture](out/2057816817708789940__x-jina.md)

- [ ] ⭐ **addyosmani** (12,393 chars — "The Orchestration Tax")
      [Live](https://x.com/addyosmani/status/2059844244907696186) · [Capture](out/2059844244907696186__x-jina.md)

## Remaining (optional spot-checks — shorter single-tweet/thread captures)

- [ ] **rubenhassid** (6,897 chars — "How to make Claude (brutally) honest")
      [Live](https://x.com/rubenhassid/status/2057325513962574280) · [Capture](out/2057325513962574280__x-jina.md)

- [ ] **NainsiDwiv50980** (5,128 chars — "claude-code-setup plugin")
      [Live](https://x.com/NainsiDwiv50980/status/2057038989962653805) · [Capture](out/2057038989962653805__x-jina.md)

- [ ] **0xMovez** (5,022 chars — "give AI agents real memory")
      [Live](https://x.com/0xMovez/status/2058193075181089247) · [Capture](out/2058193075181089247__x-jina.md)

- [ ] **eng_khairallah1** (4,716 chars — "Boris Cherny / single-agent workflows")
      [Live](https://x.com/eng_khairallah1/status/2058196384969547794) · [Capture](out/2058196384969547794__x-jina.md)

- [ ] **0xwhrrari** (4,242 chars — "Claude prompting 101 workshop")
      [Live](https://x.com/0xwhrrari/status/2060468027703849017) · [Capture](out/2060468027703849017__x-jina.md)

- [ ] **OpenAIDevs** (4,242 chars — "Codex Thursday / goal mode")
      [Live](https://x.com/OpenAIDevs/status/2057530209470210453) · [Capture](out/2057530209470210453__x-jina.md)

- [ ] **DataChaz** (4,703 chars — "Claude Design playbook masterclass")
      [Live](https://x.com/DataChaz/status/2049796012370473241) · [Capture](out/2049796012370473241__x-jina.md)

- [ ] **wadefoster** (3,955 chars — "Zapier GTM agents open-sourced")
      [Live](https://x.com/wadefoster/status/2062517977938010121) · [Capture](out/2062517977938010121__x-jina.md)

## Robustness case (already verified — no need to check)

- [x] **Deleted tweet** — confirmed Jina returns X's "this page doesn't exist" boilerplate at
      ~500 chars with a `Warning: cached snapshot` flag. Distinctly recognizable as a fetch-miss.
      [Capture](out/1111111111111111111__x-jina.md)
