import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { orderEvents, orders } from '@/db/schema'
import { toMinorUnits, type Currency, type PaymentEvent } from './types'

export type ApplyOutcome =
  | 'captured'
  | 'captured-out-of-band' // money arrived but the order had moved on
  | 'failed'
  | 'refunded'
  | 'duplicate'
  | 'amount-mismatch'
  | 'order-not-found'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// The single state machine every provider webhook funnels into. Signature
// verification already happened in the provider's parseWebhook; this layer
// decides what the event means for the order and writes the audit trail.
// Idempotent: replaying a callback changes nothing.
export async function applyPaymentEvent(
  providerId: string,
  event: PaymentEvent,
): Promise<ApplyOutcome> {
  const db = getDb()

  return db.transaction(async (tx) => {
    const byId = event.orderId && UUID_RE.test(event.orderId) ? event.orderId : null
    const found = byId
      ? await tx.select().from(orders).where(eq(orders.id, byId)).for('update')
      : await tx
          .select()
          .from(orders)
          .where(eq(orders.paymentRef, event.providerRef))
          .for('update')
    const order = found[0]
    if (!order) return 'order-not-found'

    const log = (type: string, extra: Record<string, unknown> = {}) =>
      tx.insert(orderEvents).values({
        orderId: order.id,
        actorId: null, // provider callback, not a person
        type,
        payload: {
          provider: providerId,
          ref: event.providerRef,
          amount_minor: event.amountMinor,
          currency: event.currency,
          detail: event.detail,
          ...extra,
        },
      })

    switch (event.type) {
      case 'captured': {
        if (order.paymentStatus === 'paid') return 'duplicate'

        const expected = toMinorUnits(order.total, order.currency as Currency)
        if (event.amountMinor !== expected || event.currency !== order.currency) {
          // never mark paid on a sum that does not match the order
          await log('payment.mismatch', {
            expected_minor: expected,
            expected_currency: order.currency,
          })
          return 'amount-mismatch'
        }

        if (order.status === 'pending') {
          await tx
            .update(orders)
            .set({
              paymentStatus: 'paid',
              paymentRef: event.providerRef,
              status: 'admin_review',
            })
            .where(eq(orders.id, order.id))
          await log('payment.captured')
          return 'captured'
        }

        // e.g. the order was cancelled while the customer sat on the
        // provider page. Record the money honestly; the admin decides.
        await tx
          .update(orders)
          .set({ paymentStatus: 'paid', paymentRef: event.providerRef })
          .where(eq(orders.id, order.id))
        await log('payment.captured', { order_status_kept: order.status })
        return 'captured-out-of-band'
      }

      case 'failed': {
        if (order.paymentStatus === 'paid') return 'duplicate' // stale callback
        await tx
          .update(orders)
          .set({ paymentStatus: 'failed' })
          .where(eq(orders.id, order.id))
        await log('payment.failed')
        return 'failed'
      }

      case 'refunded': {
        await tx
          .update(orders)
          .set({ paymentStatus: 'refunded' })
          .where(eq(orders.id, order.id))
        await log('payment.refunded')
        return 'refunded'
      }
    }
  })
}
