import { index, pgTable, real, text, uuid } from 'drizzle-orm/pg-core'
import { products } from './catalog'

// Shop-the-room scenes. scene_glb_url is phase 6 (3D and AR); nullable until then.
export const rooms = pgTable('rooms', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  nameEn: text('name_en').notNull(),
  nameAr: text('name_ar').notNull(),
  sceneImageUrl: text('scene_image_url').notNull(),
  sceneGlbUrl: text('scene_glb_url'),
}).enableRLS()

// x and y are normalised coordinates on the scene image; z joins in for
// 3D scenes once scene_glb_url exists.
export const roomHotspots = pgTable(
  'room_hotspots',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    roomId: uuid('room_id')
      .notNull()
      .references(() => rooms.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    x: real('x').notNull(),
    y: real('y').notNull(),
    z: real('z'),
    labelEn: text('label_en'),
    labelAr: text('label_ar'),
  },
  (t) => [
    index('room_hotspots_room_id_idx').on(t.roomId),
    index('room_hotspots_product_id_idx').on(t.productId),
  ],
).enableRLS()
