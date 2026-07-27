# Retro

Full-home solid timber furniture. Damietta, Egypt. Markets: Egypt, UAE,
Saudi Arabia, Kuwait.

This repository currently contains the database layer: the Drizzle schema,
generated SQL migrations, and the Row Level Security policies that form the
platform's security boundary.

## Layout

```
src/db/schema/     Drizzle schema, split by domain
  enums.ts         roles, currencies, statuses
  identity.ts      workshops, profiles
  catalog.ts       products, product_workshops, collections, collection_products
  commerce.ts      orders, order_items
  production.ts    jobs, payouts, order_events
  rooms.ts         rooms, room_hotspots
  relations.ts     Drizzle relations for the query API
src/db/index.ts    server-only Postgres client (drizzle + postgres-js)
drizzle/
  0000_init.sql          tables, enums, constraints, indexes, RLS enabled
  0001_rls_policies.sql  helper functions, triggers, grants, policies
```

## Running migrations

```
cp .env.example .env        # set DATABASE_URL to the Supabase direct connection
npm install
npm run db:migrate
```

`npm run db:generate` regenerates SQL after schema changes; `npm run build`
typechecks. Migrations run in order, and 0001 assumes a Supabase project:
it references `auth.users`, `auth.uid()`, and the `anon` and `authenticated`
roles.

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
environment: 63 assertions covering every role boundary, including forged
orders, cross-workshop reads and updates, privilege escalation through
`profiles.role`, and tampering with the audit log.

## Stack

Next.js 15 (App Router), TypeScript strict, Tailwind CSS v4, Supabase,
Drizzle ORM, Framer Motion. Deployed on Vercel. See `CLAUDE.md` for the
design tokens and rules the rest of the platform follows.
