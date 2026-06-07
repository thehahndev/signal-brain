# Fetch spike (THROWAWAY — delete after Phase 0)

Proves we can fetch full, clean content — especially X threads — reliably and for cents,
before building anything. Spec + success bars + decision rule: [`../docs/phase-0-fetch-spike.md`](../docs/phase-0-fetch-spike.md).

## Run
1. `cd spike`
2. Edit **`urls.json`** — replace the placeholders with ~17 real URLs from your saves
   (mostly X, a few YouTube/article/PDF, and one deleted/protected tweet). Rows containing `...` are skipped.
3. `cp .env.example .env` and add at least `TWITTERAPI_IO_KEY` (the crux). Firecrawl/Jina optional.
4. `npm install`
5. `npm run spike`
6. Open **`scorecard.md`** and fill the **`whole?`** column by eye — *did we get the WHOLE thread, clean?*
   That human judgment is the real bar; char-count alone hides the head-tweet-only trap.

## The one thing to verify
The **twitterapi.io** adapter in `fetch-spike.ts` is a resilient best-effort: it recursively harvests
every text field from whatever JSON the API returns. Confirm the exact **thread/conversation endpoint**,
**auth header**, and **response shape** against https://docs.twitterapi.io, and set `TWITTERAPI_IO_ENDPOINT`
in `.env` if the default isn't the full-thread endpoint. Getting full threads (not just the head tweet)
is the GO/NO-GO question.

## Decision
Record GO / CONDITIONAL / NO-GO + the chosen adapter per source type at the bottom of `scorecard.md`,
then carry those into Phase 2 (`lib/fetch/*`).
