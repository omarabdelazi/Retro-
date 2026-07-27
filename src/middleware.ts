import { NextResponse, type NextRequest } from 'next/server'
import { defaultLocale, isLocale, locales, type Locale } from '@/i18n/config'

// Picks ar only when the request prefers it ahead of en; en otherwise.
function negotiateLocale(request: NextRequest): Locale {
  const header = request.headers.get('accept-language')
  if (!header) return defaultLocale
  for (const part of header.split(',')) {
    const tag = part.split(';')[0]?.trim().toLowerCase()
    if (!tag) continue
    const primary = tag.split('-')[0]
    if (primary && isLocale(primary)) return primary
  }
  return defaultLocale
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hasLocale = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  )
  if (hasLocale) return

  const locale = negotiateLocale(request)
  const url = request.nextUrl.clone()
  url.pathname = `/${locale}${pathname === '/' ? '' : pathname}`
  return NextResponse.redirect(url)
}

export const config = {
  // everything except next internals, api routes, and files with extensions
  matcher: ['/((?!_next|api|.*\\..*).*)'],
}
