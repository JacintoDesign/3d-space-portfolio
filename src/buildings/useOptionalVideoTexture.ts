import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

/**
 * Loads `src` as a looping muted VideoTexture **only if the file actually exists**
 * (verified with a HEAD request + video content-type). Returns null otherwise so
 * the caller can fall back to the procedural screen. This is what makes the
 * billboards "real demo clip ready": drop an mp4 at /videos/<id>.mp4 and it plays;
 * until then nothing 404s and the animated preview shows instead.
 *
 * `active` controls playback so off-screen clips don't decode needlessly.
 */
export function useOptionalVideoTexture(src: string | undefined, active: boolean) {
  const [texture, setTexture] = useState<THREE.VideoTexture | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    if (!src) return
    let cancelled = false
    let tex: THREE.VideoTexture | null = null
    let video: HTMLVideoElement | null = null

    fetch(src, { method: 'HEAD' })
      .then((res) => {
        const type = res.headers.get('content-type') ?? ''
        if (!res.ok || !type.startsWith('video')) return // missing → silent fallback
        if (cancelled) return
        video = document.createElement('video')
        video.src = src
        video.loop = true
        video.muted = true
        video.playsInline = true
        video.preload = 'auto'
        video.addEventListener('loadeddata', () => {
          if (cancelled || !video) return
          tex = new THREE.VideoTexture(video)
          tex.colorSpace = THREE.SRGBColorSpace
          setTexture(tex)
        })
        videoRef.current = video
      })
      .catch(() => {
        /* network error → fallback */
      })

    return () => {
      cancelled = true
      if (video) {
        video.pause()
        video.removeAttribute('src')
        video.load()
      }
      tex?.dispose()
      videoRef.current = null
      setTexture(null)
    }
  }, [src])

  // Pause/resume with proximity.
  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    if (active) v.play().catch(() => {})
    else v.pause()
  }, [active, texture])

  return texture
}
