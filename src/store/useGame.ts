import { create } from 'zustand'
import { playPing, playConfirm, playBack } from '../audio/ambience'
import { LANDMARKS, WORLD } from '../data/world'

export type GameMode = 'loading' | 'play' | 'overlay' | 'about' | 'contact'

export type Zone = 'nebula' | 'void'

/** Discrete asteroid tiers in the void belt — fixed radii + score values. */
export type AsteroidSizeTier = 'small' | 'medium' | 'large'

export const VOID_ASTEROID_SCORES: Record<AsteroidSizeTier, number> = {
  small: 10,
  medium: 50,
  large: 100,
}

/**
 * Leaving an About/Contact warp cinematic routes the ship home through the
 * gateway to a project. Pick the station nearest the gateway (so the nebula-side
 * hop is short), preferring one you haven't docked at yet.
 */
function returnTarget(visited: string[]): string {
  const gw = WORLD.gateway.position
  let best = LANDMARKS[0].id
  let bestScore = Infinity
  for (const s of LANDMARKS) {
    const dx = s.position[0] - gw[0]
    const dy = s.position[1] - gw[1]
    const dz = s.position[2] - gw[2]
    const score = Math.sqrt(dx * dx + dy * dy + dz * dz) + (visited.includes(s.id) ? 1e5 : 0)
    if (score < bestScore) {
      bestScore = score
      best = s.id
    }
  }
  return best
}

const CONTROLS_KEY = 'jd-controls-seen'

/** Light haptic pulse on touch devices that support it (no-op elsewhere). */
function buzz(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern)
  } catch {
    /* ignore */
  }
}

function readControlsSeen(): boolean {
  try {
    return localStorage.getItem(CONTROLS_KEY) === '1'
  } catch {
    return false
  }
}

interface GameState {
  /** High-level UI mode. Ship control is live in 'play'; 'about' is the warp cinematic. */
  mode: GameMode
  /** Station id the ship is currently in dock range of (interaction prompt target). */
  nearTarget: string | null
  /** Station id whose overlay is currently open. */
  activeBuilding: string | null
  /** Station ids the player has already docked at (for radar dimming + waypoint dimming). */
  visited: string[]
  /** Autopilot destination: a station id, or 'gateway' (fly to the portal). */
  autopilot: string | null
  /** Station id the ship is hover-parked in front of (drives the framing camera). */
  parked: string | null
  /** Which side of the portal the ship is on. 'void' = the dark space beyond. */
  zone: Zone
  /** In the void: still in portal warp transit — drop out to enter the asteroid belt. */
  voidWarp: boolean
  /** Increments on every portal transit — drives the UI warp flash. */
  transit: number
  /** Whether the new-user controls tutorial has been dismissed (persisted). */
  controlsSeen: boolean
  /** Coarse mobile/touch detection — drives joystick + quality fallbacks. */
  isMobile: boolean
  /** OS "reduce motion" preference — calms auto-playing camera/scene motion. */
  reducedMotion: boolean
  /** Photo mode: hide all HUD/nav chrome for clean screenshots. */
  photoMode: boolean
  /** Ambient audio toggle. */
  muted: boolean
  /** Asteroids destroyed in the current void belt run. */
  voidScore: number
  /** Bumps on goHome — Ship + ChaseCamera snap back to the spawn pose. */
  homeTick: number

  setReady: () => void
  setMobile: (v: boolean) => void
  setReducedMotion: (v: boolean) => void
  togglePhotoMode: () => void
  setNearTarget: (id: string | null) => void
  setAutopilot: (id: string | null) => void
  setParked: (id: string | null) => void
  resumeFlight: () => void
  openOverlay: (id: string) => void
  closeOverlay: () => void
  openAbout: () => void
  closeAbout: () => void
  openContact: () => void
  closeContact: () => void
  /** Portal fly-through: swap zones and bump the transit counter (UI flash). */
  doTransit: () => void
  /** Exit sustained void warp and enter the asteroid belt. */
  dropOutOfWarp: () => void
  dismissControls: () => void
  toggleMuted: () => void
  addVoidScore: (points: number) => void
  /** Reset to the initial nebula spawn view — ship pose, zone, overlays, autopilot. */
  goHome: () => void
}

