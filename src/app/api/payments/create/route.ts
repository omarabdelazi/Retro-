import { NextResponse, type NextRequest } from 'next/server'
import { startPayment } from '@/lib/payments/checkout'
import type { PaymentMethod } from '@/lib/payments/types'

export const dynamic = 'force-dynamic'

const METHODS: PaymentMethod[] = ['card', 'wallet', 'installments']

// POST { orderId, method?, returnUrl? } → { redirectUrl }
// The caller is the signed-in customer; startPayment proves ownership
// through their RLS-scoped read before anything else happens.
export async function POST(request: NextRequest) {
  let body: { orderId?: string; method?: string; returnUrl?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid-json' }, { status: 400 })
  }

  if (!body.orderId) {
    return NextResponse.json({ error: 'order-id-required' }, { status: 400 })
  }
  const method = METHODS.includes(body.method as PaymentMethod)
    ? (body.method as PaymentMethod)
    : undefined

  const result = await startPayment(body.orderId, method, body.returnUrl)
  if (!result.ok) {
    const status =
      result.error === 'unauthenticated' ? 401
      : result.error === 'not-found' ? 404
      : result.error === 'not-payable' ? 409
      : 502
    return NextResponse.json({ error: result.error }, { status })
  }

  return NextResponse.json({ redirectUrl: result.redirectUrl })
}
