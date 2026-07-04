import { useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { WarpStreaks } from './WarpStreaks'
import { MODEL_URLS, useFittedModel } from '../scene/models'

export interface ShipMotion {
  /** World speed, units/sec. */
  speed: number
  /** Normalised throttle 0..1 for cosmetic engine response. */
  throttle: number
  boost: boolean
  /** Target roll (radians) — the inner hull banks into turns. */
  bank: number
}

const TRIM = '#5be9ff'

/** Fitted GLB length (largest dimension) in world units. */
const SHIP_SIZE = 3.2

/**
 * Player fighter — Quaternius "Ultimate Spaceships" GLB (CC0), fitted and
 * oriented nose-down -Z (flight forward). The outer group is driven by the
 * controller; this inner group only does cosmetic roll + idle bob, reading the
 * shared `motion` ref so there's no React churn. Speed is sold by the
 * WarpStreaks + camera FOV, not exhaust geometry.
 */
export function ShipModel({ motion }: { motion: RefObject<ShipMotion> }) {
  const hull = useRef<THREE.Group>(null)
  const t = useRef(0)
  const model = useFittedModel(MODEL_URLS.ship, SHIP_SIZE)

  useFrame((_, delta) => {
    t.current += delta
    const m = motion.current
    // Bank the hull into turns, smoothed.
    if (hull.current) {
      hull.current.rotation.z += (m.bank - hull.current.rotation.z) * Math.min(1, delta * 8)
      // Subtle idle bob.
      hull.current.position.y = Math.sin(t.current * 1.6) * 0.04
    }
  })

  return (
    <group>
      <group ref={hull}>
        {/* Blender glTF exports face +Z; our flight forward is -Z. */}
        <group rotation={[0, Math.PI, 0]}>
          <primitive object={model} />
        </group>
      </group>

      {/* Soft point light so the ship lights nearby dust/stations */}
      <pointLight color={TRIM} intensity={6} distance={14} position={[0, 0, 0.6]} />

      {/* Warp light-streaks on boost (aligned to travel, not the banking hull) */}
      <WarpStreaks motion={motion} />
    </group>
  )
}
