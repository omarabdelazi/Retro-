'use client'

import { useEffect, useRef } from 'react'

// 3D viewer with AR from one GLB: WebXR and Scene Viewer on Android, Quick
// Look on iOS (model-viewer generates the USDZ on device). The library
// itself is imported only when the viewer scrolls near the viewport, so it
// can never block first paint — until then the element renders its poster
// image like any other <img>. This component is only ever rendered for
// products that actually have a model; there is no placeholder state.
export function ProductModelViewer({
  src,
  poster,
  alt,
  arLabel,
}: {
  src: string
  poster?: string
  alt: string
  arLabel: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    let loaded = false
    const load = () => {
      if (loaded) return
      loaded = true
      void import('@google/model-viewer')
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          load()
          observer.disconnect()
        }
      },
      { rootMargin: '600px' },
    )
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={containerRef} className="aspect-square w-full bg-bone">
      <model-viewer
        src={src}
        poster={poster}
        alt={alt}
        ar
        ar-modes="webxr scene-viewer quick-look"
        camera-controls
        touch-action="pan-y"
        shadow-intensity="0.6"
        exposure="0.9"
        style={{ width: '100%', height: '100%' }}
      >
        {poster ? (
          // shown before the library upgrades the element, then as its poster
          <img
            slot="poster"
            src={poster}
            alt={alt}
            className="h-full w-full object-cover"
          />
        ) : null}
        <button
          slot="ar-button"
          className="absolute bottom-4 start-1/2 -translate-x-1/2 rounded-xs bg-walnut px-5 py-3 text-base font-medium text-bone hover:bg-ochre hover:text-ink focus-visible:outline-2 focus-visible:outline-ochre"
        >
          {arLabel}
        </button>
      </model-viewer>
    </div>
  )
}
