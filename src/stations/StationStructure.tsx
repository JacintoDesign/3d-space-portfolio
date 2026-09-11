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

function BakedHardware({ parts, color, hull = '#a7b5c4' }: { parts: Part[]; color: string; hull?: string }) {
  const batches = useMemo(() => {
    const finishes: Finish[] = ['hull', 'frame', 'solar', 'glass', 'light', 'gold']
    return finishes.flatMap((finish) => {
      const pieces = parts.filter((p) => p.finish === finish).map((p) => p.geometry.index ? p.geometry.toNonIndexed() : p.geometry)
      if (!pieces.length) return []
      const geometry = mergeGeometries(pieces, false)
      if (!geometry) throw new Error(`Unable to merge station ${finish} geometry`)
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
          color={{ hull, frame: '#263646', solar: '#132e52', glass: '#83c6d7', gold: '#b99b65' }[finish]}
          side={THREE.DoubleSide}
          metalness={finish === 'glass' ? 0.3 : finish === 'hull' ? 0.55 : 0.75}
          roughness={finish === 'solar' ? 0.32 : 0.48}
          emissive={finish === 'glass' ? color : '#000000'}
          emissiveIntensity={finish === 'glass' ? 0.45 : 0}
        />
      )}
    </mesh>
  ))}</>
}

type Hardware = ReturnType<typeof hardware>
const HALF_PI = Math.PI / 2

/** Flush window strips, kept outside the pressure skin. */
function cabin(h: Hardware, position: Vec3, size: Vec3) {
  const [x, y, z] = position
  const [w, height, d] = size
  h.box('hull', size, position)
  h.box('frame', [w + 0.04, 0.045, d + 0.04], [x, y - height / 2, z])
  for (const side of [-1, 1]) {
    h.box('glass', [w * 0.72, height * 0.22, 0.018], [x, y + height * 0.17, z + side * (d / 2 + 0.012)])
    h.box('glass', [0.018, height * 0.22, d * 0.6], [x + side * (w / 2 + 0.012), y + height * 0.17, z])
  }
}

/** Modular solar sail with raised cells on BOTH faces and a busbar in the cell gap. */
function sail(h: Hardware, position: Vec3, width: number, height: number) {
  const [x, y, z] = position
  h.box('frame', [width, height, 0.045], position)
  const cols = 4
  const rows = 8
  for (const face of [-1, 1]) {
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      h.box('solar', [width / cols - 0.023, height / rows - 0.023, 0.008],
        [x + (i - (cols - 1) / 2) * width / cols, y + (j - (rows - 1) / 2) * height / rows, z + face * 0.029])
    }
    h.box('gold', [0.012, height - 0.04, 0.008], [x, y, z + face * 0.031])
  }
  for (const side of [-1, 1]) h.box('light', [0.045, 0.045, 0.015], [x + side * (width / 2 - 0.025), y + height / 2, z])
}

/** Front-facing pressure tunnel. All facilities reserve z >= .55 for the dock. */
function dock(h: Hardware) {
  h.box('hull', [0.34, 0.32, 0.12], [0, -0.24, 0.46])
  h.add('frame', new THREE.CylinderGeometry(0.19, 0.19, 0.38, 12, 1, true), [0, -0.24, 0.69], [HALF_PI, 0, 0])
  h.box('frame', [0.31, 0.31, 0.02], [0, -0.24, 0.51])
  for (const z of [0.57, 0.87]) h.add('hull', new THREE.TorusGeometry(0.2, 0.025, 6, 12), [0, -0.24, z])
  h.add('light', new THREE.TorusGeometry(0.193, 0.009, 6, 24), [0, -0.24, 0.885])
  h.box('frame', [0.54, 0.04, 0.5], [0, -0.465, 0.82])
  h.box('hull', [0.46, 0.015, 0.46], [0, -0.435, 0.82])
  for (const side of [-1, 1]) {
    h.beam([side * 0.14, -0.395, 0.45], [side * 0.22, -0.48, 1.04], 0.018)
    for (let i = 0; i < 3; i++) h.box('light', [0.025, 0.012, 0.06], [side * 0.23, -0.419, 0.65 + i * 0.16])
  }
}

