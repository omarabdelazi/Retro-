# Retro

Full-home solid timber furniture. Damietta, Egypt. Markets: Egypt, UAE,
Saudi Arabia, Kuwait.

Next.js 15 (App Router, TypeScript strict, Tailwind v4) with the platform
foundation: design tokens, bilingual routing with full RTL, the Drizzle
schema, migrations, seed data, and the Row Level Security policies that form
the security boundary. No UI yet beyond a placeholder route.

## Layout

```
src/app/globals.css        design tokens as CSS custom properties, Tailwind v4
src/app/[locale]/          locale-scoped App Router tree (en, ar)
src/middleware.ts          locale negotiation and redirect
src/i18n/                  locale config and dictionaries
src/lib/supabase/          server and browser Supabase clients
src/db/schema/             Drizzle schema, split by domain
  enums.ts                 roles, currencies, statuses
  identity.ts              workshops, profiles
  catalog.ts               products, product_workshops, collections, collection_products
  commerce.ts              orders, order_items
  production.ts            jobs, payouts, order_events
  rooms.ts                 rooms, room_hotspots
  relations.ts             Drizzle relations for the query API
src/db/index.ts            server-only Postgres client (drizzle + postgres-js)
src/db/seed.ts             development seed
drizzle/
  0000_init.sql              tables, enums, constraints, indexes, RLS enabled
  0001_rls_policies.sql      helper functions, triggers, grants, policies
  0002_order_ready_trigger.sql  order moves to ready when its last job completes
```

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
- When the last job on an order reaches `completed`, a trigger moves the
  order to `ready` and appends an `order.ready` system event. The trigger
  locks the order row first so two jobs finishing at once cannot race.

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
| order_items        | none           | own; add while order pending   | items behind its jobs             | all   |
| jobs               | none           | none                           | own; update, cannot reassign      | all   |
| payouts            | none           | none                           | own, read only                    | all   |
| order_events       | none           | own orders; append only        | none directly (trigger appends)   | all   |

Role and workshop assignment on `profiles` can only change through the
service role: insert, update, and delete are revoked from API roles, then
update is granted back on `full_name` and `phone` alone.

The full policy set was verified against Postgres 16 with a stubbed Supabase
environment: 89 assertions covering every role boundary, including forged
orders, cross-workshop reads and updates, privilege escalation through
`profiles.role`, tampering with the audit log, the seed data, and the
order-ready trigger.

## Stack

Next.js 15 (App Router), TypeScript strict, Tailwind CSS v4, Supabase,
Drizzle ORM. Framer Motion and shadcn/ui join with the first UI phase.
Deployed on Vercel. See `CLAUDE.md` for the design tokens and rules the
rest of the platform follows.
