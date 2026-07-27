import type { Metadata } from 'next'
import { Fraunces, IBM_Plex_Sans_Arabic, Work_Sans } from 'next/font/google'
import '../globals.css'

// The tool chrome runs in English LTR for now; the data inside it stays
// bilingual (every name and description field carries en and ar), so the
// Arabic text face loads here too and :lang(ar) picks it up.
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

const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500'],
  variable: '--font-plex-arabic',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Retro — Tools',
  robots: { index: false, follow: false },
}

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      dir="ltr"
      className={`${fraunces.variable} ${workSans.variable} ${plexArabic.variable}`}
    >
      <body>{children}</body>
    </html>
  )
}
