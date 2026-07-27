# Retro

Full-home solid timber furniture. Damietta, Egypt. Markets: Egypt, UAE,
Saudi Arabia, Kuwait.

Next.js 15 (App Router, TypeScript strict, Tailwind v4) with the platform
foundation and the admin dashboard: design tokens, bilingual routing with
full RTL, the Drizzle schema, migrations, seed data, the Row Level Security
policies that form the security boundary, and `/admin` built on shadcn/ui
patterns restyled to the Retro tokens.

## Layout

```
src/app/globals.css        design tokens as CSS custom properties, Tailwind v4
src/app/[locale]/          locale-scoped storefront tree (en, ar)
src/app/(tools)/login/     dashboard sign in (Supabase password auth)
src/app/(tools)/admin/     admin dashboard — see below
src/app/(tools)/workshop/  workshop floor dashboard — see below
src/middleware.ts          locale negotiation plus Supabase session refresh
src/i18n/                  locale config and dictionaries
src/lib/supabase/          server and browser Supabase clients
src/lib/auth.ts            requireAdmin() gate for every admin page and action
src/components/ui/         shadcn/ui components restyled to the tokens
src/db/schema/             Drizzle schema, split by domain
src/db/index.ts            lazy server-only Postgres client (drizzle + postgres-js)
src/db/seed.ts             development seed
drizzle/
  0000_init.sql              tables, enums, constraints, indexes, RLS enabled
  0001_rls_policies.sql      helper functions, triggers, grants, policies
  0002_order_ready_trigger.sql  order moves to ready when its last job completes
  0003_routed_status_job_created_at.sql  routed status, jobs.created_at
  0004_production_flow_triggers.sql  routed → in_production → ready flow
  0005_job_floor_columns.sql         jobs.product_id, jobs.qty, jobs.due_date
  0006_workshop_rls_hardening.sql    column grants, transition trigger, policy tightening
```

## Admin dashboard

`/admin` is gated by `requireAdmin()`: identity resolves through the
RLS-scoped Supabase client, and only admins pass. Pages then query through
the service-level Drizzle connection; every state change is a server action
that re-checks the admin, runs in a transaction, and writes to
`order_events`. The overview subscribes to Supabase Realtime on orders,
jobs, and payouts and re-renders on change — no polling, no animation.

- `/admin` — orders needing review, overdue jobs, outstanding payouts,
  revenue this month, live from the database
- `/admin/orders` — all orders, filterable by status and workshop
- `/admin/orders/[id]` — items, jobs per workshop step, order history.
  Confirming a paid order generates jobs from `product_workshops` and moves
  it to `routed`; jobs can be reassigned while unstarted; orders can be
  cancelled until they ship
- `/admin/products` — product CRUD including the workshop production chain
- `/admin/collections` — collection CRUD, drag to reorder products
- `/admin/payouts` — pending payouts by workshop, mark as transferred
- `/admin/workshops` — workshop CRUD and user assignment by email

The dashboard chrome is English for this phase; every content field in it
(names, descriptions, labels) is edited in both English and Arabic.

## Workshop dashboard

`/workshop` is one dashboard scoped by the signed-in user's `workshop_id` —
there is no per-workshop code. Unlike the admin surface it never touches the
service connection: every read and write goes through the user's own
Supabase client, so RLS row policies, column grants, and the job transition
trigger are the enforcement, and no `workshop_id` filter exists in
application code at all.

- `/workshop` — the job queue: incoming, in production, completed this
  month. Realtime on jobs, so new work appears without a refresh
- `/workshop/jobs/[id]` — the spec sheet: dimensions, species, joinery,
  finish, quantity, due date, and the job's own payout when raised.
  Actions: accept, reject with a reason, start production, mark complete
- `/workshop/history` — completed jobs with payout status

Jobs carry `product_id` and `qty` denormalised from the order item, which
is what lets a workshop see nothing of `order_items` — the table that
holds unit prices. A workshop user querying the API directly gets: zero
orders (no totals, no addresses), zero order items, zero foreign jobs or
payouts, no profiles but their own. Progress fields are the only writable
columns, and status only moves along the real workflow — jumping pending
to completed, reopening finished work, or editing qty fails at the
database. Catalog prices on `products` remain readable because they are
public storefront data.

Built for the floor: large touch targets, ink on bone contrast, type at
arm's-length sizes, overdue work flagged in walnut.

## Payments

Egypt runs on Paymob — cards, mobile wallets, and instalment providers,
each behind its own integration id — through the Intention API and unified
checkout. The provider sits behind a small interface
(`src/lib/payments/types.ts`); checkout and the webhook state machine talk
to the interface only, so the Gulf provider (Tap or Checkout.com) is a
second implementation registered for AED, SAR, and KWD — nothing about
checkout changes when it lands.

Flow:

- `startPayment` (or `POST /api/payments/create`) proves order ownership
  through the customer's RLS-scoped read, asks the provider for a hosted
  checkout URL, marks `payment_status = pending`, and logs
  `payment.initiated`
- `POST /api/payments/paymob` receives the transaction callback. The HMAC
  signature is the authentication; the payload is normalised and fed to
  one provider-agnostic state machine:
  - capture with the right amount and currency → `payment_status = paid`,
    order moves to `admin_review`, `payment.captured` logged
  - capture with the wrong sum → no state change, `payment.mismatch`
    logged for the admin
  - declined → `payment_status = failed`, the order stays pending so the
    customer can retry, `payment.failed` logged
  - replayed callbacks are no-ops
