import { useEffect } from 'react'
import { Experience } from './scene/Experience'
import { UI } from './ui/UI'
import { SceneBoundary } from './ui/SceneBoundary'
import { useGame } from './store/useGame'
import { useShip } from './store/useShip'
import { useMarkers } from './store/useMarkers'
import { PROJECTS } from './data/projects'
import './styles/ui.css'

function detectMobile(): boolean {
  if (typeof window === 'undefined') return false
  const coarse = window.matchMedia?.('(pointer: coarse)').matches
  const narrow = window.innerWidth < 820
  return Boolean(coarse || narrow)
}

if (import.meta.env.DEV) {
  ;(window as unknown as { __game: typeof useGame }).__game = useGame
  ;(window as unknown as { __ship: typeof useShip }).__ship = useShip
  ;(window as unknown as { __markers: typeof useMarkers }).__markers = useMarkers
}

const PROJECT_IDS = new Set(PROJECTS.map((p) => p.id))

/** The URL hash that best describes the current view, for shareable deep-links. */
function hashFor(s: ReturnType<typeof useGame.getState>): string {
  if (s.mode === 'overlay' && s.activeBuilding) return '#' + s.activeBuilding
  if (s.mode === 'about') return '#about'
  if (s.mode === 'contact') return '#contact'
  return ''
}

/** Open whatever view a hash points at (project id / about / contact / empty). */
function applyHash(hash: string) {
  const id = hash.replace(/^#/, '')
  const g = useGame.getState()
  if (g.mode === 'loading') return // deep-link waits until launched
  if (id === 'about') {
    if (g.mode !== 'about') g.openAbout()
  } else if (id === 'contact') {
    if (g.mode !== 'contact') g.openContact()
  } else if (PROJECT_IDS.has(id)) {
    if (g.activeBuilding !== id) g.openOverlay(id)
  } else {
    // Empty / unknown hash → back to free flight.
    if (g.mode === 'overlay') g.closeOverlay()
    else if (g.mode === 'about') g.closeAbout()
    else if (g.mode === 'contact') g.closeContact()
  }
}

export default function App() {
  const setMobile = useGame((s) => s.setMobile)
  const setReducedMotion = useGame((s) => s.setReducedMotion)

  // Coarse mobile detection for controls + quality fallbacks.
  useEffect(() => {
    const update = () => setMobile(detectMobile())
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [setMobile])

  // Honour the OS "reduce motion" preference (calms auto-playing camera/scene).
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [setReducedMotion])

  // Deep-links: reflect the current view in the URL hash, apply an incoming hash
  // (shared link / manual edit), and open a deep-linked project once launched.
  useEffect(() => {
    const initialHash = window.location.hash
    let applied = false
    const sync = () => {
      const target = hashFor(useGame.getState())
      if (window.location.hash !== target) {
        const url = target || window.location.pathname + window.location.search
        window.history.replaceState(null, '', url)
      }
    }
    const unsub = useGame.subscribe((s) => {
      sync()
      if (!applied && s.mode === 'play' && initialHash) {
        applied = true
        applyHash(initialHash)
      }
    })
    const onHashChange = () => applyHash(window.location.hash)
    window.addEventListener('hashchange', onHashChange)
    // If we're already past the loader (e.g. fast reload), apply immediately.
    if (useGame.getState().mode === 'play' && initialHash) {
      applied = true
      applyHash(initialHash)
    }
    return () => {
      unsub()
      window.removeEventListener('hashchange', onHashChange)
    }
  }, [])

  // Global interact / escape / photo-mode handling.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const g = useGame.getState()
      const typing =
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement
      if (e.code === 'Escape') {
        if (g.photoMode) g.togglePhotoMode()
        else if (g.mode === 'overlay') g.closeOverlay()
        else if (g.mode === 'about') g.closeAbout()
        else if (g.mode === 'contact') g.closeContact()
      } else if (e.code === 'KeyP' && !typing && (g.mode === 'play' || g.photoMode)) {
        g.togglePhotoMode()
      } else if ((e.code === 'KeyE' || e.code === 'Enter') && g.mode === 'play' && g.nearTarget) {
        g.openOverlay(g.nearTarget)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // The boundary wraps the whole app so a WebGL failure / scene crash swaps in
  // the static portfolio fallback instead of leaving the loader or HUD stranded.
  return (
    <SceneBoundary>
      <Experience />
      <UI />
    </SceneBoundary>
  )
}
