import { useMemo } from 'react'
import * as THREE from 'three'
import { Billboard } from '@react-three/drei'
import { makeSignTexture } from '../scene/signTexture'

interface NeonTextProps {
  text: string
  color: string
  vertical?: boolean
  height: number
  position?: [number, number, number]
  rotation?: [number, number, number]
}

/** A single glowing canvas-painted neon sign plane (bloom turns it into real neon). */
export function NeonText({ text, color, vertical = false, height, position, rotation }: NeonTextProps) {
  const { texture, aspect } = useMemo(
    () => makeSignTexture(text, color, { vertical }),
    [text, color, vertical],
  )
  return (
    <mesh position={position} rotation={rotation}>
      <planeGeometry args={[height * aspect, height]} />
      <meshBasicMaterial
        map={texture}
        transparent
        toneMapped={false}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  )
}

interface StationSignProps {
  sign: string
  signJP: string
  color: string
  radius: number
}

/**
 * Station signage: a tall Japanese blade-sign hanging off one side and a Latin
 * neon nameplate above the core. The nameplate billboards toward the camera so
 * both signs read from any approach direction.
 */
export function StationSign({ sign, signJP, color, radius }: StationSignProps) {
  return (
    <Billboard>
      {/* Keep the nameplate clear of the mounted communications equipment. */}
      <NeonText text={sign} color={color} height={1.05} position={[0, radius * 1.48, 0]} />

      {/* Japanese vertical blade sign, off to the right */}
      <NeonText text={signJP} color={color} vertical height={radius * 0.8} position={[radius * 1.85, 0, 0.1]} />

      {/* thin mounting post for the blade */}
      <mesh position={[radius * 1.85, 0, -0.05]}>
        <boxGeometry args={[0.06, radius * 0.95, 0.06]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    </Billboard>
  )
}
