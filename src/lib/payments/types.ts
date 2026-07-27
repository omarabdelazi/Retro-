// The payment layer contract. Checkout and the webhook route talk to this
// interface only; a Gulf provider (Tap or Checkout.com) drops in by
// implementing it and registering for its currencies.

export type Currency = 'EGP' | 'AED' | 'SAR' | 'KWD'

export type PaymentMethod = 'card' | 'wallet' | 'installments'

export type CreatePaymentParams = {
  orderId: string
  /** decimal string as stored on the order, e.g. '68000.000' */
  amount: string
  currency: Currency
  /** omit to let the provider's checkout offer every configured method */
  method?: PaymentMethod
  customer: {
    name: string
    email: string
    phone: string
  }
  /** where the customer lands after the hosted checkout */
  returnUrl: string
}

export type CreatePaymentResult = {
  /** hosted checkout the customer is sent to */
  redirectUrl: string
  /** provider-side reference stored on the order as payment_ref */
  providerRef: string
}

// Normalised webhook event. Whatever a provider posts, the webhook route
// only ever acts on one of these.
export type PaymentEvent = {
  type: 'captured' | 'failed' | 'refunded'
  /** our order id, echoed back through the provider's merchant reference */
  orderId: string | null
  providerRef: string
  amountMinor: number
  currency: string
  /** provider's human-readable detail, for the audit log */
  detail: string
}

export type WebhookResult =
  | { ok: true; event: PaymentEvent }
  | { ok: false; reason: 'bad-signature' | 'unsupported-payload' }

export interface PaymentProvider {
  readonly id: string
  supports(currency: Currency): boolean
  methods(): PaymentMethod[]
  createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult>
  /** verify authenticity and normalise the provider's callback */
  parseWebhook(rawBody: string, url: URL): Promise<WebhookResult>
}

const MINOR_UNIT_FACTOR: Record<Currency, number> = {
  EGP: 100,
  AED: 100,
  SAR: 100,
  KWD: 1000, // three decimal places
}

export function toMinorUnits(amount: string, currency: Currency): number {
  return Math.round(Number(amount) * MINOR_UNIT_FACTOR[currency])
}
