import { create } from 'zustand'

/**
 * Flight telemetry pushed from the in-canvas flight controller to the DOM HUD.
 * Updated at a throttled rate (~12Hz) so the HUD doesn't re-render every frame.
 */
interface ShipState {
  /** Normalised throttle for the HUD gauge, 0..1. */
  throttle: number
  /** Current speed in world units / second. */
  speed: number
  /** Boost engaged. */
  boosting: boolean
  /** Nearest dockable station id + its distance (null when none in sensor range). */
  targetId: string | null
  targetDist: number
  /** Ship world position + yaw heading, for the radar minimap and autopilot HUD. */
  px: number
  py: number
  pz: number
  heading: number
  setTelemetry: (t: Partial<Omit<ShipState, 'setTelemetry'>>) => void
}

export const useShip = create<ShipState>((set) => ({
  throttle: 0,
  speed: 0,
  boosting: false,
  targetId: null,
  targetDist: 0,
  px: 0,
  py: 0,
  pz: 0,
  heading: 0,
  setTelemetry: (t) => set(t),
}))
