# NovaTrade

Exchange-style crypto trading app: dashboard, spot exchange, swap, wallet, AI trading agents (paper/ledger mode), Rent-a-Bot marketplace, analytics, activity, notifications, account and an admin console. Red/yellow theme with a raw-WebGL 3D layer (respects `prefers-reduced-motion`).

**Static frontend** (no build on Vercel) + **Supabase backend** (Postgres RPCs, RLS, Auth, Realtime, one edge function).

## What it is, honestly
- A **ledger exchange**: orders and swaps fill at the server price in `market_prices`. No real exchange, custody or blockchain is connected.
- **Deposits** are credited by an admin after they verify funds; **no deposit address is shown until an admin assigns one**. **Withdrawals** are reviewed by an admin; nothing is sent on-chain by this repo.
- **AI agents** run in ledger (paper) mode. Live mode is not implemented.
- Nothing shows as complete until the server confirms it. No secrets live in the browser (the anon key is public by design; protection is RLS + RPC checks).

## Deploy
1. **Database.** In the Supabase SQL editor run `supabase/migrations/002_trading_logic.sql` (requires the existing 001 schema). It is additive and idempotent.
2. **Make yourself admin:** `insert into public.user_roles(user_id,role) values ('<your auth user id>','admin');`
3. **Price feed.** Deploy `supabase/functions/market-feed` (verify_jwt **off**), set secret `FEED_SECRET`. Then edit the two placeholders in `supabase/migrations/003_schedule.sql` and run it (pg_cron calls the function every minute). Until prices are flowing, trading pages show "price unavailable". Prices older than `price_max_age_seconds` are refused by the server.
4. **Frontend.** Put your project URL and anon key in `config.js`. Push to GitHub, import into Vercel (framework: *Other*, no build command, output dir `.`). `vercel.json` sets a strict CSP.
5. In Supabase Auth settings set Site URL / redirect URLs to your Vercel domain.

## Develop
- Source is in `src/`; run `node build.js` to regenerate `index.html` and `app.js` (commit both).
- DB tests: `psql -f tests/db/stub_001.sql -f supabase/migrations/002_trading_logic.sql -f tests/db/test_flows.sql` on a scratch Postgres 16.
- UI tests (Playwright for Python): `bash tests/e2e/restart.sh`, then `python3 tests/e2e/smoke.py` and `python3 tests/e2e/flows.py`. These use a local test double of Supabase, never your real project.

## Docs
`docs/API_CONTRACT.md`, `PROGRESS.md`.
