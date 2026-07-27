import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { defaultLocale, isLocale, locales, type Locale } from '@/i18n/config'

// Two jobs: keep Supabase sessions fresh for the tool routes, and put every
// storefront path behind a locale. Tool routes (/admin, /login) sit outside
// the locale tree — the dashboard chrome is not storefront surface.
const TOOL_PREFIXES = ['/admin', '/workshop', '/login']

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

async function refreshSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  let response = NextResponse.next({ request })
  if (!url || !key) return response

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        )
      },
    },
  })

  // getUser revalidates the token and rotates cookies when needed
  await supabase.auth.getUser()
  return response
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (TOOL_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return refreshSession(request)
  }

  const hasLocale = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  )
  if (hasLocale) return NextResponse.next()

  const locale = negotiateLocale(request)
  const url = request.nextUrl.clone()
  url.pathname = `/${locale}${pathname === '/' ? '' : pathname}`
  return NextResponse.redirect(url)
}

export const config = {
  // everything except next internals, api routes, and files with extensions
  matcher: ['/((?!_next|api|.*\\..*).*)'],
}
