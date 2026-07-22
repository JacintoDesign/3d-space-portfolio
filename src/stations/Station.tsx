import { useMemo, useRef, type ComponentType } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import type { Landmark } from '../data/world'
import { useGame } from '../store/useGame'
import { projectById } from '../data/projects'
import { MODEL_URLS, useFittedModel } from '../scene/models'
import { pointerSteer } from '../ship/pointerSteer'
import { StationSign } from './StationSign'
import { HoloScreen } from './HoloScreen'

function screenContent(l: Landmark): {
  label: string
  subtitle: string
  video?: string
  image?: string
} {
  const proj = l.refId ? projectById(l.refId) : undefined
  return {
    label: proj?.sign ?? l.sign,
    subtitle: proj?.tagline ?? '',
    video: proj?.video,
    image: proj?.image,
  }
}

/* ------------------------------------------------------------------------ */
/* Kit-bash pieces — the three prop GLBs (dish, cargo, satellite) placed,    */
/* aimed and animated per station so every stop reads as its own facility.  */
/* ------------------------------------------------------------------------ */

interface PieceProps {
  size: number
  position?: [number, number, number]
  rotation?: [number, number, number]
}

/** Comms dish, aimed with plain rotation. */
function Dish({ size, position, rotation }: PieceProps) {
  const model = useFittedModel(MODEL_URLS.dish, size)
  return (
    <group position={position} rotation={rotation}>
      <primitive object={model} />
    </group>
  )
}

/** Cargo container. `bobSeed` adds a slow float so clusters feel unmoored. */
function Cargo({ size, position, rotation, bobSeed }: PieceProps & { bobSeed?: number }) {
  const bob = useRef<THREE.Group>(null)
  const model = useFittedModel(MODEL_URLS.cargo, size)
  const baseY = position?.[1] ?? 0

  useFrame(({ clock }) => {
    if (bob.current && bobSeed !== undefined) {
      bob.current.position.y = baseY + Math.sin(clock.elapsedTime * 0.5 + bobSeed) * 0.22
    }
  })

  return (
    <group ref={bob} position={position} rotation={rotation}>
      <primitive object={model} />
    </group>
  )
}

/** Satellite on a circular orbit: `tilt` inclines the plane, `speed` in rad/s. */
function OrbitSat({
  orbit,
  size,
  speed,
  tilt = 0,
  phase = 0,
  y = 0,
}: {
  orbit: number
  size: number
  speed: number
  tilt?: number
  phase?: number
  y?: number
}) {
  const spin = useRef<THREE.Group>(null)
  const model = useFittedModel(MODEL_URLS.satellite, size)

  useFrame((_, delta) => {
    if (spin.current) spin.current.rotation.y += delta * speed
  })

  return (
    <group rotation={[tilt, phase, 0]}>
      <group ref={spin}>
        <group position={[orbit, y, 0]} rotation={[0, Math.PI / 2, 0]}>
          <primitive object={model} />
        </group>
      </group>
    </group>
  )
}

/** Thin luminous accent ring (bloom turns it into neon). */
function NeonRing({
  radius,
  color,
  rotation = [Math.PI / 2, 0, 0],
  thickness = 0.05,
  opacity = 1,
}: {
  radius: number
  color: string
  rotation?: [number, number, number]
  thickness?: number
  opacity?: number
}) {
  return (
    <mesh rotation={rotation}>
      <torusGeometry args={[radius, thickness, 8, 64]} />
      <meshBasicMaterial color={color} toneMapped={false} transparent={opacity < 1} opacity={opacity} />
    </mesh>
  )
}

/* ------------------------- per-project facilities ------------------------ */

