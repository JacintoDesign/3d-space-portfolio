import { useEffect, useState } from 'react'
import * as THREE from 'three'

/**
 * Loads `src` as an sRGB texture, cover-cropped to `planeAspect` (like CSS
 * object-fit: cover) via repeat/offset. Returns null while loading or on any
 * error so the caller can fall back gracefully — a missing screenshot never
 * 404-breaks a station screen.
 */
export function useOptionalImageTexture(src: string | undefined, planeAspect: number) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null)

  useEffect(() => {
    if (!src) return
    let cancelled = false
    new THREE.TextureLoader().load(
      src,
      (tex) => {
        if (cancelled) {
          tex.dispose()
          return
        }
        tex.colorSpace = THREE.SRGBColorSpace
        const img = tex.image as { width: number; height: number }
        const imageAspect = img.width / img.height
        tex.wrapS = THREE.ClampToEdgeWrapping
        tex.wrapT = THREE.ClampToEdgeWrapping
        if (imageAspect > planeAspect) {
          tex.repeat.set(planeAspect / imageAspect, 1)
          tex.offset.set((1 - tex.repeat.x) / 2, 0)
        } else {
          tex.repeat.set(1, imageAspect / planeAspect)
          tex.offset.set(0, (1 - tex.repeat.y) / 2)
        }
        setTexture(tex)
      },
      undefined,
      () => {
        /* missing image → silent fallback */
      },
    )
    return () => {
      cancelled = true
      setTexture((t) => {
        t?.dispose()
        return null
      })
    }
  }, [src, planeAspect])

  return texture
}
