'use server'

import { revalidatePath } from 'next/cache'
import { eq, sql } from 'drizzle-orm'
import { getDb } from '@/db'
import { jobs, orderEvents, orderItems, payouts } from '@/db/schema'
import { requireAdmin } from '@/lib/auth'

export async function markPayoutTransferred(payoutId: string) {
  const admin = await requireAdmin()
  const db = getDb()

  await db.transaction(async (tx) => {
    const [payout] = await tx
      .select({
        id: payouts.id,
        status: payouts.status,
        workshopId: payouts.workshopId,
        amount: payouts.amount,
        currency: payouts.currency,
        orderId: sql<string>`(
          select oi.order_id from ${jobs} j
          join ${orderItems} oi on oi.id = j.order_item_id
          where j.id = ${payouts.jobId}
        )`,
      })
      .from(payouts)
      .where(eq(payouts.id, payoutId))
      .for('update')
    if (!payout || payout.status !== 'pending') return

    await tx
      .update(payouts)
      .set({ status: 'transferred', transferredAt: new Date() })
      .where(eq(payouts.id, payoutId))

    await tx.insert(orderEvents).values({
      orderId: payout.orderId,
      actorId: admin.id,
      type: 'payout.transferred',
      payload: {
        payout_id: payout.id,
        workshop_id: payout.workshopId,
        amount: payout.amount,
        currency: payout.currency,
      },
    })
  })

  revalidatePath('/admin/payouts')
  revalidatePath('/admin')
}