/** VIBEMAIL — mail relay: twin uplink dishes, a courier satellite, one parcel pod. */
function VibemailKit({ R, color }: { R: number; color: string }) {
  return (
    <>
      <Dish size={R * 1.05} position={[0, R * 0.95, 0]} rotation={[-0.4, 0.7, 0]} />
      <Dish size={R * 0.55} position={[R * 0.85, -R * 0.7, R * 0.15]} rotation={[0.9, -0.5, 0.2]} />
      <Cargo size={R * 0.5} position={[-R * 1.2, -R * 0.4, R * 0.25]} rotation={[0.15, 0.8, 0.1]} bobSeed={3} />
      <OrbitSat orbit={R * 1.5} size={R * 0.42} speed={0.6} tilt={0.18} />
      <NeonRing radius={R * 1.32} color={color} rotation={[Math.PI / 2.05, 0, 0]} thickness={0.035} opacity={0.7} />
    </>
  )
}

/** WAYPOINT — survey outpost: a GPS-style satellite constellation + ground-scan dish. */
function WaypointKit({ R, color }: { R: number; color: string }) {
  return (
    <>
      <Dish size={R * 0.85} position={[0, R * 1.0, 0]} rotation={[-1.1, 0.3, 0]} />
      <OrbitSat orbit={R * 1.35} size={R * 0.38} speed={0.5} tilt={0.45} />
      <OrbitSat orbit={R * 1.7} size={R * 0.32} speed={-0.34} tilt={-0.6} phase={2.1} />
      <OrbitSat orbit={R * 2.0} size={R * 0.28} speed={0.22} tilt={1.05} phase={4.2} />
      <Cargo size={R * 0.48} position={[0, -R * 1.05, 0]} rotation={[0.2, 0.5, 0.15]} bobSeed={7} />
      {/* drawn orbit line for the outermost bird */}
      <NeonRing radius={R * 1.7} color={color} rotation={[Math.PI / 2 - 0.6, 0, 0]} thickness={0.025} opacity={0.5} />
    </>
  )
}

/** ZTM MUSIC — sound dock: cargo speaker stacks port + starboard, horn dish, polar bird. */
function MusicKit({ R, color }: { R: number; color: string }) {
  return (
    <>
      <Cargo size={R * 0.9} position={[-R * 1.35, -R * 0.1, 0]} rotation={[0, 0.35, 0]} bobSeed={1} />
      <Cargo size={R * 0.9} position={[R * 1.35, -R * 0.1, 0]} rotation={[0, -0.35, 0]} bobSeed={4} />
      <Dish size={R * 0.75} position={[0, R * 0.95, -R * 0.3]} rotation={[-0.9, Math.PI, 0]} />
      <OrbitSat orbit={R * 1.6} size={R * 0.4} speed={0.7} tilt={Math.PI / 2 - 0.22} phase={1} />
      {/* upright ring — reads like a giant speaker driver behind the core */}
      <NeonRing radius={R * 1.18} color={color} rotation={[0, 0, 0]} thickness={0.04} opacity={0.65} />
    </>
  )
}

/** SCOUNDREL — rogue's den: tumbling loot crates, a tilted shield dish, an eccentric bird. */
function ScoundrelKit({ R, color }: { R: number; color: string }) {
  return (
    <>
      <Cargo size={R * 0.65} position={[R * 1.1, -R * 0.65, R * 0.3]} rotation={[0.4, 1.2, 0.3]} bobSeed={2} />
      <Cargo size={R * 0.48} position={[R * 1.55, -R * 0.1, -R * 0.2]} rotation={[0.8, 2.4, 0.5]} bobSeed={5} />
      <Cargo size={R * 0.38} position={[-R * 1.25, -R * 0.55, -R * 0.35]} rotation={[1.1, 0.3, 0.9]} bobSeed={8} />
      <Dish size={R * 0.7} position={[-R * 0.9, R * 0.7, 0]} rotation={[0.5, -1.1, 0.6]} />
      <OrbitSat orbit={R * 1.8} size={R * 0.38} speed={-0.55} tilt={0.85} phase={3} />
      {/* crossed daggers: two counter-tilted rings */}
      <NeonRing radius={R * 1.24} color={color} rotation={[Math.PI / 2 - 0.55, 0, 0.3]} thickness={0.03} opacity={0.6} />
      <NeonRing radius={R * 1.24} color={color} rotation={[Math.PI / 2 + 0.55, 0, -0.3]} thickness={0.03} opacity={0.6} />
    </>
  )
}

