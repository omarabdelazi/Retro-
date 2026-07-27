import Link from 'next/link'
import { notFound } from 'next/navigation'
import { isLocale } from '@/i18n/config'
import { getDictionary } from '@/i18n/get-dictionary'
import { money } from '@/lib/format'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type Row = {
  slug: string
  name_en: string
  name_ar: string
  species: string
  price: string
  currency: string
  images: string[]
}

export default async function ProductsIndex({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const dict = await getDictionary(locale)

  const supabase = await createClient()
  const { data } = await supabase
    .from('products')
    .select('slug, name_en, name_ar, species, price, currency, images')
    .order('name_en')
  const products = (data ?? []) as Row[]

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="font-display text-4xl">{dict.nav.products}</h1>
      <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3">
        {products.map((product) => {
          const name = locale === 'ar' ? product.name_ar : product.name_en
          return (
            <li key={product.slug}>
              <Link
                href={`/${locale}/products/${product.slug}`}
                className="group block focus-visible:outline-2 focus-visible:outline-ochre"
              >
                {product.images[0] ? (
                  <img
                    src={product.images[0]}
                    alt={name}
                    loading="lazy"
                    className="aspect-square w-full object-cover"
                  />
                ) : (
                  <span className="block aspect-square w-full border border-stone/40" />
                )}
                <span className="mt-3 block font-display text-xl leading-snug group-hover:text-walnut">
                  {name}
                </span>
                <span className="mt-1 block text-base text-ink/70">
                  {money(product.price, product.currency, locale)}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </main>
  )
}
