import type { Metadata } from 'next'
import { Fraunces, Work_Sans } from 'next/font/google'
import '../globals.css'

// The tool chrome runs in English LTR for now; the data inside it stays
// bilingual (every name and description field carries en and ar).
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

export const metadata: Metadata = {
  title: 'Retro — Admin',
  robots: { index: false, follow: false },
}

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" className={`${fraunces.variable} ${workSans.variable}`}>
      <body>{children}</body>
    </html>
  )
}
