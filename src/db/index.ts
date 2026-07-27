import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// Server-side only. DATABASE_URL must never reach client code; import this
// module from Server Components, Route Handlers, and Server Actions only.
function createClient() {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error('DATABASE_URL is not set')
  }
  // prepare: false — required behind the Supabase transaction pooler
  return postgres(url, { prepare: false })
}

const globalForDb = globalThis as unknown as { pgClient?: ReturnType<typeof createClient> }

const client = globalForDb.pgClient ?? createClient()
if (process.env.NODE_ENV !== 'production') globalForDb.pgClient = client

export const db = drizzle(client, { schema })

export * as dbSchema from './schema'
