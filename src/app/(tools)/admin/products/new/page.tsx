import { asc, eq } from 'drizzle-orm'
import { getDb } from '@/db'
import { workshops } from '@/db/schema'
import { requireAdmin } from '@/lib/auth'
import { saveProduct } from '../actions'
import { FormError } from '../form-error'
import { ProductForm } from '../product-form'

export const dynamic = 'force-dynamic'

export default async function NewProductPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  await requireAdmin()
  const { error } = await searchParams
  const db = getDb()

  const workshopOptions = await db
    .select({ id: workshops.id, nameEn: workshops.nameEn })
    .from(workshops)
    .where(eq(workshops.active, true))
    .orderBy(asc(workshops.nameEn))

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl">New product</h1>
      <FormError error={error} />
      <ProductForm
        action={saveProduct.bind(null, null)}
        workshops={workshopOptions}
        initial={{
          slug: '',
          nameEn: '',
          nameAr: '',
          room: 'living',
          category: '',
          species: '',
          joinery: '',
          finish: '',
          price: '',
          currency: 'EGP',
          w: 0,
          d: 0,
          h: 0,
          descriptionEn: '',
          descriptionAr: '',
          images: '',
          modelGlbUrl: '',
          active: true,
          steps: [],
        }}
      />
    </div>
  )
}
