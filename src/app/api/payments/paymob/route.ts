import { NextResponse, type NextRequest } from 'next/server'
import { applyPaymentEvent } from '@/lib/payments/apply'
import { paymob } from '@/lib/payments/paymob'

export const dynamic = 'force-dynamic'

// Paymob transaction-processed callback. The HMAC in the query string is
// the authentication; a valid signature is the only thing that lets a
// request touch payment state. Always answers quickly — Paymob retries on
// non-2xx and we want retries only for genuine transient failures.
export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const parsed = await paymob.parseWebhook(rawBody, request.nextUrl)

  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.reason },
      { status: parsed.reason === 'bad-signature' ? 401 : 400 },
    )
  }

  const outcome = await applyPaymentEvent(paymob.id, parsed.event)
  return NextResponse.json({ outcome })
}
