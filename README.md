# ATLAS — Private Trading Intelligence & CPA Operations

A responsive Next.js starter for a private financial market intelligence and CPA campaign workspace.

## Current status

This ZIP is a **starter prototype**, not a production-ready trading or CPA platform.

Included:
- Premium dark dashboard UI with animated CSS globe and chart visualization
- Responsive navigation and mobile layout
- Demo-state labels to avoid confusing placeholder metrics with live data
- Initial Supabase PostgreSQL schema migration
- Environment variable template and setup notes

Not yet included:
- Live financial market/news provider connections
- Mobidea/Mobipium API integrations
- Production authentication flow and invitation management
- Tracking redirect endpoint or conversion webhook
- Completed row-level security policies
- Production security review, tests, or deployment

## Requirements

- Node.js 20+
- npm
- A GitHub repository
- Optional: Supabase project and Vercel account

## Run locally

1. Extract the ZIP.
2. Open a terminal in this directory.
3. Install dependencies:

   ```bash
   npm install
   ```

4. Copy `.env.example` to `.env.local`.
5. For the visual prototype, environment variables can remain empty; no live data or authentication is connected.
6. Start the development server:

   ```bash
   npm run dev
   ```

7. Visit `http://localhost:3000`.

## Upload to GitHub

Create an empty **private** GitHub repository. Then run from this project directory:

```bash
git init
git add .
git commit -m "Initial ATLAS intelligence workspace"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
git push -u origin main
```

Replace the repository URL with your own. Never commit `.env.local`, API keys, access tokens, or service-role keys.

## Supabase setup

1. Create or choose a Supabase project.
2. Review `supabase/migrations/0001_initial_schema.sql` before applying it. It creates tables and enables RLS; it does not yet add permissive client policies.
3. Apply the migration to a **new or reviewed project only**. Do not run it blindly against a project with existing tables.
4. Configure auth, owner bootstrap, tested RLS policies, and server-only access before enabling private data.
5. Copy the project URL and publishable/anon key into `.env.local` only when the app's auth integration is implemented.

Recommended environment variable names for the next implementation step:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Use only a publishable/anon key in browser code. Never expose a Supabase service-role key or third-party provider secret in a `NEXT_PUBLIC_` variable.

## Vercel deployment

1. Import the private GitHub repository into Vercel.
2. Use the repository root as the project root.
3. Add environment variables in Vercel project settings when integrations are ready.
4. Deploy the prototype.
5. Before inviting users, finish authentication, RLS, rate limiting, secrets management, and security testing.

## Architecture plan

- `src/app`: Next.js routes and global styles
- `src/components`: responsive dashboard and reusable UI
- `supabase/migrations`: versioned database migrations
- `services` (planned): provider ingestion, click tracking, conversion reconciliation workers

## Data and safety principles

- Do not pretend sample data is live data.
- Use licensed financial data providers and respect redistribution restrictions.
- Confirm every CPA network's supported API operations before promising automated campaign creation.
- Verify conversion callbacks, deduplicate provider event IDs, and reconcile reported payouts.
- Record country as an estimate and avoid retaining raw IP addresses without a clear need and privacy basis.
- Enforce workspace access on the server and with database policies, not only in the UI.
- Treat this as market research and analytics, not an automated trade execution system.
