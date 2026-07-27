# Deploying Retro to Cloudflare

The app runs on Cloudflare Workers through the OpenNext adapter
(`@opennextjs/cloudflare`). The Worker build has been verified in workerd —
Cloudflare's runtime — locally: server rendering, middleware, both
dashboards, the RLS-scoped storefront, Postgres over TCP, and the Paymob
webhook's HMAC verification all pass there. What remains needs two accounts
you own: Supabase (the database) and Cloudflare (the host).

## 1. Supabase project

1. Create a project at supabase.com. Note three values from Project
   Settings: the **project URL**, the **anon key**, and the **connection
   strings** (Database → direct and transaction pooler).
2. From your machine, apply migrations and optional development data:

   ```
   cp .env.example .env
   # DATABASE_URL = the DIRECT (session, port 5432) connection string
   npm install
   npm run db:migrate
   npm run db:seed          # optional: development catalogue and orders
   ```

3. Create real logins in Authentication → Users (the signup trigger gives
   each a customer profile), then promote your admin in the SQL editor:

   ```sql
   update public.profiles set role = 'admin'
   where id = (select id from auth.users where email = 'you@example.com');
   ```

   Workshop users are assigned from `/admin/workshops` afterwards.

## 2. The one build-time fact that matters

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and
`NEXT_PUBLIC_SITE_URL` are **inlined at build time** — into the browser
bundle and the server bundle alike. Setting them only as Worker runtime
variables does nothing. They must be present in the environment that runs
`npm run cf:build`. Everything secret (`DATABASE_URL`, `PAYMOB_*`,
`CRON_SECRET`) stays runtime-only and never enters the bundle.

## 3. Deploy

Runtime `DATABASE_URL` should be the **transaction pooler** string
(port 6543); the code already runs `prepare: false` and opens per-request
connections on Workers, which is exactly what the pooler is for.

### Option A — from your machine

```
npx wrangler login

npx wrangler secret put DATABASE_URL
npx wrangler secret put PAYMOB_SECRET_KEY
npx wrangler secret put PAYMOB_PUBLIC_KEY
npx wrangler secret put PAYMOB_HMAC_SECRET
npx wrangler secret put PAYMOB_INTEGRATION_ID_CARD
npx wrangler secret put PAYMOB_INTEGRATION_ID_WALLET
npx wrangler secret put PAYMOB_INTEGRATION_ID_INSTALLMENTS
npx wrangler secret put CRON_SECRET

# .env must hold the three NEXT_PUBLIC_ values for the build
npm run cf:deploy
```

The command prints the workers.dev URL — the site is live there.

### Option B — build on Cloudflare from the Git repo

Cloudflare dashboard → Workers & Pages → Create → connect this repository.

- Build command: `npx opennextjs-cloudflare build`
- Deploy command: `npx opennextjs-cloudflare deploy`
- Add the three `NEXT_PUBLIC_` values as **build** variables and the
  secrets as Worker secrets.

Every push to the branch then deploys.

## 4. After the first deploy

- Set `NEXT_PUBLIC_SITE_URL` to the real URL and rebuild (it feeds payment
  return redirects).
- Point Paymob's transaction processed/response callbacks at
  `https://<your-domain>/api/payments/paymob` (dashboard, or the
  `PAYMOB_NOTIFICATION_URL` secret).
- Schedule the payment timeout sweep: any scheduler POSTing
  `https://<your-domain>/api/payments/sweep` with header
  `Authorization: Bearer <CRON_SECRET>` every 30–60 minutes. A GitHub
  Actions `schedule` workflow or cron-job.org both work.
- Custom domain: Worker → Settings → Domains & Routes.

## 5. Local preview of the production build

```
cp .dev.vars.example .dev.vars   # fill with your Supabase values
npm run cf:preview               # builds and serves in workerd on :8787
```

## Notes

- `wrangler.jsonc` enables `nodejs_compat`; postgres-js ships a workerd
  build that uses Cloudflare TCP sockets, and `node:crypto` (webhook HMAC)
  is covered by the compatibility layer.
- On Workers the database client is created per call
  (`src/db/index.ts`) because sockets cannot cross requests; behind the
  Supabase transaction pooler this is cheap. Cloudflare Hyperdrive is an
  optional later optimisation.
- `CLAUDE.md` still names Vercel as the deploy target; this repo now
  deploys to Cloudflare — update `CLAUDE.md` if Cloudflare is the
  decision.
