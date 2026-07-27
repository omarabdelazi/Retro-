import { sql } from 'drizzle-orm'
import {
  bigint,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core'
import { currency, jobStatus, payoutStatus } from './enums'
import { orderItems, orders } from './commerce'
import { profiles, workshops } from './identity'

// One job per workshop step per order item, created from product_workshops
// when an order is paid.
export const jobs = pgTable(
  'jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderItemId: uuid('order_item_id')
      .notNull()
      .references(() => orderItems.id, { onDelete: 'cascade' }),
    workshopId: uuid('workshop_id')
      .notNull()
      .references(() => workshops.id, { onDelete: 'restrict' }),
    sequence: integer('sequence').notNull(),
    status: jobStatus('status').notNull().default('pending'),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    rejectionReason: text('rejection_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('jobs_order_item_sequence_unique').on(t.orderItemId, t.sequence),
    index('jobs_workshop_status_idx').on(t.workshopId, t.status),
    index('jobs_order_item_id_idx').on(t.orderItemId),
    check('jobs_sequence_positive', sql`${t.sequence} >= 1`),
    check(
      'jobs_rejection_reason_required',
      sql`${t.status} <> 'rejected' or ${t.rejectionReason} is not null`,
    ),
  ],
).enableRLS()

export const payouts = pgTable(
  'payouts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workshopId: uuid('workshop_id')
      .notNull()
      .references(() => workshops.id, { onDelete: 'restrict' }),
    jobId: uuid('job_id')
      .notNull()
      .references(() => jobs.id, { onDelete: 'restrict' }),
    amount: numeric('amount', { precision: 12, scale: 3 }).notNull(),
    currency: currency('currency').notNull(),
    status: payoutStatus('status').notNull().default('pending'),
    transferredAt: timestamp('transferred_at', { withTimezone: true }),
  },
  (t) => [
    unique('payouts_job_id_unique').on(t.jobId),
    index('payouts_workshop_status_idx').on(t.workshopId, t.status),
    check('payouts_amount_nonnegative', sql`${t.amount} >= 0`),
    check(
      'payouts_transferred_at_required',
      sql`${t.status} <> 'transferred' or ${t.transferredAt} is not null`,
    ),
  ],
).enableRLS()

// Append-only audit log. No update or delete policies exist and the
// privileges are revoked in the RLS migration; the bigint identity key
// preserves insertion order.
export const orderEvents = pgTable(
  'order_events',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    // null actor means the system wrote the event
    actorId: uuid('actor_id').references(() => profiles.id, { onDelete: 'set null' }),
    type: text('type').notNull(), // order.paid, job.accepted, job.completed, …
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('order_events_order_id_idx').on(t.orderId)],
).enableRLS()