- Timeouts are explicit: providers do not reliably call back for abandoned
  sessions, so a cron posts to `/api/payments/sweep` (CRON_SECRET) and any
  payment sitting in `pending` past the window is marked failed with a
  `payment.expired` event. A capture that arrives after the sweep still
  wins — the money is recorded and the order proceeds to review.

Verified end to end against a mocked Paymob API and signed callbacks: the
initiation request carries the right minor units and integration ids, and
the webhook suite covers decline, tampered amounts, bad signatures,
capture, replay, timeout, late capture after timeout, and the ownership
and currency guards on creation.

## Typography and tokens

Fraunces (display) and Work Sans (body) for Latin, Amiri (display) and
IBM Plex Sans Arabic (body) for Arabic — all loaded through `next/font` and
self-hosted at build time. The `[dir='rtl']` root swaps the font variables,
so the same utilities serve both scripts. Colour tokens live in
`globals.css` under `@theme`: bone, ink, walnut, stone, ochre — with the
usage rules from `CLAUDE.md` enforced by convention there.

## Internationalisation

Routes live under `/{en,ar}`. Middleware negotiates from `Accept-Language`
and redirects bare paths; the locale layout sets `lang` and `dir` on `<html>`.
Arabic is a first-class locale with its own dictionary, not a bolt-on.

## Database workflow

```
cp .env.example .env        # DATABASE_URL plus the public Supabase keys
npm install
npm run db:migrate          # applies drizzle/ in order
npm run db:seed             # development data, destructive
```

`npm run db:generate` regenerates SQL after schema changes; `npm run build`
builds the app and typechecks. Migrations 0001 and 0002 assume a Supabase
project: they reference `auth.users`, `auth.uid()`, and the `anon` and
`authenticated` roles.

The seed creates 5 workshops, 12 products across 4 rooms, 3 collections,
4 room scenes, one user per role, and 6 orders covering every state:
pending, paid, in_production, ready, shipped (a Kuwait-market order priced
in KWD), and cancelled. The ready order earns its status through the
trigger — its jobs are completed by update, not set by hand.

## Schema notes

- Money is `numeric(12,3)` everywhere and every amount carries an explicit
  `currency` (`EGP`, `AED`, `SAR`, `KWD`). Three decimal places because the
  Kuwaiti dinar has them.
- Every reader-facing text field is bilingual (`_en`, `_ar`), including
  collection descriptions and hotspot labels.
- `profiles` extends `auth.users` one-to-one. A trigger creates a customer
  profile on signup; a check constraint ties the `workshop` role to exactly
  one `workshop_id` and keeps it off everyone else.
- `product_workshops` records which workshops touch a product and in what
  order. When an order is paid the server expands it into `jobs`, one per
  workshop step per order item, unique on `(order_item_id, sequence)`.
- `order_events` is an append-only audit log. No update or delete policy
  exists and both privileges are revoked. Job status changes append
  themselves through a trigger, so the log stays complete even though
  workshop users cannot write it directly.
- Database checks back up the state machine: a rejected job requires a
  `rejection_reason`, a transferred payout requires `transferred_at`,
  quantities are positive, amounts are non-negative.
- The order lifecycle is `pending → admin_review → routed → in_production →
  ready → shipped → delivered`, with `cancelled` reachable until shipping.
  The payment webhook moves a captured order into admin_review; admin
  confirmation moves it to routed; triggers handle the rest: the first
  accepted job moves routed to in_production, and the last completed job
  moves the order to ready, locking the order row so concurrent completions
  cannot race. Transitions append system events to `order_events`.

## Access model

Row Level Security is the boundary, not application code. Policies call
`security definer` helpers in a `private` schema (`user_role()`,
`user_workshop_id()`, `is_admin()`) so profile lookups cannot recurse.

| table              | anon           | customer                       | workshop                          | admin |
| ------------------ | -------------- | ------------------------------ | --------------------------------- | ----- |
| workshops          | active only    | active only                    | active plus its own               | all   |
| profiles           | none           | own row; name and phone only   | own row; name and phone only      | all   |
| products           | active only    | active only                    | active plus the ones it builds    | all   |
| product_workshops  | none           | none                           | own steps                         | all   |
| collections, rooms | read           | read                           | read                              | all   |
| orders             | none           | own; create pending            | none                              | all   |
| order_items        | none           | own; add while order pending   | none — jobs carry product and qty | all   |
| jobs               | none           | none                           | own; progress columns only, along the workflow | all |
| payouts            | none           | none                           | own, read only                    | all   |
| order_events       | none           | own orders; append only        | none directly (trigger appends)   | all   |

Role and workshop assignment on `profiles` can only change through the
service role: insert, update, and delete are revoked from API roles, then
update is granted back on `full_name` and `phone` alone.

The full policy set was verified against Postgres 16 with a stubbed Supabase
environment: 118 checks covering every role boundary, including forged
orders, cross-workshop reads and updates, privilege escalation through
`profiles.role`, tampering with the audit log, the production flow
triggers, and an adversarial workshop suite that attacks the boundary the
way a crafted API call would — skipping the workflow, rewriting quantities,
reassigning jobs, editing payouts. The dashboards were additionally
exercised end-to-end against a real PostgREST with signed JWTs.

## Stack

Next.js 15 (App Router), TypeScript strict, Tailwind CSS v4, Supabase,
Drizzle ORM. Framer Motion and shadcn/ui join with the first UI phase.
Deployed on Vercel. See `CLAUDE.md` for the design tokens and rules the
rest of the platform follows.
