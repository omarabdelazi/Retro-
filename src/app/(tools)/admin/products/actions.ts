'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { currency, products, productWorkshops } from '@/db/schema'
import { requireAdmin } from '@/lib/auth'

type Step = { workshopId: string }

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

export async function saveProduct(productId: string | null, formData: FormData) {
  await requireAdmin()
  const db = getDb()

  const backTo = productId ? `/admin/products/${productId}` : '/admin/products/new'

  const slug = text(formData, 'slug')
  const nameEn = text(formData, 'nameEn')
  const nameAr = text(formData, 'nameAr')
  const room = text(formData, 'room')
  const category = text(formData, 'category')
  const species = text(formData, 'species')
  const joinery = text(formData, 'joinery')
  const finish = text(formData, 'finish')
  const price = text(formData, 'price')
  const curr = text(formData, 'currency')
  const w = Number(text(formData, 'w'))
  const d = Number(text(formData, 'd'))
  const h = Number(text(formData, 'h'))

  if (
    !slug || !nameEn || !nameAr || !room || !category || !species ||
    !joinery || !finish || !price || Number.isNaN(Number(price)) ||
    !(currency.enumValues as readonly string[]).includes(curr) ||
    [w, d, h].some((n) => !Number.isFinite(n) || n <= 0)
  ) {
    redirect(`${backTo}?error=fields`)
  }

  let steps: Step[]
  try {
    steps = JSON.parse(String(formData.get('steps') ?? '[]')) as Step[]
  } catch {
    steps = []
  }
  steps = steps.filter((s) => s.workshopId)
  if (steps.length === 0) redirect(`${backTo}?error=steps`)
  if (new Set(steps.map((s) => s.workshopId)).size !== steps.length) {
    redirect(`${backTo}?error=duplicate-workshop`)
  }

  const values = {
    slug,
    nameEn,
    nameAr,
    room,
    category,
    species,
    joinery,
    finish,
    price,
    currency: curr as (typeof currency.enumValues)[number],
    dimensionsMm: { w, d, h },
    descriptionEn: text(formData, 'descriptionEn') || null,
    descriptionAr: text(formData, 'descriptionAr') || null,
    images: text(formData, 'images')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean),
    modelGlbUrl: text(formData, 'modelGlbUrl') || null,
    active: formData.get('active') === 'on',
  }

  try {
    await db.transaction(async (tx) => {
      let id = productId
      if (id) {
        await tx.update(products).set(values).where(eq(products.id, id))
      } else {
        const inserted = await tx
          .insert(products)
          .values(values)
          .returning({ id: products.id })
        id = inserted[0]!.id
      }
      // the sequence is the row order in the form
      await tx.delete(productWorkshops).where(eq(productWorkshops.productId, id))
      await tx.insert(productWorkshops).values(
        steps.map((step, index) => ({
          productId: id,
          workshopId: step.workshopId,
          sequence: index + 1,
        })),
      )
    })
  } catch (error) {
    if (isPgError(error, '23505')) redirect(`${backTo}?error=slug`)
    throw error
  }

  revalidatePath('/admin/products')
  redirect('/admin/products')
}

export async function deleteProduct(productId: string) {
  await requireAdmin()
  const db = getDb()

  try {
    await db.delete(products).where(eq(products.id, productId))
  } catch (error) {
    // referenced by order history — deactivate instead of erasing the record
    if (isPgError(error, '23503')) {
      redirect(`/admin/products/${productId}?error=in-use`)
    }
    throw error
  }

  revalidatePath('/admin/products')
  redirect('/admin/products')
}
