import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  unique,
  uuid,
} from 'drizzle-orm/pg-core'
import { currency } from './enums'
import { workshops } from './identity'

/** Outer dimensions in millimetres: width, depth, height. */
export type DimensionsMm = { w: number; d: number; h: number }

export const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull().unique(),
    nameEn: text('name_en').notNull(),
    nameAr: text('name_ar').notNull(),
    room: text('room').notNull(), // living, dining, bedroom, majlis, office
    category: text('category').notNull(), // dining-table, bed, wardrobe, …
    species: text('species').notNull(), // beech, oak, walnut — named directly
    joinery: text('joinery').notNull(), // mortise-and-tenon, dovetail, …
    finish: text('finish').notNull(), // hardwax oil, shellac, …
    dimensionsMm: jsonb('dimensions_mm').$type<DimensionsMm>().notNull(),
    price: numeric('price', { precision: 12, scale: 3 }).notNull(),
    currency: currency('currency').notNull(),
    descriptionEn: text('description_en'),
    descriptionAr: text('description_ar'),
    images: text('images').array().notNull().default([]),
    modelGlbUrl: text('model_glb_url'),
    active: boolean('active').notNull().default(true),
  },
  (t) => [
    index('products_room_idx').on(t.room),
    index('products_category_idx').on(t.category),
    check('products_price_nonnegative', sql`${t.price} >= 0`),
  ],
).enableRLS()

// Which workshops touch a product, in production order.
export const productWorkshops = pgTable(
  'product_workshops',
  {
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    workshopId: uuid('workshop_id')
      .notNull()
      .references(() => workshops.id, { onDelete: 'restrict' }),
    sequence: integer('sequence').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.productId, t.workshopId] }),
    unique('product_workshops_product_sequence_unique').on(t.productId, t.sequence),
    index('product_workshops_workshop_id_idx').on(t.workshopId),
    check('product_workshops_sequence_positive', sql`${t.sequence} >= 1`),
  ],
).enableRLS()

export const collections = pgTable('collections', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  nameEn: text('name_en').notNull(),
  nameAr: text('name_ar').notNull(),
  descriptionEn: text('description_en'),
  descriptionAr: text('description_ar'),
  heroImage: text('hero_image'),
}).enableRLS()

export const collectionProducts = pgTable(
  'collection_products',
  {
    collectionId: uuid('collection_id')
      .notNull()
      .references(() => collections.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.collectionId, t.productId] }),
    index('collection_products_product_id_idx').on(t.productId),
  ],
).enableRLS()
