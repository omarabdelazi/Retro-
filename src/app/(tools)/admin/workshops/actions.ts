'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { eq, sql } from 'drizzle-orm'
import { getDb } from '@/db'
import { profiles, workshops } from '@/db/schema'
import { requireAdmin } from '@/lib/auth'

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim()
}

function isPgError(error: unknown, code: string) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === code
  )
}

export async function saveWorkshop(workshopId: string | null, formData: FormData) {
  await requireAdmin()
  const db = getDb()

  const slug = text(formData, 'slug')
  const nameEn = text(formData, 'nameEn')
  const nameAr = text(formData, 'nameAr')
  const active = formData.get('active') === 'on'
  if (!slug || !nameEn || !nameAr) redirect('/admin/workshops?error=fields')

  try {
    if (workshopId) {
      await db
        .update(workshops)
        .set({ slug, nameEn, nameAr, active })
        .where(eq(workshops.id, workshopId))
    } else {
      await db.insert(workshops).values({ slug, nameEn, nameAr, active })
    }
  } catch (error) {
    if (isPgError(error, '23505')) redirect('/admin/workshops?error=slug')
    throw error
  }

  revalidatePath('/admin/workshops')
  redirect('/admin/workshops')
}

export async function deleteWorkshop(workshopId: string) {
  await requireAdmin()
  const db = getDb()

  try {
    await db.delete(workshops).where(eq(workshops.id, workshopId))
  } catch (error) {
    // referenced by jobs, payouts, production chains, or members
    if (isPgError(error, '23503')) redirect('/admin/workshops?error=in-use')
    throw error
  }

  revalidatePath('/admin/workshops')
  redirect('/admin/workshops')
}

// Role and workshop assignment intentionally run on the service connection:
// the RLS layer blocks role changes for API callers, and this server action
// is the sanctioned path (requireAdmin gates it).
export async function assignUserToWorkshop(workshopId: string, formData: FormData) {
  await requireAdmin()
  const db = getDb()

  const email = text(formData, 'email').toLowerCase()
  if (!email) redirect('/admin/workshops?error=fields')

  const found = await db.execute<{ id: string; role: string | null }>(sql`
    select u.id, p.role::text as role
    from auth.users u
    left join public.profiles p on p.id = u.id
    where lower(u.email) = ${email}
  `)
  const user = found[0]
  if (!user) redirect('/admin/workshops?error=no-user')
  if (user.role === 'admin') redirect('/admin/workshops?error=is-admin')

  await db
    .update(profiles)
    .set({ role: 'workshop', workshopId })
    .where(eq(profiles.id, user.id))

  revalidatePath('/admin/workshops')
  redirect('/admin/workshops')
}

export async function removeUserFromWorkshop(profileId: string) {
  await requireAdmin()
  const db = getDb()

  await db
    .update(profiles)
    .set({ role: 'customer', workshopId: null })
    .where(eq(profiles.id, profileId))

  revalidatePath('/admin/workshops')
}
