# TradeVerse Elite

A React + Vite + Tailwind market-intelligence and CPA attribution dashboard. Vercel hosts the frontend; Supabase provides Auth, PostgreSQL, RLS, aggregate RPCs, and the public tracking edge function.

## Included

- Private Supabase Auth sign-in/sign-up screen.
- Responsive dark command-centre UI, network directory, activity feed, tracking-link list, account metadata recorder, and provider console with popup fallback.
- PostgreSQL schema for network connections, links, tracking events, conversions, and audit logs.
- RLS owner/member access policies.
- `account_metrics` and `dashboard_metrics` SQL RPCs so displayed totals are computed by Postgres rather than summing downloaded records.
- Public Supabase Edge Function `track` for click redirects, event deduplication, postback key checks, country-source transparency, and conversion rows.
- Per-link account attribution and unassigned activity support.

## Local setup

1. Install Node.js 20+.
2. Copy `.env.example` to `.env.local` and fill in your Supabase project URL and publishable/anon key. Never put the Supabase service-role key in a `VITE_` variable or frontend file.
3. In your Supabase project, apply `supabase/migrations/202610090001_initial_schema.sql` using the SQL editor or Supabase CLI.
4. Install dependencies and start the app:

   ```bash
   npm install
   npm run dev
   ```

5. In Supabase Auth settings, configure your site's URL and allowed redirect URLs. Decide whether email confirmation should be required before production.

## Deploy to GitHub and Vercel

1. Create a private GitHub repository named `tradeverse-elite` and push this folder's contents.
2. Import the repository into Vercel as a Vite project. Build command: `npm run build`; output directory: `dist`.
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to Vercel Preview and Production environment variables, then redeploy.
4. Deploy the Supabase function using the Supabase CLI:

   ```bash
   supabase login
   supabase link --project-ref YOUR_PROJECT_REF
   supabase functions deploy track --no-verify-jwt
   ```

   The function uses Supabase's built-in `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` server-side secrets. Do not copy the service-role key into Vercel frontend environment variables.

## Tracking endpoint

Endpoint base: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/track`

- Click redirect: `GET /track?code=YOUR_CODE`
- JSON receipt: `GET /track?code=YOUR_CODE&format=json`
- Session event: `GET /track?code=YOUR_CODE&event_type=session_start&sid=SESSION_ID&format=json`
- Conversion callback (use POST JSON or query params):

  ```json
  {
    "code": "YOUR_CODE",
    "event_type": "conversion",
    "postback_key": "THE_LINK_POSTBACK_KEY",
    "sid": "SESSION_ID",
    "status": "approved",
    "revenue": 12.5,
    "payout": 12.5,
    "cost": 0,
    "currency": "USD",
    "provider": "provider-slug"
  }
  ```

The `postback_key` must be kept server-side / configured in the provider's callback settings. Do not put it in browser-visible links, analytics, or public pages. For a real provider, confirm its exact postback parameter names and signature scheme before going live. Consider rate limiting at the edge and a provider-specific HMAC/signature in addition to the per-link key for higher-risk campaigns.

## Important production notes

- A provider iframe may refuse to load due to `X-Frame-Options`, CSP `frame-ancestors`, or third-party cookie restrictions. The popup button is expected fallback behavior. The app does not inspect a provider's authenticated session and does not claim that sign-in created an API connection.
- Account recording is a metadata confirmation workflow, not OAuth. A network marked as connected here is recorded by the workspace, not necessarily API-connected to the provider.
- No provider-only clicks, leads, EPC, or payouts are fabricated. The UI says when provider data is not available.
- The first dashboard iteration includes working auth, account metadata, basic link creation, the tracking endpoint, and server-side metrics. Campaign CRUD, imported report files, official network API connectors, richer market news, and provider-specific OAuth are not implemented yet.
- Before production traffic, test callback replay, concurrent duplicate callbacks, malformed values, paused links, bad destination URLs, owner isolation, and all RLS policies in a staging Supabase project. The current edge handler uses unique dedupe keys and handles common duplicate replays; strict multi-row atomicity can be strengthened with a single database RPC transaction for conversion + event writes.
