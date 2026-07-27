'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { and, asc, eq, inArray } from 'drizzle-orm'
import { getDb } from '@/db'
import { jobs, orderEvents, orderItems, orders, productWorkshops } from '@/db/schema'
import { requireAdmin } from '@/lib/auth'

// Admin state changes for a single order. Each one runs in a transaction,
// re-checks the state it depends on (the UI can be stale), and writes what
// happened to order_events.

function backTo(orderId: string, error?: string): never {
  redirect(`/admin/orders/${orderId}${error ? `?error=${error}` : ''}`)
}

export async function confirmOrder(orderId: string) {
  const admin = await requireAdmin()
  const db = getDb()

  const result = await db.transaction(async (tx) => {
    const [order] = await tx
      .select({ id: orders.id, status: orders.status })
      .from(orders)
      .where(eq(orders.id, orderId))
      .for('update')
    if (!order) return 'not-found'
    if (order.status !== 'admin_review' && order.status !== 'paid') return 'not-paid'

    const items = await tx
      .select({
        id: orderItems.id,
        productId: orderItems.productId,
        qty: orderItems.qty,
      })
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId))
    if (items.length === 0) return 'no-items'

    const steps = await tx
      .select({
        productId: productWorkshops.productId,
        workshopId: productWorkshops.workshopId,
        sequence: productWorkshops.sequence,
      })
      .from(productWorkshops)
      .where(
        inArray(
          productWorkshops.productId,
          items.map((i) => i.productId),
        ),
      )
      .orderBy(asc(productWorkshops.sequence))

    const byProduct = new Map<string, typeof steps>()
    for (const step of steps) {
      const list = byProduct.get(step.productId) ?? []
      list.push(step)
      byProduct.set(step.productId, list)
    }
    if (items.some((item) => !byProduct.get(item.productId)?.length)) {
      return 'no-steps'
    }

    // each step gets two weeks, staggered down the chain
    const jobRows = items.flatMap((item) =>
      (byProduct.get(item.productId) ?? []).map((step) => ({
        orderItemId: item.id,
        productId: item.productId,
        qty: item.qty,
        workshopId: step.workshopId,
        sequence: step.sequence,
        dueDate: new Date(Date.now() + step.sequence * 14 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10),
      })),
    )

    // idempotent against double-submits: (order_item_id, sequence) is unique
    await tx.insert(jobs).values(jobRows).onConflictDoNothing()
    await tx.update(orders).set({ status: 'routed' }).where(eq(orders.id, orderId))
    await tx.insert(orderEvents).values({
      orderId,
      actorId: admin.id,
      type: 'order.routed',
      payload: { job_count: jobRows.length },
    })
    return null
  })

  revalidatePath('/admin/orders')
  revalidatePath(`/admin/orders/${orderId}`)
  if (result) backTo(orderId, result)
  backTo(orderId)
}

export async function reassignJob(orderId: string, jobId: string, workshopId: string) {
  const admin = await requireAdmin()
  const db = getDb()

  const result = await db.transaction(async (tx) => {
    const [job] = await tx
      .select({
        id: jobs.id,
        status: jobs.status,
        workshopId: jobs.workshopId,
      })
      .from(jobs)
      .where(eq(jobs.id, jobId))
      .for('update')
    if (!job) return 'not-found'
    // once a workshop has started, the work sits on their bench — reassigning
    // in_progress or finished jobs would falsify the record
    if (job.status !== 'pending' && job.status !== 'accepted') return 'job-started'
    if (job.workshopId === workshopId) return null

    await tx
      .update(jobs)
      .set({ workshopId, status: 'pending', acceptedAt: null })
      .where(eq(jobs.id, jobId))
    await tx.insert(orderEvents).values({
      orderId,
      actorId: admin.id,
      type: 'job.reassigned',
      payload: { job_id: jobId, from: job.workshopId, to: workshopId },
    })
    return null
  })

  revalidatePath(`/admin/orders/${orderId}`)
  if (result) backTo(orderId, result)
  backTo(orderId)
}

export async function cancelOrder(orderId: string) {
  const admin = await requireAdmin()
  const db = getDb()

  const result = await db.transaction(async (tx) => {
    const [order] = await tx
      .select({ id: orders.id, status: orders.status })
      .from(orders)
      .where(eq(orders.id, orderId))
      .for('update')
    if (!order) return 'not-found'
    if (['shipped', 'delivered', 'cancelled'].includes(order.status)) {
      return 'not-cancellable'
    }

    // jobs nobody has started disappear with the order; started work stays
    // on record for payout decisions
    const removed = await tx
      .delete(jobs)
      .where(
        and(
          inArray(
            jobs.orderItemId,
            tx
              .select({ id: orderItems.id })
              .from(orderItems)
              .where(eq(orderItems.orderId, orderId)),
          ),
          inArray(jobs.status, ['pending', 'accepted']),
        ),
      )
      .returning({ id: jobs.id })

    await tx.update(orders).set({ status: 'cancelled' }).where(eq(orders.id, orderId))
    await tx.insert(orderEvents).values({
      orderId,
      actorId: admin.id,
      type: 'order.cancelled',
      payload: { removed_jobs: removed.length, previous_status: order.status },
    })
    return null
  })

  revalidatePath('/admin/orders')
  revalidatePath(`/admin/orders/${orderId}`)
  if (result) backTo(orderId, result)
  backTo(orderId)
}