export const useGame = create<GameState>((set, get) => ({
  mode: 'loading',
  nearTarget: null,
  activeBuilding: null,
  visited: [],
  autopilot: null,
  parked: null,
  zone: 'nebula',
  voidWarp: false,
  transit: 0,
  controlsSeen: readControlsSeen(),
  isMobile: false,
  reducedMotion: false,
  photoMode: false,
  muted: true,
  voidScore: 0,
  homeTick: 0,

  setReady: () => set((s) => (s.mode === 'loading' ? { mode: 'play' } : {})),
  setMobile: (v) => set({ isMobile: v }),
  setReducedMotion: (v) => set({ reducedMotion: v }),
  togglePhotoMode: () => set((s) => ({ photoMode: !s.photoMode })),

  setNearTarget: (id) => {
    // Don't let proximity changes leak while an overlay is open.
    if (get().mode !== 'play') return
    if (get().nearTarget !== id) {
      if (id) playPing() // a new station just entered dock range
      set({ nearTarget: id })
    }
  },

  setAutopilot: (id) => {
    if (get().autopilot === id) return
    if (id) playPing()
    set({ autopilot: id })
  },

  resumeFlight: () => set({ parked: null, autopilot: null }),

  setParked: (id) => {
    if (get().parked !== id) set({ parked: id })
  },

  openOverlay: (id) => {
    playConfirm()
    if (get().isMobile) buzz(30)
    set((s) => ({
      mode: 'overlay',
      activeBuilding: id,
      autopilot: null,
      parked: s.parked === id ? id : null,
      visited: s.visited.includes(id) ? s.visited : [...s.visited, id],
    }))
  },

  closeOverlay: () => {
    playBack()
    set({ mode: 'play', activeBuilding: null })
  },

  openAbout: () => {
    playConfirm()
    // The warp cinematic plays out in the void; the ship jumps there (Ship
    // repositions on mode entry) and the transit bump fires the warp flash.
    set((s) => ({
      mode: 'about',
      activeBuilding: null,
      autopilot: null,
      parked: null,
      nearTarget: null,
      zone: 'void',
      voidWarp: false,
      transit: s.zone === 'void' ? s.transit : s.transit + 1,
    }))
  },

  closeAbout: () => {
    playBack()
    // Leave the void the way you'd expect: autopilot home through the gateway
    // to a project (Ship's routeViaGate threads the portal, then homes + parks).
    set((s) => (s.mode === 'about' ? { mode: 'play', autopilot: returnTarget(s.visited) } : {}))
  },

  openContact: () => {
    playConfirm()
    set((s) => ({
      mode: 'contact',
      activeBuilding: null,
      autopilot: null,
      parked: null,
      nearTarget: null,
      zone: 'void',
      voidWarp: false,
      transit: s.zone === 'void' ? s.transit : s.transit + 1,
    }))
  },

  closeContact: () => {
    playBack()
    set((s) => (s.mode === 'contact' ? { mode: 'play', autopilot: returnTarget(s.visited) } : {}))
  },

  doTransit: () => {
    playConfirm()
    if (get().isMobile) buzz([20, 30, 50])
    set((s) => {
      const enteringVoid = s.zone === 'nebula'
      return {
        zone: enteringVoid ? 'void' : 'nebula',
        voidWarp: enteringVoid,
        transit: s.transit + 1,
        voidScore: enteringVoid ? 0 : s.voidScore,
      }
    })
  },

  dropOutOfWarp: () => {
    if (!get().voidWarp || get().zone !== 'void') return
    playConfirm()
    if (get().isMobile) buzz(40)
    set({ voidWarp: false, voidScore: 0 })
  },

  dismissControls: () => {
    try {
      localStorage.setItem(CONTROLS_KEY, '1')
    } catch {
      /* ignore */
    }
    set({ controlsSeen: true })
  },

  toggleMuted: () => set((s) => ({ muted: !s.muted })),

  addVoidScore: (points) => set((s) => ({ voidScore: s.voidScore + points })),

  goHome: () => {
    const s = get()
    if (s.mode === 'loading') return
    playConfirm()
    set({
      mode: 'play',
      activeBuilding: null,
      autopilot: null,
      parked: null,
      nearTarget: null,
      zone: 'nebula',
      voidWarp: false,
      voidScore: 0,
      homeTick: s.homeTick + 1,
    })
  },
}))

/** Convenience selector: is the player free to move? */
export const selectCanControl = (s: GameState) => s.mode === 'play'
