import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// Server-side only; never import from a Client Component. The connection is
// the service-level DATABASE_URL, so it does not run under RLS — every query
// path that reaches it must first pass requireAdmin() (src/lib/auth.ts).
// RLS remains the boundary for everything that talks to Supabase directly:
// the browser client, PostgREST, and Realtime.
function createDb() {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error('DATABASE_URL is not set')
  }
  // prepare: false — required behind the Supabase transaction pooler
  const client = postgres(url, { prepare: false })
  return drizzle(client, { schema })
}

export type Db = ReturnType<typeof createDb>

const globalForDb = globalThis as unknown as { retroDb?: Db }

// Lazy so importing this module never needs an environment (next build).
export function getDb(): Db {
  return (globalForDb.retroDb ??= createDb())
}

export * as dbSchema from './schema'
