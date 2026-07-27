import { NextResponse, type NextRequest } from 'next/server'
import { eq, sql } from 'drizzle-orm'
import { getDb } from '@/db'
import { orderEvents, orders } from '@/db/schema'

export const dynamic = 'force-dynamic'

// The explicit timeout path. Providers do not reliably call back when a
// checkout session is abandoned, so a cron hits this route and any payment
// that has sat in 'pending' past the window is marked failed with an
// audit event. A later capture callback still wins — money is never lost,
// the failed mark just unblocks retry.
const DEFAULT_TIMEOUT_MINUTES = 120

export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  const given = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!secret || given !== secret) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const minutes = Number(process.env.PAYMENT_TIMEOUT_MINUTES) || DEFAULT_TIMEOUT_MINUTES
  const db = getDb()

  const stale = await db
    .select({ id: orders.id })
    .from(orders)
    .where(
      sql`${orders.paymentStatus} = 'pending'
        and exists (
          select 1 from ${orderEvents} e
          where e.order_id = ${orders.id} and e.type = 'payment.initiated'
        )
        and not exists (
          select 1 from ${orderEvents} e
          where e.order_id = ${orders.id}
            and e.type = 'payment.initiated'
            and e.created_at > now() - make_interval(mins => ${minutes})
        )`,
    )

  for (const order of stale) {
    await db.transaction(async (tx) => {
      const updated = await tx
        .update(orders)
        .set({ paymentStatus: 'failed' })
        .where(
          sql`${orders.id} = ${order.id} and ${orders.paymentStatus} = 'pending'`,
        )
        .returning({ id: orders.id })
      if (updated.length) {
        await tx.insert(orderEvents).values({
          orderId: order.id,
          actorId: null,
          type: 'payment.expired',
          payload: {
            reason: `no provider callback within ${minutes} minutes`,
          },
        })
      }
    })
  }

  return NextResponse.json({ expired: stale.length })
}
