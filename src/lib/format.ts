// Every price carries an explicit currency; Intl renders KWD with its three
// decimal places on its own, and the ar locale gets Arabic numerals.
export function money(amount: string | number, currency: string, locale = 'en') {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    currencyDisplay: 'code',
  }).format(Number(amount))
}

export function shortDate(value: Date | string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

export function dateTime(value: Date | string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function daysSince(value: Date | string) {
  const ms = Date.now() - new Date(value).getTime()
  return Math.floor(ms / (24 * 60 * 60 * 1000))
}

export const ORDER_STATUSES = [
  'pending',
  'admin_review',
  'routed',
  'in_production',
  'ready',
  'shipped',
  'delivered',
  'cancelled',
] as const

export const JOB_STATUSES = [
  'pending',
  'accepted',
  'in_progress',
  'completed',
  'rejected',
] as const

export function statusLabel(status: string) {
  return status.replaceAll('_', ' ')
}

/** id shortened for dense tables: first block of the uuid */
export function shortId(id: string) {
  return id.slice(0, 8)
}
