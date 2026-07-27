import Link from 'next/link'
import { isLocale } from '@/i18n/config'
import { getDictionary } from '@/i18n/get-dictionary'
import { notFound } from 'next/navigation'

// Placeholder home — the full storefront arrives in a later phase.
export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const dict = await getDictionary(locale)

  return (
    <main className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="font-display text-5xl">{dict.brand}</h1>
      <p className="mt-4 max-w-xl text-xl leading-relaxed">{dict.tagline}</p>
      <p className="mt-2 text-lg text-ink/70">{dict.origin}</p>
      <nav className="mt-10 flex gap-6 text-lg">
        <Link
          href={`/${locale}/products`}
          className="text-walnut underline underline-offset-4 hover:text-ochre focus-visible:outline-2 focus-visible:outline-ochre"
        >
          {dict.nav.products}
        </Link>
        <Link
          href={`/${locale}/rooms`}
          className="text-walnut underline underline-offset-4 hover:text-ochre focus-visible:outline-2 focus-visible:outline-ochre"
        >
          {dict.nav.rooms}
        </Link>
      </nav>
    </main>
  )
}
