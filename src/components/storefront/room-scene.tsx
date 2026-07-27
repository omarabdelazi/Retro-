'use client'

import Link from 'next/link'
import { useState } from 'react'
import { cn } from '@/lib/utils'

export type SceneHotspot = {
  id: string
  /** fractions of the scene image, 0..1 */
  x: number
  y: number
  label: string
  product: {
    href: string
    name: string
    material: string
    price: string
  }
}

// A 2D room render with 2D hotspots — a fraction of the weight of a 3D
// scene and it works on any phone. Tapping a hotspot opens a card with the
// piece's name, material, and price.
export function RoomScene({
  sceneUrl,
  alt,
  hotspots,
  viewLabel,
}: {
  sceneUrl: string
  alt: string
  hotspots: SceneHotspot[]
  viewLabel: string
}) {
  const [openId, setOpenId] = useState<string | null>(null)
  const open = hotspots.find((h) => h.id === openId)

  return (
    <div className="relative overflow-hidden rounded-xs">
      <img src={sceneUrl} alt={alt} className="block w-full" />

      {hotspots.map((hotspot) => (
        <button
          key={hotspot.id}
          type="button"
          aria-label={hotspot.label}
          aria-expanded={openId === hotspot.id}
          onClick={() => setOpenId(openId === hotspot.id ? null : hotspot.id)}
          className={cn(
            'absolute size-11 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 outline-none focus-visible:outline-2 focus-visible:outline-ochre',
            openId === hotspot.id
              ? 'border-ochre bg-ochre'
              : 'border-bone bg-walnut/90 hover:bg-ochre',
          )}
          style={{ left: `${hotspot.x * 100}%`, top: `${hotspot.y * 100}%` }}
        >
          <span className="sr-only">{hotspot.label}</span>
          <span aria-hidden className="block text-xl leading-none text-bone">
            +
          </span>
        </button>
      ))}

      {open ? (
        <div className="absolute inset-x-3 bottom-3 flex flex-wrap items-center justify-between gap-3 border border-stone/60 bg-bone/95 p-4">
          <div>
            <p className="font-display text-xl">{open.product.name}</p>
            <p className="text-base text-ink/70">
              {open.product.material}
              <span className="mx-2 text-stone">·</span>
              {open.product.price}
            </p>
          </div>
          <Link
            href={open.product.href}
            className="rounded-xs bg-walnut px-4 py-2.5 text-base font-medium text-bone hover:bg-ochre hover:text-ink focus-visible:outline-2 focus-visible:outline-ochre"
          >
            {viewLabel}
          </Link>
        </div>
      ) : null}
    </div>
  )
}
