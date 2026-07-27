import { isLocale } from '@/i18n/config'
import { getDictionary } from '@/i18n/get-dictionary'
import { notFound } from 'next/navigation'

// Placeholder route only — the storefront arrives in a later phase.
export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const dict = await getDictionary(locale)

  return (
    <main>
      <h1>{dict.brand}</h1>
      <p>{dict.tagline}</p>
      <p>{dict.origin}</p>
    </main>
  )
}