/** RECIPES — galley depot: a slow supply convoy of pallets, hood dish, spotter sat. */
function RecipesKit({ R, color }: { R: number; color: string }) {
  const convoy = useRef<THREE.Group>(null)
  useFrame((_, delta) => {
    if (convoy.current) convoy.current.rotation.y += delta * 0.18
  })
  return (
    <>
      <group ref={convoy}>
        {[0, 1, 2].map((i) => {
          const a = (i / 3) * Math.PI * 2
          return (
            <Cargo
              key={i}
              size={R * (0.5 - i * 0.06)}
              position={[Math.cos(a) * R * 1.55, -R * 0.2 + i * 0.5, Math.sin(a) * R * 1.55]}
              rotation={[0.1, a + 0.6, 0.05]}
            />
          )
        })}
      </group>
      <Dish size={R * 0.68} position={[0, R * 1.0, R * 0.2]} rotation={[-0.45, -0.8, 0]} />
      <OrbitSat orbit={R * 2.1} size={R * 0.28} speed={0.3} tilt={0.3} phase={5} />
      <NeonRing radius={R * 1.55} color={color} thickness={0.03} opacity={0.55} />
    </>
  )
}

const KITS: Record<string, ComponentType<{ R: number; color: string }>> = {
  vibemail: VibemailKit,
  waypoint: WaypointKit,
  'music-player': MusicKit,
  scoundrel: ScoundrelKit,
  recipes: RecipesKit,
}

/** Fallback dressing for any station without a bespoke kit. */
function DefaultKit({ R, color }: { R: number; color: string }) {
  return (
    <>
      <Dish size={R * 0.8} position={[0, -R * 0.85, 0]} rotation={[-0.5, Math.PI / 4, 0]} />
      <Cargo size={R * 0.6} position={[R * 1.35, -R * 0.45, R * 0.25]} rotation={[0.1, 1, 0.05]} bobSeed={1} />
      <OrbitSat orbit={R * 1.55} size={R * 0.45} speed={0.35} tilt={0.25} />
      <NeonRing radius={R * 1.3} color={color} thickness={0.035} opacity={0.6} />
    </>
  )
}

/** Slight per-facility lean of the core hull so silhouettes differ at a glance. */
const CORE_TILT: Record<string, [number, number, number]> = {
  vibemail: [0, 0, 0],
  waypoint: [0.22, 0, -0.12],
  'music-player': [0, 0, 0.18],
  scoundrel: [-0.15, 0, 0.2],
  recipes: [0.1, 0, 0.08],
}

/**
 * Floating station — a fitted "Wikiplanet Space Station" GLB (CC-BY, Alan
 * Zimmerman) kit-bashed per project with the dish / cargo / satellite props,
 * neon accent rings, Japanese signage, and a billboarded holo screen, so each
 * stop reads as its own facility at a glance.
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

  const Kit = (landmark.refId && KITS[landmark.refId]) || DefaultKit
  const coreTilt = (landmark.refId && CORE_TILT[landmark.refId]) || ([0, 0, 0] as [number, number, number])

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
        <group rotation={coreTilt}>
          <primitive object={model} />
        </group>

        {/* neon accent ring (bloom turns this into a glowing halo) */}
        <NeonRing radius={R * 1.05} color={color} rotation={[Math.PI / 2.1, 0, 0]} thickness={0.06} />

        {/* per-project kit-bash dressing */}
        <Kit R={R} color={color} />
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
        image={content.image}
        active={active}
        position={[0, R * 0.1, R + 3.4]}
      />

      <pointLight color={color} intensity={2.4} distance={R * 6} decay={1.6} />
    </group>
  )
}
