import { notFound } from 'next/navigation'
import { isLocale } from '@/i18n/config'
import { getDictionary } from '@/i18n/get-dictionary'
import { money } from '@/lib/format'
import { createClient } from '@/lib/supabase/server'
import { ProductModelViewer } from '@/components/storefront/product-model-viewer'

export const dynamic = 'force-dynamic'

type ProductRow = {
  slug: string
  name_en: string
  name_ar: string
  species: string
  joinery: string
  finish: string
  dimensions_mm: { w: number; d: number; h: number }
  price: string
  currency: string
  description_en: string | null
  description_ar: string | null
  images: string[]
  model_glb_url: string | null
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale, slug } = await params
  if (!isLocale(locale)) notFound()
  const dict = await getDictionary(locale)

  // anonymous RLS-scoped read: inactive products do not exist here
  const supabase = await createClient()
  const { data } = await supabase
    .from('products')
    .select(
      'slug, name_en, name_ar, species, joinery, finish, dimensions_mm, price, currency, description_en, description_ar, images, model_glb_url',
    )
    .eq('slug', slug)
    .maybeSingle()
  const product = data as ProductRow | null
  if (!product) notFound()

  const name = locale === 'ar' ? product.name_ar : product.name_en
  const description =
    locale === 'ar' ? product.description_ar : product.description_en
  const dims = product.dimensions_mm
  const [heroImage, ...restImages] = product.images

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="grid gap-10 md:grid-cols-2">
        <div className="space-y-4">
          {product.model_glb_url ? (
            // 3D and AR only when a real model exists — otherwise photography,
            // never a stand-in
            <ProductModelViewer
              src={product.model_glb_url}
              poster={heroImage}
              alt={name}
              arLabel={dict.product.inYourSpace}
            />
          ) : heroImage ? (
            <img src={heroImage} alt={name} className="aspect-square w-full object-cover" />
          ) : null}
          {restImages.map((image) => (
            <img
              key={image}
              src={image}
              alt=""
              loading="lazy"
              className="aspect-square w-full object-cover"
            />
          ))}
        </div>

        <div>
          <h1 className="font-display text-4xl leading-tight">{name}</h1>
          <p className="mt-3 text-2xl">
            {money(product.price, product.currency, locale)}
          </p>

          {description ? (
            <p className="mt-6 text-lg leading-relaxed text-ink/85">{description}</p>
          ) : null}

          <dl className="mt-8 border-t border-stone/50">
            <div className="flex justify-between gap-6 border-b border-stone/50 py-3">
              <dt className="text-stone">{dict.product.wood}</dt>
              <dd className="font-medium">{product.species}</dd>
            </div>
            <div className="flex justify-between gap-6 border-b border-stone/50 py-3">
              <dt className="text-stone">{dict.product.joinery}</dt>
              <dd className="font-medium">{product.joinery}</dd>
            </div>
            <div className="flex justify-between gap-6 border-b border-stone/50 py-3">
              <dt className="text-stone">{dict.product.finish}</dt>
              <dd className="font-medium">{product.finish}</dd>
            </div>
            <div className="flex justify-between gap-6 border-b border-stone/50 py-3">
              <dt className="text-stone">{dict.product.dimensions}</dt>
              <dd className="font-medium" dir="ltr">
                {dims.w} × {dims.d} × {dims.h} {dict.product.mm}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </main>
  )
}
