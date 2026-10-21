# API contract

All calls go to Supabase: `POST /rest/v1/rpc/<fn>` with `apikey` + `Authorization: Bearer <user JWT>`. Tables are readable via PostgREST under RLS (own rows only; admins via `is_admin()`); **clients have no direct write access**, all writes are RPCs. Errors come back as PostgREST errors whose `hint` is a stable code (e.g. `insufficient_funds`, `price_stale`, `mfa_required`, `limit_exceeded`, `forbidden`).

## User RPCs (role `authenticated`)
| Function | Purpose |
|---|---|
| `place_order(p_symbol, p_side, p_type, p_amount, p_price?, p_idem?)` | Market fills at server price; limit reserves funds and rests. Idempotent on `p_idem`. |
| `cancel_order(p_id)` | Cancels an open order and releases locked funds. |
| `swap_quote(p_from, p_to, p_amount)` / `swap_execute(p_quote, p_idem?)` | Expiring single-use quote, then execute. |
| `request_withdrawal(p_coin, p_network, p_address, p_memo, p_amount, p_idem?)` | Validates address regex, limits, fee, 2FA (aal2) when enabled; locks funds as `pending`. |
| `agent_save(...)` / `agent_action('start'|'pause'|'resume'|'stop')` | Own AI agent (ledger mode only). |
| `rent_bot(p_bot, p_plan, p_allocation, p_idem?)` / `rental_action(p_id, action)` | Rent-a-Bot. |
| `bot_stats()` | Real stats from recorded agent trades only. |
| `mark_notifications_read(p_ids?)`, `save_notification_prefs(...)`, `update_profile(p_display_name)`, `start_kyc()` | Account. |

## Admin RPCs (`is_admin()` required, audit-logged)
`admin_review_withdrawal(p_id, 'approve'|'complete'|'reject', p_txid?, p_note?)`, `admin_credit_deposit`, `admin_set_deposit_address`, `admin_set_kyc`, `admin_set_bot_available`, `admin_set_network`, `admin_set_setting`, `admin_adjust_balance`, `admin_overview`.

## Engine (service role only)
`run_engine()` = `match_open_orders()` + `check_price_alerts()` + `agent_tick()` + `expire_rentals()` + `snapshot_portfolios()`. Called by the `market-feed` edge function after each price update.

## Edge function
`POST /functions/v1/market-feed` with header `x-feed-secret: <FEED_SECRET>` -> `{ok, prices, engine}`; 401 without the secret.

## Public reference data (display only, never used to fill orders)
`https://data-api.binance.vision/api/v3`: klines, depth, trades, ticker.
