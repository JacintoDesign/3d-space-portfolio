import { create } from 'zustand'

/**
 * Touch / virtual input shared between the on-screen mobile controls and the
 * flight controller. Read non-reactively in useFrame via getState().
 */
interface InputState {
  /** Steering vector from the d-pad, components in [-1, 1]. x = yaw, y = pitch (up = nose up). */
  steerX: number
  steerY: number
  /** Hold to thrust forward (no idle thrust — the d-pad only steers). */
  thrust: boolean
  /** Hold to accelerate past cruise. */
  boost: boolean
  /** Hold to brake to a stop. */
  brake: boolean
  setSteer: (x: number, y: number) => void
  setThrust: (v: boolean) => void
  setBoost: (v: boolean) => void
  setBrake: (v: boolean) => void
  reset: () => void
}

export const useInput = create<InputState>((set) => ({
  steerX: 0,
  steerY: 0,
  thrust: false,
  boost: false,
  brake: false,
  setSteer: (x, y) => set({ steerX: x, steerY: y }),
  setThrust: (v) => set({ thrust: v }),
  setBoost: (v) => set({ boost: v }),
  setBrake: (v) => set({ brake: v }),
  reset: () => set({ steerX: 0, steerY: 0, thrust: false, boost: false, brake: false }),
}))
