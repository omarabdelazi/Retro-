import Link from 'next/link'
import { requireWorkshop } from '@/lib/auth'
import { money, shortDate } from '@/lib/format'
import { LiveRefresh } from '@/components/admin/live-refresh'

export const dynamic = 'force-dynamic'

type HistoryRow = {
  id: string
  qty: number
  completed_at: string | null
  product: { name_en: string; name_ar: string } | null
  payout: {
    amount: string
    currency: string
    status: string
    transferred_at: string | null
  } | null
}

function payoutLabel(payout: HistoryRow['payout']) {
  if (!payout) return { text: 'payout not raised yet', strong: false }
  if (payout.status === 'transferred') {
    return {
      text: `${money(payout.amount, payout.currency)} — paid${
        payout.transferred_at ? ` ${shortDate(payout.transferred_at)}` : ''
      }`,
      strong: false,
    }
  }
  return {
    text: `${money(payout.amount, payout.currency)} — ${payout.status}`,
    strong: true,
  }
}

export default async function WorkshopHistory() {
  const { supabase } = await requireWorkshop()

  const { data } = await supabase
    .from('jobs')
    .select(
      `
      id, qty, completed_at,
      product:products ( name_en, name_ar ),
      payout:payouts ( amount, currency, status, transferred_at )
    `,
    )
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })

  const rows = (data ?? []) as unknown as HistoryRow[]

  return (
    <div className="space-y-5">
      <LiveRefresh tables="jobs,payouts" />
      <h1 className="font-display text-3xl">Completed work</h1>

      {rows.length === 0 ? (
        <p className="text-lg text-ink/70">Nothing completed yet.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => {
            const payout = payoutLabel(row.payout)
            return (
              <li key={row.id} className="rounded-xs border-2 border-ink/25 p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <Link
                    href={`/workshop/jobs/${row.id}`}
                    className="text-2xl font-medium hover:text-walnut"
                  >
                    {row.product?.name_en}
                  </Link>
                  <span className="text-2xl" dir="rtl" lang="ar">
                    {row.product?.name_ar}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-lg">
                  <span className="text-ink/70">
                    qty {row.qty}
                    {row.completed_at ? (
                      <>
                        <span className="mx-2 text-stone">·</span>
                        finished {shortDate(row.completed_at)}
                      </>
                    ) : null}
                  </span>
                  <span className={payout.strong ? 'font-medium text-walnut' : ''}>
                    {payout.text}
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
