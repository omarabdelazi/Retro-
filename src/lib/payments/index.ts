import { paymob } from './paymob'
import type { Currency, PaymentProvider } from './types'

// One provider per market. Egypt runs on Paymob. The Gulf currencies get a
// second implementation of PaymentProvider (Tap or Checkout.com) registered
// here — checkout and the webhook routes do not change when that happens.
const providers: PaymentProvider[] = [paymob]

export function providerFor(currency: Currency): PaymentProvider {
  const provider = providers.find((p) => p.supports(currency))
  if (!provider) {
    throw new Error(
      `No payment provider configured for ${currency}. ` +
        'Gulf currencies need a Tap or Checkout.com implementation of PaymentProvider.',
    )
  }
  return provider
}

export function providerById(id: string): PaymentProvider | undefined {
  return providers.find((p) => p.id === id)
}

export * from './types'
