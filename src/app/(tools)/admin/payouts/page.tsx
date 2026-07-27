import Link from 'next/link'
import { asc, desc, eq, sql } from 'drizzle-orm'
import { getDb } from '@/db'
import { jobs, orderItems, payouts, products, workshops } from '@/db/schema'
import { requireAdmin } from '@/lib/auth'
import { money, shortDate, shortId } from '@/lib/format'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { LiveRefresh } from '@/components/admin/live-refresh'
import { markPayoutTransferred } from './actions'

export const dynamic = 'force-dynamic'

export default async function PayoutsPage() {
  await requireAdmin()
  const db = getDb()

  const rows = await db
    .select({
      id: payouts.id,
      status: payouts.status,
      amount: payouts.amount,
      currency: payouts.currency,
      transferredAt: payouts.transferredAt,
      workshopId: workshops.id,
      workshopName: workshops.nameEn,
      productName: products.nameEn,
      orderId: orderItems.orderId,
    })
    .from(payouts)
    .innerJoin(workshops, eq(workshops.id, payouts.workshopId))
    .innerJoin(jobs, eq(jobs.id, payouts.jobId))
    .innerJoin(orderItems, eq(orderItems.id, jobs.orderItemId))
    .innerJoin(products, eq(products.id, orderItems.productId))
    .orderBy(asc(workshops.nameEn), desc(payouts.status), asc(payouts.transferredAt))

  const pending = rows.filter((r) => r.status === 'pending')
  const settled = rows.filter((r) => r.status !== 'pending')
  const byWorkshop = new Map<string, typeof pending>()
  for (const row of pending) {
    const list = byWorkshop.get(row.workshopId) ?? []
    list.push(row)
    byWorkshop.set(row.workshopId, list)
  }

  return (
    <div className="space-y-6">
      <LiveRefresh tables="payouts" />
      <h1 className="font-display text-2xl">Payouts</h1>

      {byWorkshop.size === 0 ? (
        <p className="text-sm text-stone">Nothing outstanding.</p>
      ) : (
        [...byWorkshop.entries()].map(([workshopId, list]) => (
          <section key={workshopId}>
            <h2 className="mb-2 text-sm font-medium text-stone">
              {list[0]!.workshopName}
            </h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead className="w-40" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((payout) => (
                  <TableRow key={payout.id}>
                    <TableCell>{payout.productName}</TableCell>
                    <TableCell>
                      <Link
                        href={`/admin/orders/${payout.orderId}`}
                        className="text-walnut hover:text-ochre"
                      >
                        {shortId(payout.orderId)}
                      </Link>
                    </TableCell>
                    <TableCell className="font-medium">
                      {money(payout.amount, payout.currency)}
                    </TableCell>
                    <TableCell className="text-end">
                      <form action={markPayoutTransferred.bind(null, payout.id)}>
                        <Button variant="outline" size="xs" type="submit">
                          Mark transferred
                        </Button>
                      </form>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>
        ))
      )}

      <section>
        <h2 className="mb-2 text-sm font-medium text-stone">Transferred</h2>
        {settled.length === 0 ? (
          <p className="text-sm text-stone">None yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Workshop</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Transferred</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {settled.map((payout) => (
                <TableRow key={payout.id}>
                  <TableCell>{payout.workshopName}</TableCell>
                  <TableCell>{payout.productName}</TableCell>
                  <TableCell>{money(payout.amount, payout.currency)}</TableCell>
                  <TableCell className="text-stone">
                    {payout.transferredAt ? shortDate(payout.transferredAt) : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  )
}
