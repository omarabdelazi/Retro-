import Link from 'next/link'
import { notFound } from 'next/navigation'
import { asc, desc, eq, sql } from 'drizzle-orm'
import { getDb } from '@/db'
import {
  jobs,
  orderEvents,
  orderItems,
  orders,
  products,
  profiles,
  workshops,
} from '@/db/schema'
import { requireAdmin } from '@/lib/auth'
import { dateTime, money, shortId, statusLabel } from '@/lib/format'
import { Badge, statusVariant } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { LiveRefresh } from '@/components/admin/live-refresh'
import { confirmOrder } from './actions'
import { CancelOrderDialog, ReassignJobDialog } from './dialogs'

export const dynamic = 'force-dynamic'

const errorMessages: Record<string, string> = {
  'not-paid': 'Only paid orders can be confirmed.',
  'no-items': 'This order has no items to route.',
  'no-steps':
    'A product on this order has no workshop steps. Set its production chain first.',
  'job-started': 'That job has already been started and cannot be reassigned.',
  'not-cancellable': 'This order has already shipped or closed.',
  'not-found': 'The record was not found.',
}

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string }>
}) {
  await requireAdmin()
  const { id } = await params
  const { error } = await searchParams
  const db = getDb()

  const [order] = await db
    .select({
      id: orders.id,
      status: orders.status,
      paymentStatus: orders.paymentStatus,
      paymentRef: orders.paymentRef,
      subtotal: orders.subtotal,
      total: orders.total,
      currency: orders.currency,
      shippingAddress: orders.shippingAddress,
      createdAt: orders.createdAt,
      customerId: orders.customerId,
      customerName: profiles.fullName,
      customerPhone: profiles.phone,
      customerEmail: sql<string | null>`(
        select u.email from auth.users u where u.id = "orders"."customer_id"
      )`,
    })
    .from(orders)
    .innerJoin(profiles, eq(profiles.id, orders.customerId))
    .where(eq(orders.id, id))
  if (!order) notFound()

  const [items, itemJobs, events, workshopOptions] = await Promise.all([
    db
      .select({
        id: orderItems.id,
        qty: orderItems.qty,
        unitPrice: orderItems.unitPrice,
        productName: products.nameEn,
        productNameAr: products.nameAr,
        productId: products.id,
      })
      .from(orderItems)
      .innerJoin(products, eq(products.id, orderItems.productId))
      .where(eq(orderItems.orderId, id)),
    db
      .select({
        id: jobs.id,
        orderItemId: jobs.orderItemId,
        sequence: jobs.sequence,
        status: jobs.status,
        acceptedAt: jobs.acceptedAt,
        startedAt: jobs.startedAt,
        completedAt: jobs.completedAt,
        rejectionReason: jobs.rejectionReason,
        workshopId: jobs.workshopId,
        workshopName: workshops.nameEn,
      })
      .from(jobs)
      .innerJoin(orderItems, eq(orderItems.id, jobs.orderItemId))
      .innerJoin(workshops, eq(workshops.id, jobs.workshopId))
      .where(eq(orderItems.orderId, id))
      .orderBy(asc(jobs.sequence)),
    db
      .select({
        id: orderEvents.id,
        type: orderEvents.type,
        payload: orderEvents.payload,
        createdAt: orderEvents.createdAt,
        actorName: profiles.fullName,
      })
      .from(orderEvents)
      .leftJoin(profiles, eq(profiles.id, orderEvents.actorId))
      .where(eq(orderEvents.orderId, id))
      .orderBy(desc(orderEvents.id)),
    db
      .select({ id: workshops.id, nameEn: workshops.nameEn })
      .from(workshops)
      .where(eq(workshops.active, true))
      .orderBy(asc(workshops.nameEn)),
  ])

  const address = order.shippingAddress
  const cancellable = !['shipped', 'delivered', 'cancelled'].includes(order.status)

  return (
    <div className="space-y-5">
      <LiveRefresh tables="orders,jobs" />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl">Order {shortId(order.id)}</h1>
            <Badge variant={statusVariant(order.status)}>{statusLabel(order.status)}</Badge>
            <Badge variant="outline">payment: {statusLabel(order.paymentStatus)}</Badge>
          </div>
          <p className="mt-1 text-sm text-stone">
            Placed {dateTime(order.createdAt)}
            {order.paymentRef ? ` · ref ${order.paymentRef}` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          {order.status === 'paid' ? (
            <form action={confirmOrder.bind(null, order.id)}>
              <Button type="submit">Confirm and route</Button>
            </form>
          ) : null}
          {cancellable ? <CancelOrderDialog orderId={order.id} /> : null}
        </div>
      </div>

      {error ? (
        <p className="border border-walnut/50 bg-walnut/10 px-3 py-2 text-sm text-walnut">
          {errorMessages[error] ?? 'That action could not be completed.'}
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-5">
          {items.map((item) => {
            const jobsForItem = itemJobs.filter((j) => j.orderItemId === item.id)
            return (
              <section key={item.id} className="rounded-xs border border-stone/50">
                <div className="flex items-baseline justify-between px-3 py-2">
                  <div>
                    <span className="font-medium">{item.productName}</span>
                    <span className="ms-2 text-sm text-stone" dir="rtl" lang="ar">
                      {item.productNameAr}
                    </span>
                  </div>
                  <span className="text-sm text-stone">
                    {item.qty} × {money(item.unitPrice, order.currency)}
                  </span>
                </div>
                <Separator />
                {jobsForItem.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-stone">
                    No jobs yet — they are generated when the order is confirmed.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">Step</TableHead>
                        <TableHead>Workshop</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Timeline</TableHead>
                        <TableHead className="w-24" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {jobsForItem.map((job) => (
                        <TableRow key={job.id}>
                          <TableCell className="text-stone">{job.sequence}</TableCell>
                          <TableCell>{job.workshopName}</TableCell>
                          <TableCell>
                            <Badge variant={statusVariant(job.status)}>
                              {statusLabel(job.status)}
                            </Badge>
                            {job.rejectionReason ? (
                              <span className="ms-2 text-sm text-stone">
                                {job.rejectionReason}
                              </span>
                            ) : null}
                          </TableCell>
                          <TableCell className="text-sm text-stone">
                            {job.completedAt
                              ? `completed ${dateTime(job.completedAt)}`
                              : job.startedAt
                                ? `started ${dateTime(job.startedAt)}`
                                : job.acceptedAt
                                  ? `accepted ${dateTime(job.acceptedAt)}`
                                  : 'waiting'}
                          </TableCell>
                          <TableCell className="text-end">
                            {job.status === 'pending' || job.status === 'accepted' ? (
                              <ReassignJobDialog
                                orderId={order.id}
                                jobId={job.id}
                                currentWorkshopId={job.workshopId}
                                workshops={workshopOptions}
                              />
                            ) : null}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </section>
            )
          })}

          <section>
            <h2 className="mb-2 text-sm font-medium text-stone">History</h2>
            <ul className="space-y-1.5">
              {events.map((event) => (
                <li key={event.id} className="flex items-baseline gap-3 text-sm">
                  <span className="w-32 shrink-0 text-stone">{dateTime(event.createdAt)}</span>
                  <span className="font-medium">{event.type}</span>
                  <span className="text-stone">{event.actorName ?? 'system'}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-xs border border-stone/50 p-3">
            <h2 className="text-sm text-stone">Customer</h2>
            <p className="mt-1 font-medium">{order.customerName ?? '—'}</p>
            <p className="text-sm">{order.customerEmail ?? ''}</p>
            <p className="text-sm">{order.customerPhone ?? ''}</p>
            {address ? (
              <p className="mt-2 text-sm text-stone">
                {address.line1}
                {address.line2 ? `, ${address.line2}` : ''}
                <br />
                {address.city}, {address.country}
              </p>
            ) : null}
          </section>
          <section className="rounded-xs border border-stone/50 p-3">
            <h2 className="text-sm text-stone">Totals</h2>
            <dl className="mt-1 space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-stone">Subtotal</dt>
                <dd>{money(order.subtotal, order.currency)}</dd>
              </div>
              <div className="flex justify-between font-medium">
                <dt>Total</dt>
                <dd>{money(order.total, order.currency)}</dd>
              </div>
            </dl>
          </section>
          <Link
            href="/admin/orders"
            className="inline-block text-sm text-walnut hover:text-ochre"
          >
            ← All orders
          </Link>
        </aside>
      </div>
    </div>
  )
}
