import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const COUNT = 1500

/**
 * A static cloud of glowing motes filling the corridor volume. The ship flies
 * through them, so parallax streaming comes for free — no per-particle updates,
 * just a whisper of group drift for life.
 */
export function SpaceDust() {
  const group = useRef<THREE.Group>(null)

  const { positions, dot } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3)
    for (let i = 0; i < COUNT; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 150
      positions[i * 3 + 1] = (Math.random() - 0.5) * 95
      positions[i * 3 + 2] = 40 - Math.random() * 260
    }
    // soft round point sprite
    const s = 64
    const c = document.createElement('canvas')
    c.width = c.height = s
    const ctx = c.getContext('2d')!
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2)
    g.addColorStop(0, 'rgba(255,255,255,1)')
    g.addColorStop(0.5, 'rgba(255,255,255,0.4)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, s, s)
    const dot = new THREE.CanvasTexture(c)
    return { positions, dot }
  }, [])

  useFrame((_, delta) => {
    if (group.current) group.current.rotation.z += delta * 0.005
  })

  return (
    <group ref={group}>
      <points frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          map={dot}
          size={0.7}
          sizeAttenuation
          color="#bfe9ff"
          transparent
          opacity={0.7}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          fog={false}
        />
      </points>
    </group>
  )
}
