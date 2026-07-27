import Link from 'next/link'
import { notFound } from 'next/navigation'
import { isLocale } from '@/i18n/config'
import { getDictionary } from '@/i18n/get-dictionary'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type Row = { slug: string; name_en: string; name_ar: string; scene_image_url: string }

export default async function RoomsIndex({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!isLocale(locale)) notFound()
  const dict = await getDictionary(locale)

  const supabase = await createClient()
  const { data } = await supabase
    .from('rooms')
    .select('slug, name_en, name_ar, scene_image_url')
    .order('name_en')
  const rooms = (data ?? []) as Row[]

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="font-display text-4xl">{dict.nav.rooms}</h1>
      <ul className="mt-8 grid gap-6 md:grid-cols-2">
        {rooms.map((room) => {
          const name = locale === 'ar' ? room.name_ar : room.name_en
          return (
            <li key={room.slug}>
              <Link
                href={`/${locale}/rooms/${room.slug}`}
                className="group block focus-visible:outline-2 focus-visible:outline-ochre"
              >
                <img
                  src={room.scene_image_url}
                  alt={name}
                  loading="lazy"
                  className="aspect-[3/2] w-full object-cover"
                />
                <span className="mt-3 block font-display text-2xl group-hover:text-walnut">
                  {name}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </main>
  )
}
