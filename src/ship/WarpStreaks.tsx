import { useMemo, useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { ShipMotion } from './ShipModel'

const N = 44

/**
 * Additive light-streaks around the travel axis that appear and elongate on boost,
 * streaming past the chase camera for a sense of warp speed. Instanced + only
 * updated while visible, so it costs nothing at cruise.
 */
export function WarpStreaks({ motion }: { motion: RefObject<ShipMotion> }) {
  const mesh = useRef<THREE.InstancedMesh>(null)
  const mat = useRef<THREE.MeshBasicMaterial>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const seeds = useMemo(
    () =>
      Array.from({ length: N }, () => ({
        r: 1.6 + Math.random() * 5.2,
        a: Math.random() * Math.PI * 2,
        z: -16 + Math.random() * 32,
        len: 1.4 + Math.random() * 2.6,
        speed: 0.8 + Math.random() * 0.7,
      })),
    [],
  )

  useFrame((_, delta) => {
    const m = motion.current
    const vis = THREE.MathUtils.clamp(m.boost ? 1 : (m.throttle - 0.72) / 0.28, 0, 1)
    if (mat.current) mat.current.opacity = vis * 0.5
    if (mesh.current) mesh.current.visible = vis > 0.02
    if (!mesh.current || vis <= 0.02) return

    for (let i = 0; i < N; i++) {
      const s = seeds[i]
      s.z += (28 * vis + 6) * s.speed * delta // stream backward past the camera
      if (s.z > 17) s.z = -17
      dummy.position.set(Math.cos(s.a) * s.r, Math.sin(s.a) * s.r, s.z)
      dummy.scale.set(0.03, 0.03, s.len * (0.6 + vis * 2.4))
      dummy.updateMatrix()
      mesh.current.setMatrixAt(i, dummy.matrix)
    }
    mesh.current.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, N]} frustumCulled={false} visible={false}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial
        ref={mat}
        color="#cfefff"
        transparent
        opacity={0}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
        fog={false}
      />
    </instancedMesh>
  )
}
