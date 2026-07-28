import { NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { getDb } from '@/db'

export const dynamic = 'force-dynamic'

// Deployment diagnostic: exercises the direct database connection and
// reports the failure verbatim. Password is masked; safe to leave in place.
export async function GET() {
  const raw = process.env.DATABASE_URL
  const hint = raw ? raw.replace(/\/\/([^:]+):[^@]*@/, '//$1:***@') : 'MISSING'

  try {
    const db = getDb()
    const rows = await db.execute(
      sql`select count(*)::int as products from public.products`,
    )
    return NextResponse.json({ ok: true, hint, result: rows[0] })
  } catch (error) {
    const e = error as Error & {
      code?: string
      cause?: { message?: string; code?: string }
    }
    return NextResponse.json({
      ok: false,
      hint,
      error: e.message,
      code: e.code ?? null,
      cause: e.cause
        ? { message: e.cause.message ?? null, code: e.cause.code ?? null }
        : null,
    })
  }
}
