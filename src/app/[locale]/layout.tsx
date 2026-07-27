import type { Metadata } from 'next'
import { Amiri, Fraunces, IBM_Plex_Sans_Arabic, Work_Sans } from 'next/font/google'
import { notFound } from 'next/navigation'
import { dirFor, isLocale, locales } from '@/i18n/config'
import '../globals.css'

// Display — low WONK, high optical size comes from the opsz axis at large sizes
const fraunces = Fraunces({
  subsets: ['latin'],
  axes: ['opsz'],
  variable: '--font-fraunces',
  display: 'swap',
})

const workSans = Work_Sans({
  subsets: ['latin'],
  variable: '--font-work-sans',
  display: 'swap',
})

const amiri = Amiri({
  subsets: ['arabic'],
  weight: '400',
  variable: '--font-amiri',
  display: 'swap',
})

const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500'],
  variable: '--font-plex-arabic',
  display: 'swap',
})

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export const metadata: Metadata = {
  title: 'Retro',
  description: 'Full-home solid timber furniture. Damietta, Egypt.',
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()

  return (
    <html
      lang={locale}
      dir={dirFor(locale)}
      className={`${fraunces.variable} ${workSans.variable} ${amiri.variable} ${plexArabic.variable}`}
    >
      <body>{children}</body>
    </html>
  )
}
