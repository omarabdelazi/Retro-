import Link from 'next/link'
import { and, asc, eq, gte, inArray, lt, notInArray, sql } from 'drizzle-orm'
import { getDb } from '@/db'
import {
  jobs,
  orderItems,
  orders,
  payouts,
  products,
  profiles,
  workshops,
} from '@/db/schema'
import { requireAdmin } from '@/lib/auth'
import { daysSince, money, shortDate, shortId, statusLabel } from '@/lib/format'
import { Badge, statusVariant } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { LiveRefresh } from '@/components/admin/live-refresh'

export const dynamic = 'force-dynamic'

const OVERDUE_DAYS = 7

export default async function AdminOverview() {
  await requireAdmin()
  const db = getDb()

  const monthStart = new Date()
  monthStart.setUTCDate(1)
  monthStart.setUTCHours(0, 0, 0, 0)
  const overdueBefore = new Date(Date.now() - OVERDUE_DAYS * 24 * 60 * 60 * 1000)

  const [needsReview, overdueJobs, outstandingPayouts, revenue] = await Promise.all([
    db
      .select({
        id: orders.id,
        total: orders.total,
        currency: orders.currency,
        createdAt: orders.createdAt,
        customerName: profiles.fullName,
      })
      .from(orders)
      .innerJoin(profiles, eq(profiles.id, orders.customerId))
      .where(inArray(orders.status, ['paid', 'admin_review']))
      .orderBy(asc(orders.createdAt)),
    db
      .select({
        id: jobs.id,
        status: jobs.status,
        createdAt: jobs.createdAt,
        productName: products.nameEn,
        workshopName: workshops.nameEn,
        orderId: orderItems.orderId,
      })
      .from(jobs)
      .innerJoin(orderItems, eq(orderItems.id, jobs.orderItemId))
      .innerJoin(products, eq(products.id, orderItems.productId))
      .innerJoin(workshops, eq(workshops.id, jobs.workshopId))
      .where(
        and(
          notInArray(jobs.status, ['completed', 'rejected']),
          lt(jobs.createdAt, overdueBefore),
        ),
      )
      .orderBy(asc(jobs.createdAt)),
    db
      .select({
        currency: payouts.currency,
        total: sql<string>`sum(${payouts.amount})`,
        count: sql<number>`count(*)::int`,
      })
      .from(payouts)
      .where(eq(payouts.status, 'pending'))
      .groupBy(payouts.currency),
    db
      .select({
        currency: orders.currency,
        total: sql<string>`sum(${orders.total})`,
        count: sql<number>`count(*)::int`,
      })
      .from(orders)
      .where(and(eq(orders.paymentStatus, 'paid'), gte(orders.createdAt, monthStart)))
      .groupBy(orders.currency),
  ])

  return (
    <div className="space-y-6">
      <LiveRefresh tables="orders,jobs,payouts" />
      <h1 className="font-display text-2xl">Overview</h1>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Orders needing review</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-3xl">{needsReview.length}</p>
            <p className="text-sm text-stone">captured, waiting to be routed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Jobs overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-display text-3xl">{overdueJobs.length}</p>
            <p className="text-sm text-stone">open longer than {OVERDUE_DAYS} days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Payouts outstanding</CardTitle>
          </CardHeader>
          <CardContent>
            {outstandingPayouts.length === 0 ? (
              <p className="font-display text-3xl">0</p>
            ) : (
              outstandingPayouts.map((row) => (
                <p key={row.currency} className="font-display text-xl">
                  {money(row.total, row.currency)}
                  <span className="ms-2 text-sm text-stone">({row.count})</span>
                </p>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Revenue this month</CardTitle>
          </CardHeader>
          <CardContent>
            {revenue.length === 0 ? (
              <p className="font-display text-3xl">—</p>
            ) : (
              revenue.map((row) => (
                <p key={row.currency} className="font-display text-xl">
                  {money(row.total, row.currency)}
                  <span className="ms-2 text-sm text-stone">
                    {row.count} {row.count === 1 ? 'order' : 'orders'}
                  </span>
                </p>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <section>
        <h2 className="mb-2 text-sm font-medium text-stone">Needing review</h2>
        {needsReview.length === 0 ? (
          <p className="text-sm text-stone">Nothing waiting.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Placed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {needsReview.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="font-medium text-walnut hover:text-ochre"
                    >
                      {shortId(order.id)}
                    </Link>
                  </TableCell>
                  <TableCell>{order.customerName ?? '—'}</TableCell>
                  <TableCell>{money(order.total, order.currency)}</TableCell>
                  <TableCell className="text-stone">{shortDate(order.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-stone">Overdue jobs</h2>
        {overdueJobs.length === 0 ? (
          <p className="text-sm text-stone">Nothing overdue.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Workshop</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Age</TableHead>
                <TableHead>Order</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {overdueJobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell>{job.productName}</TableCell>
                  <TableCell>{job.workshopName}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(job.status)}>
                      {statusLabel(job.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-stone">{daysSince(job.createdAt)} days</TableCell>
                  <TableCell>
                    <Link
                      href={`/admin/orders/${job.orderId}`}
                      className="text-walnut hover:text-ochre"
                    >
                      {shortId(job.orderId)}
                    </Link>
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
