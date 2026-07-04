import { useMemo, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import type { Landmark } from '../data/world'
import { useGame } from '../store/useGame'
import { projectById } from '../data/projects'
import { MODEL_URLS, useFittedModel } from '../scene/models'
import { pointerSteer } from '../ship/pointerSteer'
import { StationSign } from './StationSign'
import { HoloScreen } from './HoloScreen'

function screenContent(l: Landmark): { label: string; subtitle: string; video?: string } {
  const proj = l.refId ? projectById(l.refId) : undefined
  return { label: proj?.sign ?? l.sign, subtitle: proj?.tagline ?? '', video: proj?.video }
}

/** Orbiting satellite prop — circles the station core inside the spin group. */
function OrbitingSatellite({ radius, seed }: { radius: number; seed: number }) {
  const orbit = useRef<THREE.Group>(null)
  const model = useFittedModel(MODEL_URLS.satellite, radius * 0.55)
  const phase = (seed % 7) * 0.9

  useFrame((_, delta) => {
    if (orbit.current) orbit.current.rotation.y -= delta * 0.35
  })

  return (
    <group ref={orbit} rotation={[0.25, phase, 0.1]}>
      <group position={[radius * 1.55, radius * 0.18, 0]} rotation={[0, Math.PI / 2, 0]}>
        <primitive object={model} />
      </group>
    </group>
  )
}

/** Floating cargo cluster — market-flavour dressing beside project stations. */
function CargoCluster({ radius, seed }: { radius: number; seed: number }) {
  const bob = useRef<THREE.Group>(null)
  const model = useFittedModel(MODEL_URLS.cargo, radius * 0.85)
  const side = seed % 2 === 0 ? 1 : -1

  useFrame(({ clock }) => {
    if (bob.current) bob.current.position.y = Math.sin(clock.elapsedTime * 0.5 + seed) * 0.25
  })

  return (
    <group ref={bob} position={[side * radius * 1.35, -radius * 0.45, radius * 0.25]} rotation={[0.1, seed, 0.05]}>
      <primitive object={model} />
    </group>
  )
}

/** Comms dish prop — mounted beneath the ON AIR broadcast station. */
function CommsDish({ radius }: { radius: number }) {
  const model = useFittedModel(MODEL_URLS.dish, radius * 1.05)
  return (
    <group position={[0, -radius * 0.85, 0]} rotation={[-0.5, Math.PI / 4, 0]}>
      <primitive object={model} />
    </group>
  )
}

/**
 * Floating station — a fitted "Wikiplanet Space Station" GLB (CC-BY, Alan
 * Zimmerman) dressed with neon accent rings, Japanese signage, a holo screen,
 * and kind-specific props so each stop reads distinct at a glance.
 */
export function Station({ landmark }: { landmark: Landmark }) {
  const R = landmark.radius
  const color = landmark.color
  const spin = useRef<THREE.Group>(null)
  const halo = useRef<THREE.Mesh>(null)
  const t = useRef(0)

  const active = useGame((s) => s.nearTarget === landmark.id)
  const content = useMemo(() => screenContent(landmark), [landmark])
  const model = useFittedModel(MODEL_URLS.station, R * 2.5)

  // Click anywhere on the station to autopilot straight to it (unless the press
  // was a steer drag). Cursor turns to a pointer on hover.
  const travel = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    if (pointerSteer.moved || useGame.getState().mode !== 'play') return
    useGame.getState().setAutopilot(landmark.id)
  }
  const hoverOn = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    document.body.style.cursor = 'pointer'
  }
  const hoverOff = () => {
    document.body.style.cursor = ''
  }

  useFrame((_, delta) => {
    t.current += delta
    if (spin.current) spin.current.rotation.y += delta * 0.1
    if (halo.current) {
      const target = active ? 1 : 0
      const mat = halo.current.material as THREE.MeshBasicMaterial
      mat.opacity += (target * (0.6 + Math.sin(t.current * 4) * 0.2) - mat.opacity) * Math.min(1, delta * 6)
      const s = 1 + (active ? 0.08 + Math.sin(t.current * 4) * 0.05 : 0)
      halo.current.scale.setScalar(s)
    }
  })

  return (
    <group position={landmark.position} onClick={travel} onPointerOver={hoverOn} onPointerOut={hoverOff}>
      {/* generous invisible hit target so a click anywhere near the station flies you there */}
      <mesh>
        <sphereGeometry args={[R * 1.7, 16, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      {/* ---- rotating structure ---- */}
      <group ref={spin} rotation={[0, (landmark.seed % 10) * 0.63, 0]}>
        <primitive object={model} />

        {/* neon accent ring (bloom turns this into a glowing halo) */}
        <mesh rotation={[Math.PI / 2.1, 0, 0]}>
          <torusGeometry args={[R * 1.05, 0.06, 8, 64]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>

        {/* kind-specific dressing */}
        {landmark.refId === 'podcast' && <CommsDish radius={R} />}
        {landmark.seed % 2 === 1 && <OrbitingSatellite radius={R} seed={landmark.seed} />}
        {landmark.kind === 'project' && landmark.seed % 2 === 0 && (
          <CargoCluster radius={R} seed={landmark.seed} />
        )}
      </group>

      {/* docking bay glow facing the lane (+Z) */}
      <mesh position={[0, 0, R * 0.55]}>
        <ringGeometry args={[R * 0.18, R * 0.34, 28]} />
        <meshBasicMaterial color={color} toneMapped={false} side={THREE.DoubleSide} transparent opacity={0.9} />
      </mesh>

      {/* proximity halo (pulses when dockable) */}
      <mesh ref={halo} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[R * 1.35, 0.06, 8, 64]} />
        <meshBasicMaterial color={color} toneMapped={false} transparent opacity={0} />
      </mesh>

      {/* signage + holographic screen (do not spin) */}
      <StationSign sign={landmark.sign} signJP={landmark.signJP} color={color} radius={R} />
      <HoloScreen
        label={content.label}
        subtitle={content.subtitle}
        color={color}
        video={content.video}
        active={active}
        position={[0, R * 0.1, R + 3.4]}
      />

      <pointLight color={color} intensity={2.4} distance={R * 6} decay={1.6} />
    </group>
  )
}
