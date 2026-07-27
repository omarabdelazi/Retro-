import Link from 'next/link'
import { and, asc, desc, eq, sql, type SQL } from 'drizzle-orm'
import { getDb } from '@/db'
import { orderStatus, orders, profiles, workshops } from '@/db/schema'
import { requireAdmin } from '@/lib/auth'
import { money, shortDate, shortId, statusLabel } from '@/lib/format'
import { Badge, statusVariant } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { OrderFilters } from './filters'

export const dynamic = 'force-dynamic'

type OrderStatus = (typeof orderStatus.enumValues)[number]

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; workshop?: string }>
}) {
  await requireAdmin()
  const { status, workshop } = await searchParams
  const db = getDb()

  const conditions: SQL[] = []
  if (status && (orderStatus.enumValues as readonly string[]).includes(status)) {
    conditions.push(eq(orders.status, status as OrderStatus))
  }
  if (workshop) {
    conditions.push(sql`exists (
      select 1 from public.jobs j
      join public.order_items oi on oi.id = j.order_item_id
      where oi.order_id = ${orders.id} and j.workshop_id = ${workshop}
    )`)
  }

  const [rows, workshopOptions] = await Promise.all([
    db
      .select({
        id: orders.id,
        status: orders.status,
        paymentStatus: orders.paymentStatus,
        total: orders.total,
        currency: orders.currency,
        createdAt: orders.createdAt,
        customerName: profiles.fullName,
        itemCount: sql<number>`(select count(*)::int from public.order_items oi
          where oi.order_id = ${orders.id})`,
        jobsDone: sql<number>`(select count(*)::int from public.jobs j
          join public.order_items oi on oi.id = j.order_item_id
          where oi.order_id = ${orders.id} and j.status = 'completed')`,
        jobsTotal: sql<number>`(select count(*)::int from public.jobs j
          join public.order_items oi on oi.id = j.order_item_id
          where oi.order_id = ${orders.id})`,
      })
      .from(orders)
      .innerJoin(profiles, eq(profiles.id, orders.customerId))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(orders.createdAt)),
    db
      .select({ id: workshops.id, nameEn: workshops.nameEn })
      .from(workshops)
      .orderBy(asc(workshops.nameEn)),
  ])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-2xl">Orders</h1>
        <OrderFilters workshops={workshopOptions} />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Payment</TableHead>
            <TableHead>Items</TableHead>
            <TableHead>Jobs</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Placed</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-stone">
                No orders match.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((order) => (
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
                <TableCell>
                  <Badge variant={statusVariant(order.status)}>
                    {statusLabel(order.status)}
                  </Badge>
                </TableCell>
                <TableCell className="text-stone">{statusLabel(order.paymentStatus)}</TableCell>
                <TableCell>{order.itemCount}</TableCell>
                <TableCell className="text-stone">
                  {order.jobsTotal === 0 ? '—' : `${order.jobsDone}/${order.jobsTotal}`}
                </TableCell>
                <TableCell>{money(order.total, order.currency)}</TableCell>
                <TableCell className="text-stone">{shortDate(order.createdAt)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
