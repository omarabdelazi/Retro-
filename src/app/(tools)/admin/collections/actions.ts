'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { and, eq, sql } from 'drizzle-orm'
import { getDb } from '@/db'
import { collectionProducts, collections } from '@/db/schema'
import { requireAdmin } from '@/lib/auth'

function text(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim()
}

export async function createCollection(formData: FormData) {
  await requireAdmin()
  const db = getDb()

  const slug = text(formData, 'slug')
  const nameEn = text(formData, 'nameEn')
  const nameAr = text(formData, 'nameAr')
  if (!slug || !nameEn || !nameAr) redirect('/admin/collections?error=fields')

  const [created] = await db
    .insert(collections)
    .values({
      slug,
      nameEn,
      nameAr,
      descriptionEn: text(formData, 'descriptionEn') || null,
      descriptionAr: text(formData, 'descriptionAr') || null,
      heroImage: text(formData, 'heroImage') || null,
    })
    .onConflictDoNothing({ target: collections.slug })
    .returning({ id: collections.id })
  if (!created) redirect('/admin/collections?error=slug')

  revalidatePath('/admin/collections')
  redirect(`/admin/collections/${created.id}`)
}

export async function updateCollection(collectionId: string, formData: FormData) {
  await requireAdmin()
  const db = getDb()

  const slug = text(formData, 'slug')
  const nameEn = text(formData, 'nameEn')
  const nameAr = text(formData, 'nameAr')
  if (!slug || !nameEn || !nameAr) {
    redirect(`/admin/collections/${collectionId}?error=fields`)
  }

  await db
    .update(collections)
    .set({
      slug,
      nameEn,
      nameAr,
      descriptionEn: text(formData, 'descriptionEn') || null,
      descriptionAr: text(formData, 'descriptionAr') || null,
      heroImage: text(formData, 'heroImage') || null,
    })
    .where(eq(collections.id, collectionId))

  revalidatePath('/admin/collections')
  redirect(`/admin/collections/${collectionId}`)
}

export async function deleteCollection(collectionId: string) {
  await requireAdmin()
  const db = getDb()
  await db.delete(collections).where(eq(collections.id, collectionId))
  revalidatePath('/admin/collections')
  redirect('/admin/collections')
}

export async function addProductToCollection(collectionId: string, productId: string) {
  await requireAdmin()
  const db = getDb()

  await db
    .insert(collectionProducts)
    .values({
      collectionId,
      productId,
      position: sql`coalesce((
        select max(position) from public.collection_products
        where collection_id = ${collectionId}
      ), 0) + 1`,
    })
    .onConflictDoNothing()

  revalidatePath(`/admin/collections/${collectionId}`)
}

export async function removeProductFromCollection(
  collectionId: string,
  productId: string,
) {
  await requireAdmin()
  const db = getDb()

  await db
    .delete(collectionProducts)
    .where(
      and(
        eq(collectionProducts.collectionId, collectionId),
        eq(collectionProducts.productId, productId),
      ),
    )

  revalidatePath(`/admin/collections/${collectionId}`)
}

export async function reorderCollection(collectionId: string, productIds: string[]) {
  await requireAdmin()
  const db = getDb()

  await db.transaction(async (tx) => {
    for (const [index, productId] of productIds.entries()) {
      await tx
        .update(collectionProducts)
        .set({ position: index + 1 })
        .where(
          and(
            eq(collectionProducts.collectionId, collectionId),
            eq(collectionProducts.productId, productId),
          ),
        )
    }
  })

  revalidatePath(`/admin/collections/${collectionId}`)
}
