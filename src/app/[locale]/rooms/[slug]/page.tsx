import { notFound } from 'next/navigation'
import { isLocale } from '@/i18n/config'
import { getDictionary } from '@/i18n/get-dictionary'
import { money } from '@/lib/format'
import { createClient } from '@/lib/supabase/server'
import { RoomScene, type SceneHotspot } from '@/components/storefront/room-scene'

export const dynamic = 'force-dynamic'

type RoomRow = {
  slug: string
  name_en: string
  name_ar: string
  scene_image_url: string
  room_hotspots: {
    id: string
    x: number
    y: number
    label_en: string | null
    label_ar: string | null
    product: {
      slug: string
      name_en: string
      name_ar: string
      species: string
      price: string
      currency: string
    } | null
  }[]
}

export default async function RoomPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale, slug } = await params
  if (!isLocale(locale)) notFound()
  const dict = await getDictionary(locale)

  const supabase = await createClient()
  const { data } = await supabase
    .from('rooms')
    .select(
      `
      slug, name_en, name_ar, scene_image_url,
      room_hotspots (
        id, x, y, label_en, label_ar,
        product:products ( slug, name_en, name_ar, species, price, currency )
      )
    `,
    )
    .eq('slug', slug)
    .maybeSingle()
  const room = data as unknown as RoomRow | null
  if (!room) notFound()

  const name = locale === 'ar' ? room.name_ar : room.name_en

  // hotspots whose product is inactive come back with a null embed — skip
  // them rather than pointing at nothing
  const hotspots: SceneHotspot[] = room.room_hotspots
    .filter((h) => h.product)
    .map((h) => ({
      id: h.id,
      x: h.x,
      y: h.y,
      label:
        (locale === 'ar' ? h.label_ar : h.label_en) ??
        (locale === 'ar' ? h.product!.name_ar : h.product!.name_en),
      product: {
        href: `/${locale}/products/${h.product!.slug}`,
        name: locale === 'ar' ? h.product!.name_ar : h.product!.name_en,
        material: h.product!.species,
        price: money(h.product!.price, h.product!.currency, locale),
      },
    }))

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="font-display text-4xl">{name}</h1>
      <div className="mt-6">
        <RoomScene
          sceneUrl={room.scene_image_url}
          alt={name}
          hotspots={hotspots}
          viewLabel={dict.room.viewPiece}
        />
      </div>
    </main>
  )
}
