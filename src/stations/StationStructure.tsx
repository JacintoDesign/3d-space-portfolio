import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { useGame } from '../store/useGame'

type Vec3 = [number, number, number]
type Finish = 'hull' | 'frame' | 'solar' | 'glass' | 'light' | 'gold'
type Part = { finish: Finish; geometry: THREE.BufferGeometry }
const TAU = Math.PI * 2

/** Bake repeated hardware into one mesh per finish, rather than hundreds of draws. */
function hardware() {
  const parts: Part[] = []
  const add = (finish: Finish, geometry: THREE.BufferGeometry, position: Vec3 = [0, 0, 0], rotation: Vec3 = [0, 0, 0]) => {
    const matrix = new THREE.Matrix4().compose(
      new THREE.Vector3(...position),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),
      new THREE.Vector3(1, 1, 1),
    )
    geometry.applyMatrix4(matrix)
    parts.push({ finish, geometry })
  }
  const box = (finish: Finish, size: Vec3, position: Vec3, rotation?: Vec3) =>
    add(finish, new THREE.BoxGeometry(...size), position, rotation)
  const beam = (from: Vec3, to: Vec3, width = 0.035, finish: Finish = 'frame') => {
    const a = new THREE.Vector3(...from)
    const b = new THREE.Vector3(...to)
    const geometry = new THREE.CylinderGeometry(width, width, a.distanceTo(b), 6)
    geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()))
    geometry.translate(...a.add(b).multiplyScalar(0.5).toArray())
    parts.push({ finish, geometry })
  }
  return { parts, add, box, beam }
}

function BakedHardware({ parts, color }: { parts: Part[]; color: string }) {
  const batches = useMemo(() => {
    const finishes: Finish[] = ['hull', 'frame', 'solar', 'glass', 'light', 'gold']
    return finishes.flatMap((finish) => {
      const pieces = parts.filter((p) => p.finish === finish).map((p) => p.geometry)
      if (!pieces.length) return []
      const geometry = mergeGeometries(pieces, false)!
      return [{ finish, geometry }]
    })
  }, [parts])

  // Geometries attached below are owned/disposed by R3F. Source parts are CPU-only.
  return <>{batches.map(({ finish, geometry }) => (
    <mesh key={finish} geometry={geometry}>
      {finish === 'light' ? (
        <meshBasicMaterial color={color} toneMapped={false} />
      ) : (
        <meshStandardMaterial
          color={{ hull: '#a7b5c4', frame: '#263646', solar: '#132e52', glass: '#83c6d7', gold: '#b99b65' }[finish]}
          metalness={finish === 'glass' ? 0.3 : finish === 'hull' ? 0.55 : 0.75}
          roughness={finish === 'solar' ? 0.32 : 0.48}
          emissive={finish === 'glass' ? color : '#000000'}
          emissiveIntensity={finish === 'glass' ? 0.45 : 0}
        />
      )}
    </mesh>
  ))}</>
}

/** Structural habitat wheel with inset windows, armored segments and radial tunnels. */
function HabitatWheel({ color, radius, tilt, speed }: { color: string; radius: number; tilt: Vec3; speed: number }) {
  const rotor = useRef<THREE.Group>(null)
  const parts = useMemo(() => {
    const h = hardware()
    h.add('frame', new THREE.TorusGeometry(radius, 0.083, 8, 80))
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU
      const gap = 0.07
      h.add('hull', new THREE.TorusGeometry(radius, 0.105, 6, 5, TAU / 16 - gap), [0, 0, 0], [0, 0, a + gap / 2])
      const x = Math.cos(a) * radius
      const y = Math.sin(a) * radius
      h.box('frame', [0.2, 0.06, 0.28], [x, y, 0], [0, 0, a])
      for (const z of [-0.105, 0.105]) {
        h.box('glass', [0.11, 0.038, 0.025], [x, y, z], [0, 0, a + Math.PI / 2])
      }
      if (i % 2 === 1) {
        h.box('frame', [0.08, 0.12, 0.018], [x, y, 0.112], [0, 0, a])
        h.box('gold', [0.035, 0.08, 0.02], [x, y, 0.127], [0, 0, a])
      }
      if (i % 4 === 0) {
        h.beam([Math.cos(a) * 0.28, Math.sin(a) * 0.28, 0], [x, y, 0], 0.055, 'hull')
        h.beam([0, 0, -0.24], [x, y, 0], 0.018)
        h.box('light', [0.1, 0.04, 0.03], [x, y, 0.15], [0, 0, a])
      }
    }
    return h.parts
  }, [radius])
  useFrame((_, delta) => {
    if (rotor.current && !useGame.getState().reducedMotion) rotor.current.rotation.z += Math.min(delta, 0.05) * speed
  })
  return <group rotation={tilt}><group ref={rotor}><BakedHardware parts={parts} color={color} /></group></group>
}

