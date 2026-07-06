import { create } from 'zustand'

/**
 * Touch / virtual input shared between the on-screen mobile controls and the
 * flight controller. Read non-reactively in useFrame via getState().
 */
interface InputState {
  /** Steering vector from touch-hold / d-pad, components in [-1, 1]. x = yaw, y = pitch (up = nose up). */
  steerX: number
  steerY: number
  /** Mobile: THRUST/BOOST locked heading from last screen aim at press time. */
  mobileAimLock: boolean
  /** Hold to thrust forward (no idle thrust — the d-pad only steers). */
  thrust: boolean
  /** Hold to accelerate past cruise. */
  boost: boolean
  /** Hold to brake to a stop. */
  brake: boolean
  /** Tap/hold to fire (void combat — mirrors Space on desktop). */
  fire: boolean
  setSteer: (x: number, y: number) => void
  setMobileAimLock: (x: number, y: number) => void
  clearMobileAimLock: () => void
  setThrust: (v: boolean) => void
  setBoost: (v: boolean) => void
  setBrake: (v: boolean) => void
  setFire: (v: boolean) => void
  reset: () => void
}

export const useInput = create<InputState>((set) => ({
  steerX: 0,
  steerY: 0,
  mobileAimLock: false,
  thrust: false,
  boost: false,
  brake: false,
  fire: false,
  setSteer: (x, y) => set({ steerX: x, steerY: y }),
  setMobileAimLock: (x, y) => set({ steerX: x, steerY: y, mobileAimLock: true }),
  clearMobileAimLock: () => set({ mobileAimLock: false, steerX: 0, steerY: 0 }),
  setThrust: (v) => set({ thrust: v }),
  setBoost: (v) => set({ boost: v }),
  setBrake: (v) => set({ brake: v }),
  setFire: (v) => set({ fire: v }),
  reset: () =>
    set({ steerX: 0, steerY: 0, mobileAimLock: false, thrust: false, boost: false, brake: false, fire: false }),
}))