/** A shallow parabolic reflector, built on an explicit rim and feed mast. */
function reflector(h: Hardware, position: Vec3, radius: number) {
  const [x, y, z] = position
  const profile = Array.from({ length: 13 }, (_, i) => {
    const r = radius * i / 12
    return new THREE.Vector2(r, 0.3 * r * r / radius)
  })
  // Lathe's bowl axis is +Y; rotate toward the front (+Z).
  const bowl = new THREE.LatheGeometry(profile, 40)
  h.add('hull', bowl, position, [HALF_PI, 0, 0])
  h.add('frame', new THREE.TorusGeometry(radius, 0.018, 6, 40), [x, y, z + radius * 0.3])
  for (let i = 0; i < 3; i++) {
    const a = i * TAU / 3
    h.beam([x + Math.cos(a) * radius, y + Math.sin(a) * radius, z + radius * 0.3], [x, y, z + radius * 0.8], 0.009)
  }
  h.add('gold', new THREE.CylinderGeometry(0.035, 0.035, 0.09, 8), [x, y, z + radius * 0.8], [HALF_PI, 0, 0])
}

/** VibeMail: a wide communications bus with tall outboard sails and a dish crown. */
function relay(h: Hardware) {
  cabin(h, [0, -0.05, 0], [0.58, 0.5, 0.82])
  h.box('frame', [2.6, 0.13, 0.13], [0, -0.15, -0.35])
  for (const side of [-1, 1]) {
    sail(h, [side * 1.04, 0.06, -0.25], 0.64, 1.52)
    h.beam([side * 0.28, -0.22, -0.35], [side * 0.71, 0.5, -0.35], 0.023)
    // Courier pods sit in the open gap between the central bus and sails.
    h.add('hull', new THREE.CapsuleGeometry(0.115, 0.32, 4, 12), [side * 0.49, -0.05, 0.1])
    h.beam([side * 0.28, -0.05, 0.1], [side * 0.49, -0.05, 0.1], 0.025)
  }
  h.beam([0, 0.2, -0.2], [0, 0.76, -0.2], 0.045, 'frame')
  h.beam([0, 0.76, -0.2], [0, 0.76, -0.081], 0.035)
  reflector(h, [0, 0.76, -0.08], 0.39)
}

/** Astra: a single horizontal observatory ring, with a fixed hub and spokes. */
function observatory(h: Hardware) {
  h.add('hull', new THREE.CylinderGeometry(0.27, 0.32, 0.95, 12), [0, -0.215, 0])
  h.add('glass', new THREE.SphereGeometry(0.265, 24, 12, 0, TAU, 0, HALF_PI), [0, 0.265, 0])
  h.add('frame', new THREE.TorusGeometry(0.28, 0.025, 6, 32), [0, 0.265, 0], [HALF_PI, 0, 0])
  // Bearing is stationary. The rotating outer rim starts at r=.98; this ends at .965.
  h.add('frame', new THREE.TorusGeometry(0.95, 0.015, 6, 80), [0, -0.72, 0], [HALF_PI, 0, 0])
  for (let i = 0; i < 6; i++) {
    const a = i * TAU / 6
    h.beam([Math.cos(a) * 0.28, -0.72, Math.sin(a) * 0.28], [Math.cos(a) * 0.95, -0.72, Math.sin(a) * 0.95], 0.026, 'hull')
  }
  h.box('hull', [0.34, 0.25, 0.22], [0, -0.24, 0.405])
  // Narrow sensor boom occupies the rear opening, above the ring's swept volume.
  h.beam([0, 0.02, -0.23], [0, 0.02, -0.85], 0.032)
  h.beam([0, 0.02, -0.85], [0, 0.88, -0.85], 0.027)
  h.add('hull', new THREE.OctahedronGeometry(0.15), [0, 0.88, -0.85])
  h.box('light', [0.03, 0.12, 0.03], [0, 1.08, -0.85])
}