/** Two rigid solar wings with individual cells, hinges and a braced central spar. */
function solarWing(h: ReturnType<typeof hardware>, side: number, y: number, z: number, length = 0.64) {
  h.beam([side * 0.25, y, z], [side * 1.65, y, z], 0.045, 'hull')
  for (let panel = 0; panel < 2; panel++) {
    const x = side * (0.94 + panel * 0.5)
    h.box('frame', [0.46, 0.045, length * 2], [x, y, z])
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 3; col++) {
        h.box('solar', [0.125, 0.012, length / 4 - 0.025], [x + (col - 1) * 0.14, y + 0.03, z + (row - 3.5) * length / 4])
      }
    }
    h.box('gold', [0.022, 0.025, length * 2], [x, y + 0.04, z])
    h.box('light', [0.06, 0.025, 0.025], [x, y + 0.04, z + length])
  }
  h.beam([side * 0.3, y - 0.28, z], [side * 1.15, y, z], 0.025)
}

function modulePod(h: ReturnType<typeof hardware>, x: number, y: number, z: number, length: number) {
  h.add('hull', new THREE.CylinderGeometry(0.17, 0.17, length, 12), [x, y, z], [Math.PI / 2, 0, 0])
  for (const dz of [-length / 2, 0, length / 2]) {
    h.add('frame', new THREE.TorusGeometry(0.173, 0.022, 6, 16), [x, y, z + dz])
  }
  h.box('glass', [0.18, 0.08, 0.025], [x, y + 0.02, z + length / 2 + 0.008])
}

