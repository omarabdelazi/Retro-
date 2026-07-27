# Retro — Platform

Full-home solid timber furniture. Damietta, Egypt. Markets: Egypt, UAE, Saudi Arabia, Kuwait.

## Brand

Retro is not a style, it is a standard: furniture made the way it used to be made,
for how people live now. Voice is assured, plain and specific — name materials and
joinery directly. Never use exclamation marks anywhere in UI copy. Never use the words
elegant, stunning, luxurious, premium, elevate, transform, curated, bespoke, or solutions.

## Design tokens — do not deviate

Colour:
  --bone:   #F3EEE5   /* dominant ground, 60-70% of any screen */
  --ink:    #141210   /* all text, 20-25% */
  --walnut: #5C3D2E   /* warmth, blocks, 5-10% */
  --stone:  #A8A099   /* rules, dividers, captions only — never body text */
  --ochre:  #C08A2E   /* accent, max 5%, interaction states only */

Pure white and pure black are forbidden. Ochre on Bone is forbidden — it fails contrast.
Ochre is reserved for hover, focus, and active states, which gives it a job and stops it
becoming decoration.

Type:
  Display — Fraunces (Google Fonts, variable). Low WONK, high optical size.
  Body    — Work Sans (Google Fonts).
  Arabic  — Amiri for display, IBM Plex Sans Arabic for text.
  Two weights only: 400 and 500. Body never below 16px.

Motion: purposeful only. Page-load sequence on the storefront, hover micro-interactions
on product cards, scroll reveals on the story pages. Dashboards get almost none — they
are tools, and animation in a tool is friction. Respect prefers-reduced-motion everywhere.

## Stack — locked, do not substitute

- Next.js 15, App Router, TypeScript strict
- Tailwind CSS v4
- shadcn/ui — dashboards only, restyled to the tokens above. Never on the storefront.
- Supabase — Postgres, Auth, Row Level Security, Realtime, Storage
- Drizzle ORM
- Framer Motion
- @google/model-viewer for 3D and AR (phase 6 only)
- Deployed on Vercel

## Roles

- `admin` — sees everything
- `workshop` — scoped to exactly one workshop_id
- `customer` — own orders only

Row Level Security is the security boundary, not application code. Every table gets
policies. A workshop user must never be able to read another workshop's jobs, even
through a crafted API call.

## Rules

- Bilingual from day one: English and Arabic, with full RTL. Do not bolt Arabic on later.
- Every price carries an explicit currency. Four markets, four currencies.
- Server Components by default. Client Components only where interaction requires it.
- No secrets in client code.
- Run `npm run build` and fix all errors before saying a task is done.
