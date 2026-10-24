# NovaTrade

Exchange-style crypto trading app: dashboard, spot exchange, swap, wallet, AI trading agents (paper/ledger mode), Rent-a-Bot marketplace, analytics, activity, notifications, account and an admin console. Red/yellow theme with a raw-WebGL 3D layer (respects `prefers-reduced-motion`).

**Static frontend** (no build on Vercel) + **Supabase backend** (Postgres RPCs, RLS, Auth, Realtime, one edge function).

## What it is, honestly
- A **ledger exchange**: orders and swaps fill at the server price in `market_prices`. No real exchange, custody or blockchain is connected.
- **Deposits** are credited by an admin after they verify funds; **no deposit address is shown until an admin assigns one**. **Withdrawals** are reviewed by an admin; nothing is sent on-chain by this repo.
- **AI agents** run in ledger (paper) mode. Live mode is not implemented.
- Nothing shows as complete until the server confirms it. No secrets live in the browser (the anon key is public by design; protection is RLS + RPC checks).

## Deploy
1. **Database.** Requires the existing 001 schema; everything here is additive and idempotent.
2. **Make yourself admin:** `insert into public.user_roles(user_id,role) values ('<your auth user id>','admin');`
1. **Easiest:** paste `supabase/RUN_THIS_IN_SQL_EDITOR.sql` (002 + 003 combined) into the SQL editor and run it. It installs the trading functions, then generates a private feed secret and schedules the price feed every minute.
3. **Edge functions** (already deployed to project `gijigzbknjgleunttlib`): `market-feed` (prices + engine; authenticated by the secret in `public.feed_secret`) and `market-data` (public proxy for chart/order-book reference data, used only when the browser can't reach Binance directly). Both have verify_jwt off. Until prices flow, trading pages show "price unavailable"; the server refuses prices older than `price_max_age_seconds`.
4. **Frontend.** Put your project URL and anon key in `config.js`. Push to GitHub, import into Vercel (framework: *Other*, no build command, output dir `.`). `vercel.json` sets a strict CSP.
5. In Supabase Auth settings set Site URL / redirect URLs to your Vercel domain.

## Develop
- Source is in `src/`; run `node build.js` to regenerate `index.html` and `app.js` (commit both).
- DB tests: `psql -f tests/db/stub_001.sql -f supabase/migrations/002_trading_logic.sql -f tests/db/test_flows.sql` on a scratch Postgres 16.
- UI tests (Playwright for Python): `bash tests/e2e/restart.sh`, then `python3 tests/e2e/smoke.py` and `python3 tests/e2e/flows.py`. These use a local test double of Supabase, never your real project.

## Docs
`docs/API_CONTRACT.md`, `PROGRESS.md`.

## Stocks (Finnhub + Alpha Vantage)
The browser never sees the keys. Deploy `supabase/functions/stocks-data` and `market-feed`, then add secrets in Supabase > Edge Functions > Secrets:
`FINNHUB_API_KEY` (live quotes, profile, company news, market status) and `ALPHAVANTAGE_API_KEY` (top gainers/losers, daily history, search fallback).
Free plans are rate limited (Alpha Vantage ~25 calls/day); responses are cached on the server. With the Finnhub key set, `market-feed` also uses Finnhub for the tradable stock prices.

## Memecoins
`supabase/functions/meme-data` reads public GeckoTerminal and DexScreener data (no key). The page is discovery only: tokens open on GMGN / DexScreener / GeckoTerminal, trading happens in the user's own wallet.
GMGN offers an API key at gmgn.ai/ai (see their docs); an adapter can be added inside `meme-data` once you have the key and the documented base URL.