export function StationStructure({ id, color, radius }: { id: string; color: string; radius: number }) {
  const parts = useMemo(() => {
    const h = hardware()
    // Faceted pressure vessel, service collars, and a raised command deck.
    h.add('hull', new THREE.CylinderGeometry(0.34, 0.44, 0.8, 8))
    for (const y of [-0.38, 0.34]) {
      h.add('frame', new THREE.CylinderGeometry(0.46, 0.46, 0.07, 8), [0, y, 0])
    }
    h.add('hull', new THREE.CylinderGeometry(0.23, 0.32, 0.18, 8), [0, 0.51, 0])
    for (let i = 0; i < 8; i++) {
      const a = i * TAU / 8
      h.box('glass', [0.18, 0.065, 0.02], [Math.sin(a) * 0.284, 0.52, Math.cos(a) * 0.284], [0, a, 0])
      h.box('frame', [0.05, 0.48, 0.055], [Math.sin(a) * 0.39, -0.02, Math.cos(a) * 0.39], [0, a, 0])
    }
    // Service radiators under the pressure hull and paired propellant tanks.
    for (let i = 0; i < 6; i++) {
      h.box('frame', [0.46, 0.022, 0.34], [0, -0.48 - i * 0.045, -0.13])
    }
    for (const side of [-1, 1]) {
      h.add('gold', new THREE.CapsuleGeometry(0.085, 0.32, 4, 8), [side * 0.3, -0.25, -0.35])
      h.beam([side * 0.3, -0.44, -0.35], [side * 0.3, 0.02, -0.35], 0.018)
    }
    // A real recessed airlock: a dark back wall, deep tunnel, nested collars.
    h.add('frame', new THREE.CylinderGeometry(0.23, 0.23, 0.42, 12, 1, true), [0, -0.19, 0.52], [Math.PI / 2, 0, 0])
    h.box('frame', [0.36, 0.36, 0.03], [0, -0.19, 0.34])
    for (const z of [0.42, 0.64, 0.74]) {
      h.add(z === 0.64 ? 'light' : 'hull', new THREE.TorusGeometry(0.24, z === 0.64 ? 0.013 : 0.035, 6, 12), [0, -0.19, z])
    }
    // Cantilever docking apron, braces, rails, and paired approach lights.
    h.box('frame', [0.64, 0.07, 0.6], [0, -0.46, 0.8])
    h.box('hull', [0.48, 0.018, 0.58], [0, -0.416, 0.8])
    for (const side of [-1, 1]) {
      h.beam([side * 0.28, -0.6, 0.15], [side * 0.28, -0.48, 1.06], 0.025)
      h.beam([side * 0.3, -0.31, 0.52], [side * 0.3, -0.31, 1.05], 0.015)
      for (let i = 0; i < 4; i++) {
        h.box('light', [0.026, 0.015, 0.065], [side * 0.265, -0.408, 0.58 + i * 0.14])
      }
    }
    if (id === 'vibemail') {
      solarWing(h, -1, -0.12, -0.2)
      solarWing(h, 1, -0.12, -0.2)
      h.beam([0, 0.5, 0], [0, 1.03, 0], 0.06, 'hull')
      modulePod(h, -0.48, -0.27, 0, 0.68)
      modulePod(h, 0.48, -0.27, 0, 0.68)
    } else if (id === 'waypoint') {
      solarWing(h, -1, 0, -0.48, 0.48)
      solarWing(h, 1, 0, -0.48, 0.48)
      h.beam([0, 0.48, 0], [0, 1.18, 0], 0.038, 'hull')
      for (const side of [-1, 1]) {
        h.beam([side * 0.35, 0.15, 0], [0, 0.95, 0], 0.022)
      }
    } else if (id === 'music-player') {
      for (const side of [-1, 1]) {
        h.beam([0, 0, 0], [side * 0.8, 0, 0], 0.09, 'hull')
        modulePod(h, side * 0.8, 0, 0, 0.86)
        for (const y of [-0.21, 0.21]) {
          h.add('hull', new THREE.TorusGeometry(0.15, 0.028, 6, 24), [side * 0.8, y, 0.47])
          h.add('light', new THREE.TorusGeometry(0.11, 0.01, 6, 24), [side * 0.8, y, 0.48])
        }
      }
      solarWing(h, -1, -0.38, -0.45, 0.4)
      solarWing(h, 1, -0.38, -0.45, 0.4)
    } else if (id === 'scoundrel') {
      solarWing(h, -1, 0.18, -0.35, 0.72)
      h.beam([0.3, -0.15, 0], [1.22, -0.15, 0], 0.055, 'hull')
      for (let i = 0; i < 3; i++) {
        modulePod(h, 0.6 + i * 0.27, -0.24, -0.08, 0.52 + i * 0.13)
      }
      h.beam([-0.3, 0.3, 0], [-0.7, 0.9, 0], 0.035)
    } else {
      for (const side of [-1, 1]) {
        h.beam([0, 0, 0], [side * 0.88, 0, 0], 0.065, 'hull')
        for (let i = 0; i < 3; i++) modulePod(h, side * (0.51 + i * 0.27), 0, -0.08, 0.8)
      }
      solarWing(h, -1, -0.38, -0.5, 0.42)
      solarWing(h, 1, -0.38, -0.5, 0.42)
    }
    return h.parts
  }, [id])
  const tilt: Vec3 = id === 'waypoint' ? [0.35, 0.45, 0] : id === 'scoundrel' ? [0.5, -0.25, 0.2] : [Math.PI / 2.7, 0, 0]
  return (
    <group scale={radius}>
      <BakedHardware parts={parts} color={color} />
      <HabitatWheel color={color} radius={id === 'music-player' ? 1.24 : 1.08} tilt={id === 'music-player' ? [0, 0, 0] : tilt} speed={id === 'scoundrel' ? -0.035 : 0.045} />
      {id === 'waypoint' && <HabitatWheel color={color} radius={1.28} tilt={[-0.65, -0.5, 0]} speed={-0.03} />}
    </group>
  )
}