/** Cosmos: two large resonator barrels and a stepped equalizer radiator. */
function soundDock(h: Hardware) {
  cabin(h, [0, -0.05, 0.03], [0.5, 0.48, 0.74])
  h.box('frame', [2.1, 0.12, 0.15], [0, -0.08, -0.25])
  for (const side of [-1, 1]) {
    const x = side * 0.85
    h.add('hull', new THREE.CylinderGeometry(0.36, 0.36, 0.65, 20, 1, true), [x, 0, 0], [HALF_PI, 0, 0])
    h.add('frame', new THREE.CylinderGeometry(0.34, 0.34, 0.04, 20), [x, 0, -0.31], [HALF_PI, 0, 0])
    for (const z of [-0.32, 0.32]) h.add('gold', new THREE.TorusGeometry(0.365, 0.023, 6, 32), [x, 0, z])
    // Inset stepped cones are behind the open front rim, never coplanar with it.
    h.add('frame', new THREE.CylinderGeometry(0.31, 0.13, 0.18, 24, 1, true), [x, 0, 0.2], [HALF_PI, 0, 0])
    h.add('light', new THREE.TorusGeometry(0.29, 0.012, 6, 32), [x, 0, 0.305])
    h.add('gold', new THREE.SphereGeometry(0.12, 16, 8), [x, 0, 0.1])
    h.beam([x, -0.3, -0.25], [x, -0.62, -0.25], 0.03)
    sail(h, [x, -0.73, -0.25], 0.56, 0.22)
  }
  h.box('frame', [1.45, 0.08, 0.11], [0, 0.4, -0.42])
  for (let i = 0; i < 7; i++) {
    const height = 0.26 + (3 - Math.abs(i - 3)) * 0.13
    const x = (i - 3) * 0.2
    h.box('hull', [0.105, height, 0.1], [x, 0.44 + height / 2, -0.42])
    h.box('light', [0.06, 0.025, 0.015], [x, 0.44 + height, -0.36])
  }
  h.beam([0, 0.16, -0.3], [0, 0.4, -0.42], 0.045)
}

/** Periodical: an open forked press gantry, with offset bridge and a crane. */
function salvage(h: Hardware) {
  h.box('hull', [2.1, 0.25, 0.34], [0, -0.13, -0.48])
  cabin(h, [-0.7, 0.18, -0.47], [0.52, 0.35, 0.38])
  for (const side of [-1, 1]) {
    const x = side * 0.96
    h.box('frame', [0.14, 0.17, 1.34], [x, -0.18, 0.31])
    h.box('frame', [0.045, 0.04, 1.34], [x + side * 0.09, -0.29, 0.31])
    for (let i = 0; i < 4; i++) {
      const z = -0.25 + i * 0.34
      h.box('hull', [0.2, 0.06, 0.18], [x, -0.05, z])
      h.beam([x + side * 0.09, -0.29, z - 0.1], [x + side * 0.09, -0.09, z + 0.12], 0.018, 'gold')
    }
    h.box('light', [0.11, 0.05, 0.04], [x, -0.16, 1])
  }
  // Separated salvage bins: .34-wide bins on .46 centers leave .12 clear.
  for (let i = 0; i < 3; i++) {
    const x = -0.13 + i * 0.46
    h.box('gold', [0.34, 0.31, 0.3], [x, 0.15, -0.5])
    for (const dx of [-0.12, 0.12]) h.box('frame', [0.025, 0.32, 0.32], [x + dx, 0.15, -0.5])
  }
  h.beam([-1.03, 0, -0.55], [-1.03, 0.85, -0.55], 0.05, 'gold')
  h.beam([-1.03, 0.85, -0.55], [-0.25, 1.05, -0.3], 0.05, 'gold')
  h.beam([-0.25, 1.05, -0.3], [-0.25, 0.61, 0.05], 0.014)
  h.add('frame', new THREE.TorusGeometry(0.07, 0.018, 6, 12, Math.PI * 1.4), [-0.25, 0.55, 0.05])
  h.box('hull', [0.45, 0.33, 0.75], [0, -0.23, 0.06])
}

/** Mars Colony: three domed cultivation pods, with clear service lanes between them. */
function greenhouse(h: Hardware) {
  const spacing = 0.78 // Pod outer diameter .60: .18-wide service lanes.
  h.box('frame', [2.12, 0.1, 0.13], [0, -0.16, -0.4])
  for (let i = -1; i <= 1; i++) {
    const x = i * spacing
    h.add('hull', new THREE.CylinderGeometry(0.3, 0.26, 0.36, 16), [x, 0, -0.2])
    h.add('glass', new THREE.SphereGeometry(0.28, 24, 12, 0, TAU, 0, HALF_PI), [x, 0.19, -0.2])
    h.add('hull', new THREE.TorusGeometry(0.286, 0.016, 6, 32), [x, 0.18, -0.2], [HALF_PI, 0, 0])
    for (const a of [0, HALF_PI]) {
      h.add('frame', new THREE.TorusGeometry(0.289, 0.009, 6, 24, Math.PI), [x, 0.19, -0.2], [0, a, 0])
    }
    h.beam([x, -0.17, -0.2], [x, -0.47, -0.2], 0.035)
    h.box('gold', [0.3, 0.14, 0.54], [x, -0.54, -0.2])
  }
  // Rear heat exchangers are wholly behind the dome envelopes (z < -.5).
  for (const x of [-0.5, 0.5]) {
    h.beam([x, -0.16, -0.4], [x, -0.16, -0.77], 0.025)
    sail(h, [x, 0.3, -0.8], 0.67, 0.87)
  }
  h.box('frame', [0.2, 0.1, 0.2], [0, -0.18, 0.12])
  h.box('hull', [0.4, 0.28, 0.34], [0, -0.24, 0.34])
}

