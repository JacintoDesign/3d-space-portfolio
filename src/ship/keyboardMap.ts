import type { KeyboardControlsEntry } from '@react-three/drei'

/** Flight control names consumed by the Ship controller. */
export type Controls =
  | 'accelerate'
  | 'brake'
  | 'yawLeft'
  | 'yawRight'
  | 'pitchUp'
  | 'pitchDown'
  | 'boost'
  | 'fire'

export const keyboardMap: KeyboardControlsEntry<Controls>[] = [
  { name: 'accelerate', keys: ['KeyW'] },
  { name: 'brake', keys: ['KeyS'] },
  { name: 'yawLeft', keys: ['KeyA', 'ArrowLeft'] },
  { name: 'yawRight', keys: ['KeyD', 'ArrowRight'] },
  { name: 'pitchUp', keys: ['ArrowUp'] },
  { name: 'pitchDown', keys: ['ArrowDown'] },
  { name: 'boost', keys: ['ShiftLeft', 'ShiftRight'] },
  { name: 'fire', keys: ['Space'] },
]
