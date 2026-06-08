# Signal Brain

A ruthless **attention-filter** for AI-development content. Capture links while scrolling →
fetch the content behind them → rank + cluster against a personal rubric → push a bounded,
ranked **daily Telegram digest** that says *"read these 3, skim these 4, here's why I buried the rest."*

Input pipeline that feeds **dev-brain** (the separate knowledge store). Signal Brain triages;
dev-brain keeps the gold.

## Status: Phase 2 (plumbing) — built

- **Phase 0** — fetch spike → Jina for X+articles, `youtube-transcript` for YouTube. ✅
- **Phase 1** — judgment engine (`rubric.md` + one structured Claude call). ✅ converged.
- **Phase 2** — Telegram capture + Neon + Vercel Cron + daily digest. ← this.
- **Phase 3** — close the 👍/👎 → rubric commit-back loop. (not yet)

Background: [`docs/HANDOFF.md`](docs/HANDOFF.md) · [`docs/PLAN.md`](docs/PLAN.md) · [`spike/scorecard.md`](spike/scorecard.md)

## Architecture

```
Telegram share ─▶ POST /api/telegram ─▶ capture: normalize → dedup → fetch (Jina / transcript) → store
                                         callback: 👍/👎 feedback

Vercel Cron ────▶ GET /api/cron/digest ─▶ rank un-surfaced backlog (engine + rubric.md)
                                          → assemble per-card messages → push → mark surfaced
```

- `lib/engine/*` — the graduated Phase-1 judgment engine (one `claude-sonnet-4-6` structured call).
  `rank()` takes the rubric as input; the canonical **`rubric.md`** lives at the repo root.
- `lib/fetch/*` — single full-extract adapters: `jina.ts` (X + articles), `youtube.ts` (transcript),
  `fallback.ts` (OG metadata), `normalize.ts` (URL normalize + dedup + source detection).
- `lib/db/*` — Drizzle schema (`items`, `runs`) over Neon (HTTP driver).
- `lib/telegram/*` + `lib/digest/*` — Bot API client, webhook verification, digest assembly + pipeline.

## Local development

```bash
npm install
cp .env.example .env.local        # fill DATABASE_URL (Neon dev branch) + ANTHROPIC_API_KEY
npm run db:migrate                # apply migrations to the Neon dev branch
npm run seed:local                # seed the 18 real Phase-0 fixtures as fetched items
npm run digest:local              # dry run: rank + print the digest (no Telegram push)
npm run digest:local -- --send    # actually push to the configured bot/chat

npm run dev                       # Next.js dev server (webhook + cron routes)
npm run typecheck && npm run lint && npm test && npm run build   # the CI gate
```

`.env` is read by the `tsx` scripts (`seed:local`, `digest:local`); `.env.local` by `next dev`.

## Setup / deploy (one-time)

1. **Telegram bot** — message [@BotFather](https://t.me/BotFather) → `/newbot` → copy the token into
   `TELEGRAM_BOT_TOKEN`. Send your new bot any message, then read your numeric chat id from
   `https://api.telegram.org/bot<TOKEN>/getUpdates` into `TELEGRAM_CHAT_ID` (the single allow-listed chat).
2. **Neon** — provision via the Vercel Neon integration (a preview branch per PR protects prod data);
   `DATABASE_URL` is injected automatically.
3. **Env** — set `ANTHROPIC_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, a random
   `TELEGRAM_WEBHOOK_SECRET`, and a random `CRON_SECRET` in Vercel.
4. **Deploy** — push to Vercel. The daily cron is configured in [`vercel.json`](vercel.json) (`0 7 * * *`).
5. **Register the webhook** (once, against the prod URL):
   ```bash
   curl "https://api.telegram.org/bot<TOKEN>/setWebhook" \
     -d url="https://<your-app>.vercel.app/api/telegram" \
     -d secret_token="<TELEGRAM_WEBHOOK_SECRET>"
   ```

## Calibration harness

`engine/` stays as the Phase-1 calibration harness — it imports the same `lib/engine/*` code and the
same root `rubric.md`, so there's one source of truth. Re-tune taste with `cd engine && npm run rank`.