/** Cube Lab: a 3×3 puzzle core with face-lit cells and outboard sails. */
function cubeLab(h: Hardware) {
  const cell = 0.2
  const pitch = 0.236
  const cy = 0
  const cz = -0.16
  for (let ix = -1; ix <= 1; ix++) {
    for (let iy = -1; iy <= 1; iy++) {
      for (let iz = -1; iz <= 1; iz++) {
        const x = ix * pitch
        const y = cy + iy * pitch
        const z = cz + iz * pitch
        h.box('hull', [cell, cell, cell], [x, y, z])
        if (Math.abs(ix) + Math.abs(iy) + Math.abs(iz) === 3) {
          h.box('gold', [cell * 0.42, cell * 0.42, cell * 0.42], [x, y, z])
        }
      }
    }
  }
  const face = pitch + cell / 2 + 0.012
  h.box('light', [cell * 0.55, cell * 0.55, 0.02], [0, cy, cz + face])
  h.box('light', [cell * 0.55, cell * 0.55, 0.02], [0, cy, cz - face])
  h.box('light', [0.02, cell * 0.55, cell * 0.55], [face, cy, cz])
  h.box('light', [0.02, cell * 0.55, cell * 0.55], [-face, cy, cz])
  h.box('light', [cell * 0.55, 0.02, cell * 0.55], [0, cy + face, cz])
  h.box('light', [cell * 0.55, 0.02, cell * 0.55], [0, cy - face, cz])
  h.box('frame', [0.14, 0.14, 0.42], [0, cy, cz - 0.62])
  for (const side of [-1, 1] as const) {
    h.beam([side * 0.22, cy, cz - 0.35], [side * 0.78, cy + 0.15, cz - 0.62], 0.022)
    sail(h, [side * 0.92, cy + 0.08, cz - 0.62], 0.52, 1.24)
  }
}

/** Only the observatory rim rotates; its spokes, sensor mast, and dock stay fixed. */
function ObservatoryRim({ color, phase }: { color: string; phase?: number }) {
  const rotor = useRef<THREE.Group>(null)
  const parts = useMemo(() => {
    const h = hardware()
    for (let i = 0; i < 16; i++) {
      const a = i * TAU / 16
      h.add('hull', new THREE.TorusGeometry(1.08, 0.1, 8, 5, TAU / 16 - 0.035), [0, 0, 0], [0, 0, a + 0.0175])
      h.box('glass', [0.08, 0.028, 0.012], [Math.cos(a) * 1.08, Math.sin(a) * 1.08, 0.107], [0, 0, a])
    }
    return h.parts
  }, [])
  useFrame((_, delta) => {
    if (!rotor.current) return
    if (phase !== undefined) rotor.current.rotation.z = phase
    else if (!useGame.getState().reducedMotion) rotor.current.rotation.z += Math.min(delta, 0.05) * 0.06
  })
  // The complete swept rim stays below y=-.62, clear of the dock and its braces.
  return <group position={[0, -0.72, 0]} rotation={[HALF_PI, 0, 0]}><group ref={rotor}><BakedHardware parts={parts} color={color} /></group></group>
}

const BUILDERS: Record<string, (h: Hardware) => void> = {
  vibemail: relay,
  astra: observatory,
  mars: greenhouse,
  cosmos: soundDock,
  periodical: salvage,
  cube: cubeLab,
}
const HULLS: Record<string, string> = {
  vibemail: '#b6c9dc', astra: '#a7b8c5', mars: '#c6d6bd', cosmos: '#918baf', periodical: '#8e8674', cube: '#c5b4c8',
}

export function StationStructure({ id, color, radius, phase }: { id: string; color: string; radius: number; phase?: number }) {
  const parts = useMemo(() => {
    const h = hardware()
    ;(BUILDERS[id] ?? relay)(h)
    dock(h)
    return h.parts
  }, [id])
  return (
    <group scale={radius}>
      <BakedHardware parts={parts} color={color} hull={HULLS[id]} />
      {id === 'astra' && <ObservatoryRim color={color} phase={phase} />}
    </group>
  )
}
