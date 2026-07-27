import { sql } from 'drizzle-orm'
import {
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { currency, orderStatus, paymentStatus } from './enums'
import { products } from './catalog'
import { profiles } from './identity'

export type ShippingAddress = {
  name: string
  phone: string
  line1: string
  line2?: string
  city: string
  region?: string
  country: 'EG' | 'AE' | 'SA' | 'KW'
  notes?: string
}

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'restrict' }),
    status: orderStatus('status').notNull().default('pending'),
    subtotal: numeric('subtotal', { precision: 12, scale: 3 }).notNull(),
    total: numeric('total', { precision: 12, scale: 3 }).notNull(),
    currency: currency('currency').notNull(),
    paymentRef: text('payment_ref'),
    paymentStatus: paymentStatus('payment_status').notNull().default('unpaid'),
    shippingAddress: jsonb('shipping_address').$type<ShippingAddress>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('orders_customer_id_idx').on(t.customerId),
    index('orders_status_idx').on(t.status),
    check('orders_subtotal_nonnegative', sql`${t.subtotal} >= 0`),
    check('orders_total_nonnegative', sql`${t.total} >= 0`),
  ],
).enableRLS()

export const orderItems = pgTable(
  'order_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'restrict' }),
    qty: integer('qty').notNull(),
    // unit price frozen at purchase time, in the order's currency
    unitPrice: numeric('unit_price', { precision: 12, scale: 3 }).notNull(),
  },
  (t) => [
    index('order_items_order_id_idx').on(t.orderId),
    index('order_items_product_id_idx').on(t.productId),
    check('order_items_qty_positive', sql`${t.qty} > 0`),
    check('order_items_unit_price_nonnegative', sql`${t.unitPrice} >= 0`),
  ],
).enableRLS()
