import { relations } from 'drizzle-orm'
import {
  collectionProducts,
  collections,
  products,
  productWorkshops,
} from './catalog'
import { orderItems, orders } from './commerce'
import { profiles, workshops } from './identity'
import { jobs, orderEvents, payouts } from './production'
import { roomHotspots, rooms } from './rooms'

export const workshopsRelations = relations(workshops, ({ many }) => ({
  members: many(profiles),
  productSteps: many(productWorkshops),
  jobs: many(jobs),
  payouts: many(payouts),
}))

export const profilesRelations = relations(profiles, ({ one, many }) => ({
  workshop: one(workshops, {
    fields: [profiles.workshopId],
    references: [workshops.id],
  }),
  orders: many(orders),
  events: many(orderEvents),
}))

export const productsRelations = relations(products, ({ many }) => ({
  workshopSteps: many(productWorkshops),
  collectionEntries: many(collectionProducts),
  orderItems: many(orderItems),
  hotspots: many(roomHotspots),
}))

export const productWorkshopsRelations = relations(productWorkshops, ({ one }) => ({
  product: one(products, {
    fields: [productWorkshops.productId],
    references: [products.id],
  }),
  workshop: one(workshops, {
    fields: [productWorkshops.workshopId],
    references: [workshops.id],
  }),
}))

export const collectionsRelations = relations(collections, ({ many }) => ({
  entries: many(collectionProducts),
}))

export const collectionProductsRelations = relations(collectionProducts, ({ one }) => ({
  collection: one(collections, {
    fields: [collectionProducts.collectionId],
    references: [collections.id],
  }),
  product: one(products, {
    fields: [collectionProducts.productId],
    references: [products.id],
  }),
}))

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(profiles, {
    fields: [orders.customerId],
    references: [profiles.id],
  }),
  items: many(orderItems),
  events: many(orderEvents),
}))

export const orderItemsRelations = relations(orderItems, ({ one, many }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
  jobs: many(jobs),
}))

export const jobsRelations = relations(jobs, ({ one }) => ({
  orderItem: one(orderItems, {
    fields: [jobs.orderItemId],
    references: [orderItems.id],
  }),
  product: one(products, {
    fields: [jobs.productId],
    references: [products.id],
  }),
  workshop: one(workshops, {
    fields: [jobs.workshopId],
    references: [workshops.id],
  }),
  payout: one(payouts, {
    fields: [jobs.id],
    references: [payouts.jobId],
  }),
}))

export const payoutsRelations = relations(payouts, ({ one }) => ({
  workshop: one(workshops, {
    fields: [payouts.workshopId],
    references: [workshops.id],
  }),
  job: one(jobs, {
    fields: [payouts.jobId],
    references: [jobs.id],
  }),
}))

export const orderEventsRelations = relations(orderEvents, ({ one }) => ({
  order: one(orders, {
    fields: [orderEvents.orderId],
    references: [orders.id],
  }),
  actor: one(profiles, {
    fields: [orderEvents.actorId],
    references: [profiles.id],
  }),
}))

export const roomsRelations = relations(rooms, ({ many }) => ({
  hotspots: many(roomHotspots),
}))

export const roomHotspotsRelations = relations(roomHotspots, ({ one }) => ({
  room: one(rooms, {
    fields: [roomHotspots.roomId],
    references: [rooms.id],
  }),
  product: one(products, {
    fields: [roomHotspots.productId],
    references: [products.id],
  }),
}))
