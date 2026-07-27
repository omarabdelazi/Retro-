import { sql } from 'drizzle-orm'
import { boolean, check, index, pgTable, text, uuid } from 'drizzle-orm/pg-core'
import { userRole } from './enums'

export const workshops = pgTable('workshops', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  nameEn: text('name_en').notNull(),
  nameAr: text('name_ar').notNull(),
  active: boolean('active').notNull().default(true),
}).enableRLS()

// Extends auth.users one-to-one. The FK to auth.users(id) lives in the RLS
// migration because the auth schema is Supabase-managed, not Drizzle-managed.
// Rows are created by the on_auth_user_created trigger, never by the client.
export const profiles = pgTable(
  'profiles',
  {
    id: uuid('id').primaryKey(),
    role: userRole('role').notNull().default('customer'),
    workshopId: uuid('workshop_id').references(() => workshops.id, {
      onDelete: 'restrict',
    }),
    fullName: text('full_name'),
    phone: text('phone'),
  },
  (t) => [
    index('profiles_workshop_id_idx').on(t.workshopId),
    // workshop users are scoped to exactly one workshop; nobody else has one
    check(
      'profiles_workshop_role_check',
      sql`(${t.role} = 'workshop') = (${t.workshopId} is not null)`,
    ),
  ],
).enableRLS()
