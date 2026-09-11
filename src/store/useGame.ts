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

export const VOID_ROUND_MS = 60_000
export const VOID_SCORES_KEY = 'jd-void-scores'
export const VOID_SCORES_MAX = 3

export type VoidRound = 'idle' | 'active' | 'over'

export interface VoidScoreEntry {
  score: number
  at: number
}

export function formatVoidClock(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function voidRemainingMs(startedAt: number | null, now = performance.now()) {
  if (startedAt == null) return 0
  return Math.max(0, VOID_ROUND_MS - (now - startedAt))
}

function readVoidScores(): VoidScoreEntry[] {
  try {
    const raw = localStorage.getItem(VOID_SCORES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .flatMap((entry) => {
        if (!entry || typeof entry !== 'object') return []
        const score = (entry as VoidScoreEntry).score
        const at = (entry as VoidScoreEntry).at
        if (typeof score !== 'number' || !Number.isFinite(score)) return []
        return [{ score: Math.max(0, Math.floor(score)), at: typeof at === 'number' ? at : 0 }]
      })
      .sort((a, b) => b.score - a.score || b.at - a.at)
      .slice(0, VOID_SCORES_MAX)
  } catch {
    return []
  }
}

function writeVoidScores(scores: VoidScoreEntry[]) {
  try {
    localStorage.setItem(VOID_SCORES_KEY, JSON.stringify(scores.slice(0, VOID_SCORES_MAX)))
  } catch {
    /* private mode / quota */
  }
}

function recordVoidScore(score: number): { scores: VoidScoreEntry[]; at: number } {
  const at = Date.now()
  const scores = [...readVoidScores(), { score, at }]
    .sort((a, b) => b.score - a.score || b.at - a.at)
    .slice(0, VOID_SCORES_MAX)
  writeVoidScores(scores)
  return { scores, at }
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
  /** Timed asteroid-belt round: idle until drop-out, then one minute on the clock. */
  voidRound: VoidRound
  /** performance.now() when the current minute started. */
  voidRoundStartedAt: number | null
  /** Bumps on drop-out / restart so VoidCombat reseeds the field. */
  voidRoundTick: number
  /** High scores persisted in localStorage. */
  voidHighScores: VoidScoreEntry[]
  /** Timestamp of the run that just finished — used to highlight it on the board. */
  voidLastRunAt: number | null
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
  /** Persist the current score and open the high-score board. */
  endVoidRound: () => void
  /** Clear the field and start a fresh minute in the belt. */
  restartVoidRound: () => void
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
  voidRound: 'idle',
  voidRoundStartedAt: null,
  voidRoundTick: 0,
  voidHighScores: readVoidScores(),
  voidLastRunAt: null,
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
      voidScore: 0,
      voidRound: 'idle',
      voidRoundStartedAt: null,
      voidLastRunAt: null,
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
      voidScore: 0,
      voidRound: 'idle',
      voidRoundStartedAt: null,
      voidLastRunAt: null,
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
        voidScore: 0,
        voidRound: 'idle',
        voidRoundStartedAt: null,
        voidLastRunAt: null,
      }
    })
  },

  dropOutOfWarp: () => {
    if (!get().voidWarp || get().zone !== 'void') return
    playConfirm()
    if (get().isMobile) buzz(40)
    set((s) => ({
      voidWarp: false,
      voidScore: 0,
      voidRound: 'active',
      voidRoundStartedAt: performance.now(),
      voidRoundTick: s.voidRoundTick + 1,
      voidLastRunAt: null,
    }))
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

  addVoidScore: (points) => {
    if (get().voidRound === 'over') return
    set((s) => ({ voidScore: s.voidScore + points }))
  },

  endVoidRound: () => {
    const s = get()
    if (s.voidRound !== 'active') return
    const { scores, at } = recordVoidScore(s.voidScore)
    playConfirm()
    if (s.isMobile) buzz([20, 40, 70])
    set({
      voidRound: 'over',
      voidHighScores: scores,
      voidLastRunAt: at,
    })
  },

  restartVoidRound: () => {
    const s = get()
    if (s.zone !== 'void' || s.voidWarp) return
    playConfirm()
    set({
      voidScore: 0,
      voidRound: 'active',
      voidRoundStartedAt: performance.now(),
      voidRoundTick: s.voidRoundTick + 1,
      voidLastRunAt: null,
    })
  },

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
      voidRound: 'idle',
      voidRoundStartedAt: null,
      voidLastRunAt: null,
      homeTick: s.homeTick + 1,
    })
  },
}))

/** Convenience selector: is the player free to move? */
export const selectCanControl = (s: GameState) => s.mode === 'play'
