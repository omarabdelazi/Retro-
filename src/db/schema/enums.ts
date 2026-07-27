import { pgEnum } from 'drizzle-orm/pg-core'

export const userRole = pgEnum('user_role', ['admin', 'workshop', 'customer'])

// Four markets, four currencies. KWD carries three decimal places,
// which is why every money column is numeric(12,3).
export const currency = pgEnum('currency', ['EGP', 'AED', 'SAR', 'KWD'])

// Lifecycle: pending → paid → routed → in_production → ready → shipped →
// delivered, with cancelled reachable until shipping. 'routed' sits last in
// the array because Postgres only appends enum values; array position does
// not affect behaviour.
export const orderStatus = pgEnum('order_status', [
  'pending',
  'paid',
  'in_production',
  'ready',
  'shipped',
  'delivered',
  'cancelled',
  'routed',
])

export const paymentStatus = pgEnum('payment_status', [
  'unpaid',
  'pending',
  'paid',
  'failed',
  'refunded',
])

export const jobStatus = pgEnum('job_status', [
  'pending',
  'accepted',
  'in_progress',
  'completed',
  'rejected',
])

export const payoutStatus = pgEnum('payout_status', ['pending', 'transferred', 'failed'])
