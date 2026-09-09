import { useMemo, useRef } from 'react'
import { Billboard } from '@react-three/drei'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import type { Landmark } from '../data/world'
import { useGame } from '../store/useGame'
import { projectById } from '../data/projects'
import { MODEL_URLS, useFittedModel } from '../scene/models'
import { pointerSteer } from '../ship/pointerSteer'
import { StationSign } from './StationSign'
import { HoloScreen } from './HoloScreen'
import { StationStructure } from './StationStructure'

function SurveySatellite({ radius, phase = 0 }: { radius: number; phase?: number }) {
  const orbit = useRef<THREE.Group>(null)
  const model = useFittedModel(MODEL_URLS.satellite, radius * 0.24)
  useFrame((_, delta) => {
    if (orbit.current && !useGame.getState().reducedMotion) orbit.current.rotation.y += Math.min(delta, 0.05) * 0.12
  })
  return (
    <group rotation={[0.45, phase, 0]}>
      <group ref={orbit}>
        <group position={[radius * 1.8, 0, 0]}><primitive object={model} /></group>
      </group>
    </group>
  )
}

/** Engineered, stationary facilities with independently rotating habitat wheels. */
export function Station({ landmark }: { landmark: Landmark }) {
  const R = landmark.radius
  const color = landmark.color
  const halo = useRef<THREE.Mesh>(null)
  const active = useGame((s) => s.nearTarget === landmark.id)
  const content = useMemo(() => {
    const project = landmark.refId ? projectById(landmark.refId) : undefined
    return { label: project?.sign ?? landmark.sign, subtitle: project?.tagline ?? '', video: project?.video, image: project?.image }
  }, [landmark])

  const travel = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (pointerSteer.moved || useGame.getState().mode !== 'play') return
    useGame.getState().setAutopilot(landmark.id)
  }
  const hoverOn = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    document.body.style.cursor = 'pointer'
  }
  const hoverOff = () => { document.body.style.cursor = '' }

  useFrame(({ clock }, delta) => {
    if (!halo.current) return
    const reduced = useGame.getState().reducedMotion
    const pulse = reduced ? 0.65 : 0.6 + Math.sin(clock.elapsedTime * 2) * 0.15
    const mat = halo.current.material as THREE.MeshBasicMaterial
    mat.opacity = THREE.MathUtils.damp(mat.opacity, active ? pulse : 0, 6, Math.min(delta, 0.05))
  })

  return (
    <group position={landmark.position} onClick={travel} onPointerOver={hoverOn} onPointerOut={hoverOff}>
      <mesh>
        <sphereGeometry args={[R * 1.65, 16, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <StationStructure id={landmark.refId ?? landmark.id} radius={R} color={color} />
      {landmark.id === 'waypoint' && <>
        <SurveySatellite radius={R} />
        <SurveySatellite radius={R} phase={Math.PI} />
      </>}
      <mesh ref={halo} rotation={[Math.PI / 2, 0, 0]} position={[0, -R * 1.05, 0]}>
        <torusGeometry args={[R * 1.3, 0.025, 6, 80]} />
        <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0} depthWrite={false} />
      </mesh>
      <StationSign sign={landmark.sign} signJP={landmark.signJP} color={color} radius={R} />
      {/* Camera-facing layout keeps the projection above the hull on every approach. */}
      <Billboard>
        <HoloScreen {...content} color={color} active={active} size={[4.4, 2.48]} position={[0, R * 2.05, 0]} />
      </Billboard>
      <pointLight position={[0, R * 0.6, R]} color={color} intensity={2.4} distance={R * 4} decay={1.6} />
    </group>
  )
}
