import crypto from 'node:crypto'
import type {
  CreatePaymentParams,
  CreatePaymentResult,
  Currency,
  PaymentMethod,
  PaymentProvider,
  WebhookResult,
} from './types'
import { toMinorUnits } from './types'

// Paymob (accept.paymob.com), Intention API + unified checkout. Egypt only:
// cards, mobile wallets, and instalment providers, each behind its own
// integration id configured in the Paymob dashboard.
//
// Env:
//   PAYMOB_SECRET_KEY                server-side API key (Token auth)
//   PAYMOB_PUBLIC_KEY                used in the hosted checkout URL
//   PAYMOB_HMAC_SECRET               webhook signature secret
//   PAYMOB_INTEGRATION_ID_CARD
//   PAYMOB_INTEGRATION_ID_WALLET
//   PAYMOB_INTEGRATION_ID_INSTALLMENTS   comma-separated is fine (ValU, Sympl, …)
//   PAYMOB_API_BASE                  override for tests; defaults to production

const API_BASE = () => process.env.PAYMOB_API_BASE ?? 'https://accept.paymob.com'

function integrationIds(method?: PaymentMethod): number[] {
  const parse = (v: string | undefined) =>
    (v ?? '')
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n) && n > 0)

  const byMethod: Record<PaymentMethod, number[]> = {
    card: parse(process.env.PAYMOB_INTEGRATION_ID_CARD),
    wallet: parse(process.env.PAYMOB_INTEGRATION_ID_WALLET),
    installments: parse(process.env.PAYMOB_INTEGRATION_ID_INSTALLMENTS),
  }

  const ids = method
    ? byMethod[method]
    : [...byMethod.card, ...byMethod.wallet, ...byMethod.installments]
  if (ids.length === 0) {
    throw new Error(
      `Paymob integration id missing for ${method ?? 'any method'} — check PAYMOB_INTEGRATION_ID_* env`,
    )
  }
  return ids
}

// Paymob's transaction callback HMAC: these fields of obj, in exactly this
// order, concatenated and HMAC-SHA512'd with the dashboard HMAC secret.
const HMAC_FIELDS = [
  'amount_cents',
  'created_at',
  'currency',
  'error_occured',
  'has_parent_transaction',
  'id',
  'integration_id',
  'is_3d_secure',
  'is_auth',
  'is_capture',
  'is_refunded',
  'is_standalone_payment',
  'is_voided',
  'order.id',
  'owner',
  'pending',
  'source_data.pan',
  'source_data.sub_type',
  'source_data.type',
  'success',
] as const

function dig(obj: Record<string, unknown>, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>((acc, key) =>
      acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[key] : undefined,
    obj)
}

export function paymobTransactionHmac(
  obj: Record<string, unknown>,
  secret: string,
): string {
  const concatenated = HMAC_FIELDS.map((field) => {
    const value = dig(obj, field)
    return value === undefined || value === null ? '' : String(value)
  }).join('')
  return crypto.createHmac('sha512', secret).update(concatenated).digest('hex')
}

type PaymobTransaction = {
  id: number
  amount_cents: number
  currency: string
  success: boolean
  pending: boolean
  is_refunded: boolean
  is_voided: boolean
  'data.message'?: string
  data?: { message?: string }
  source_data?: { type?: string; sub_type?: string }
  order?: { id: number; merchant_order_id?: string | null }
}

export const paymob: PaymentProvider = {
  id: 'paymob',

  supports(currency: Currency) {
    return currency === 'EGP'
  },

  methods(): PaymentMethod[] {
    return ['card', 'wallet', 'installments']
  },

  async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
    const secretKey = process.env.PAYMOB_SECRET_KEY
    const publicKey = process.env.PAYMOB_PUBLIC_KEY
    if (!secretKey || !publicKey) {
      throw new Error('Paymob keys are not configured')
    }

    const [firstName, ...rest] = params.customer.name.trim().split(/\s+/)
    const response = await fetch(`${API_BASE()}/v1/intention/`, {
      method: 'POST',
      headers: {
        authorization: `Token ${secretKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        amount: toMinorUnits(params.amount, params.currency),
        currency: params.currency,
        payment_methods: integrationIds(params.method),
        special_reference: params.orderId,
        expiration: 3600,
        billing_data: {
          first_name: firstName || 'NA',
          last_name: rest.join(' ') || 'NA',
          email: params.customer.email,
          phone_number: params.customer.phone,
          apartment: 'NA',
          building: 'NA',
          street: 'NA',
          city: 'NA',
          country: 'EG',
        },
        redirection_url: params.returnUrl,
        ...(process.env.PAYMOB_NOTIFICATION_URL
          ? { notification_url: process.env.PAYMOB_NOTIFICATION_URL }
          : {}),
      }),
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(`Paymob intention failed (${response.status}): ${body.slice(0, 300)}`)
    }

    const intention = (await response.json()) as { client_secret: string; id: string }
    return {
      redirectUrl: `${API_BASE()}/unifiedcheckout/?publicKey=${encodeURIComponent(
        publicKey,
      )}&clientSecret=${encodeURIComponent(intention.client_secret)}`,
      providerRef: params.orderId, // special_reference comes back as merchant_order_id
    }
  },

  async parseWebhook(rawBody: string, url: URL): Promise<WebhookResult> {
    const secret = process.env.PAYMOB_HMAC_SECRET
    if (!secret) return { ok: false, reason: 'bad-signature' }

    let payload: { type?: string; obj?: Record<string, unknown> }
    try {
      payload = JSON.parse(rawBody)
    } catch {
      return { ok: false, reason: 'unsupported-payload' }
    }
    if (payload.type !== 'TRANSACTION' || !payload.obj) {
      return { ok: false, reason: 'unsupported-payload' }
    }

    const given = url.searchParams.get('hmac') ?? ''
    const expected = paymobTransactionHmac(payload.obj, secret)
    const a = Buffer.from(given)
    const b = Buffer.from(expected)
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return { ok: false, reason: 'bad-signature' }
    }

    const txn = payload.obj as unknown as PaymobTransaction
    const type = txn.is_refunded
      ? 'refunded'
      : txn.success && !txn.is_voided
        ? 'captured'
        : 'failed'

    return {
      ok: true,
      event: {
        type,
        orderId: txn.order?.merchant_order_id ?? null,
        providerRef: String(txn.id),
        amountMinor: txn.amount_cents,
        currency: txn.currency,
        detail:
          txn.data?.message ??
          `${txn.source_data?.type ?? 'unknown'} ${type} (paymob txn ${txn.id})`,
      },
    }
  },
}
