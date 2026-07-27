import { notFound } from 'next/navigation'
import { asc, eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { products, productWorkshops, workshops } from '@/db/schema'
import { requireAdmin } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { deleteProduct, saveProduct } from '../actions'
import { FormError } from '../form-error'
import { ProductForm } from '../product-form'

export const dynamic = 'force-dynamic'

export default async function EditProductPage({
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

  const [product] = await db.select().from(products).where(eq(products.id, id))
  if (!product) notFound()

  const [steps, workshopOptions] = await Promise.all([
    db
      .select({ workshopId: productWorkshops.workshopId })
      .from(productWorkshops)
      .where(eq(productWorkshops.productId, id))
      .orderBy(asc(productWorkshops.sequence)),
    db
      .select({ id: workshops.id, nameEn: workshops.nameEn })
      .from(workshops)
      .where(eq(workshops.active, true))
      .orderBy(asc(workshops.nameEn)),
  ])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl">{product.nameEn}</h1>
        <form action={deleteProduct.bind(null, id)}>
          <Button variant="outline" size="sm" type="submit">
            Delete
          </Button>
        </form>
      </div>
      <FormError error={error} />
      <ProductForm
        action={saveProduct.bind(null, id)}
        workshops={workshopOptions}
        initial={{
          slug: product.slug,
          nameEn: product.nameEn,
          nameAr: product.nameAr,
          room: product.room,
          category: product.category,
          species: product.species,
          joinery: product.joinery,
          finish: product.finish,
          price: product.price,
          currency: product.currency,
          w: product.dimensionsMm.w,
          d: product.dimensionsMm.d,
          h: product.dimensionsMm.h,
          descriptionEn: product.descriptionEn ?? '',
          descriptionAr: product.descriptionAr ?? '',
          images: product.images.join('\n'),
          modelGlbUrl: product.modelGlbUrl ?? '',
          active: product.active,
          steps,
        }}
      />
    </div>
  )
}
