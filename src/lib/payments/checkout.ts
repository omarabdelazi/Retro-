import { eq } from 'drizzle-orm'
import { redirect } from 'next/navigation'
import { getDb } from '@/db'
import { orderEvents, orders } from '@/db/schema'
import { createClient } from '@/lib/supabase/server'
import { providerFor } from './index'
import type { Currency, PaymentMethod } from './types'

export type StartPaymentResult =
  | { ok: true; redirectUrl: string }
  | { ok: false; error: 'unauthenticated' | 'not-found' | 'not-payable' | 'provider' }

// Called by checkout (server action or the /api/payments/create route).
// Ownership is proven through the customer's own RLS-scoped read: if the
// order is not theirs, it does not exist. Only after that does the service
// connection record the initiated payment.
export async function startPayment(
  orderId: string,
  method?: PaymentMethod,
  returnUrl?: string,
): Promise<StartPaymentResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'unauthenticated' }

  const { data: order } = await supabase
    .from('orders')
    .select('id, status, payment_status, total, currency, shipping_address')
    .eq('id', orderId)
    .maybeSingle()
  if (!order) return { ok: false, error: 'not-found' }

  // only unpaid pending orders can start (or retry) a payment
  if (
    order.status !== 'pending' ||
    !['unpaid', 'pending', 'failed'].includes(order.payment_status)
  ) {
    return { ok: false, error: 'not-payable' }
  }

  const address = order.shipping_address as { name?: string; phone?: string } | null

  let redirectUrl: string
  let providerRef: string
  let providerId: string
  try {
    const provider = providerFor(order.currency as Currency)
    providerId = provider.id
    const created = await provider.createPayment({
      orderId: order.id,
      amount: order.total,
      currency: order.currency as Currency,
      method,
      customer: {
        name: address?.name ?? user.user_metadata?.full_name ?? 'NA',
        email: user.email ?? 'na@retro.example',
        phone: address?.phone ?? user.user_metadata?.phone ?? 'NA',
      },
      returnUrl:
        returnUrl ??
        `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'}/en`,
    })
    redirectUrl = created.redirectUrl
    providerRef = created.providerRef
  } catch (error) {
    console.error('payment provider error', error)
    return { ok: false, error: 'provider' }
  }

  const db = getDb()
  await db.transaction(async (tx) => {
    await tx
      .update(orders)
      .set({ paymentStatus: 'pending', paymentRef: providerRef })
      .where(eq(orders.id, order.id))
    await tx.insert(orderEvents).values({
      orderId: order.id,
      actorId: user.id,
      type: 'payment.initiated',
      payload: { provider: providerId, method: method ?? 'any', ref: providerRef },
    })
  })

  return { ok: true, redirectUrl }
}

/** form-action variant for the future checkout page */
export async function startPaymentAndRedirect(orderId: string, method?: PaymentMethod) {
  const result = await startPayment(orderId, method)
  if (result.ok) redirect(result.redirectUrl)
  redirect(`/?payment-error=${result.error}`)
}
