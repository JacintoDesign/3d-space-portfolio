import { useEffect, useMemo, useRef, type JSX } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { useGame } from '../store/useGame'

type Vec3 = [number, number, number]
type Finish =
  | 'hull' | 'frame' | 'solar' | 'glass' | 'light' | 'gold'
  | 'paper' | 'ink' | 'rust'
  | 'red' | 'orange' | 'white' | 'yellow' | 'green' | 'blue'
type Part = { finish: Finish; geometry: THREE.BufferGeometry }
const TAU = Math.PI * 2
const HALF_PI = Math.PI / 2

type Surface = { color?: string; metalness: number; roughness: number; emissive?: 'accent' | 'self'; glow?: number }
/** `color` undefined = the station's hull tint. Stickers glow faintly so they read in the nebula. */
const SURFACES: Record<Exclude<Finish, 'light'>, Surface> = {
  hull: { metalness: 0.55, roughness: 0.48 },
  frame: { color: '#263646', metalness: 0.75, roughness: 0.48 },
  solar: { color: '#132e52', metalness: 0.75, roughness: 0.32 },
  glass: { color: '#83c6d7', metalness: 0.3, roughness: 0.48, emissive: 'accent', glow: 0.45 },
  gold: { color: '#b99b65', metalness: 0.75, roughness: 0.48 },
  paper: { color: '#ece5d2', metalness: 0, roughness: 0.85, emissive: 'self', glow: 0.12 },
  ink: { color: '#1b1f28', metalness: 0.4, roughness: 0.5 },
  rust: { color: '#8f4529', metalness: 0.08, roughness: 0.93 },
  red: { color: '#e0283c', metalness: 0.05, roughness: 0.3, emissive: 'self', glow: 0.3 },
  orange: { color: '#ff7a1a', metalness: 0.05, roughness: 0.3, emissive: 'self', glow: 0.3 },
  white: { color: '#f1f1ec', metalness: 0.05, roughness: 0.3, emissive: 'self', glow: 0.2 },
  yellow: { color: '#f6d32d', metalness: 0.05, roughness: 0.3, emissive: 'self', glow: 0.3 },
  green: { color: '#1fb35a', metalness: 0.05, roughness: 0.3, emissive: 'self', glow: 0.3 },
  blue: { color: '#2b6cf0', metalness: 0.05, roughness: 0.3, emissive: 'self', glow: 0.3 },
}
const FINISHES = ['light', ...Object.keys(SURFACES)] as Finish[]

const composed = (position: Vec3 = [0, 0, 0], rotation: Vec3 = [0, 0, 0]) => new THREE.Matrix4().compose(
  new THREE.Vector3(...position),
  new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),
  new THREE.Vector3(1, 1, 1),
)

/** Bake repeated hardware into one mesh per finish, rather than hundreds of draws. */
function hardware(base?: THREE.Matrix4, parts: Part[] = []): Hardware {
  const add = (finish: Finish, geometry: THREE.BufferGeometry, position?: Vec3, rotation?: Vec3) => {
    geometry.applyMatrix4(composed(position, rotation))
    if (base) geometry.applyMatrix4(base)
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
    add(finish, geometry)
  }
  /** A sub-assembly in its own local frame, baked into the same parts list. */
  const frame = (position: Vec3, rotation?: Vec3) => {
    const local = composed(position, rotation)
    return hardware(base ? base.clone().multiply(local) : local, parts)
  }
  return { parts, add, box, beam, frame }
}
type Hardware = { parts: Part[]; add: (finish: Finish, geometry: THREE.BufferGeometry, position?: Vec3, rotation?: Vec3) => void; box: (finish: Finish, size: Vec3, position: Vec3, rotation?: Vec3) => void; beam: (from: Vec3, to: Vec3, width?: number, finish?: Finish) => void; frame: (position: Vec3, rotation?: Vec3) => Hardware }

function BakedHardware({ parts, color, hull = '#a7b5c4' }: { parts: Part[]; color: string; hull?: string }) {
  const batches = useMemo(() => FINISHES.flatMap((finish) => {
    const pieces = parts.filter((p) => p.finish === finish).map((p) => p.geometry.index ? p.geometry.toNonIndexed() : p.geometry)
    if (!pieces.length) return []
    const geometry = mergeGeometries(pieces, false)
    if (!geometry) throw new Error(`Unable to merge station ${finish} geometry`)
    return [{ finish, geometry }]
  }), [parts])

  // Geometries attached below are owned/disposed by R3F. Source parts are CPU-only.
  return <>{batches.map(({ finish, geometry }) => {
    if (finish === 'light') return (
      <mesh key={finish} geometry={geometry}><meshBasicMaterial color={color} toneMapped={false} /></mesh>
    )
    const s = SURFACES[finish]
    const base = s.color ?? hull
    return (
      <mesh key={finish} geometry={geometry}>
        <meshStandardMaterial
          color={base}
          side={THREE.DoubleSide}
          metalness={s.metalness}
          roughness={s.roughness}
          emissive={s.emissive === 'accent' ? color : s.emissive === 'self' ? base : '#000000'}
          emissiveIntensity={s.glow ?? 0}
        />
      </mesh>
    )
  })}</>
}

/** Station-local animation clock: frozen to `phase` in the inspection lab, still under reduced motion. */
function useStationClock(phase: number | undefined, tick: (t: number) => void) {
  const t = useRef(0)
  useFrame((_, delta) => {
    if (phase !== undefined) t.current = phase * 2
    else if (!useGame.getState().reducedMotion) t.current += Math.min(delta, 0.05)
    tick(t.current)
  })
}
const smooth = (x: number) => { const c = THREE.MathUtils.clamp(x, 0, 1); return c * c * (3 - 2 * c) }

// ───────────────────────────── shared hardware ─────────────────────────────

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
function sail(h: Hardware, position: Vec3, width: number, height: number, cols = 4, rows = 8) {
  const [x, y, z] = position
  h.box('frame', [width, height, 0.045], position)
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
function reflector(h: Hardware, position: Vec3, radius: number, rotation: Vec3 = [0, 0, 0]) {
  const f = h.frame(position, rotation)
  const profile = Array.from({ length: 13 }, (_, i) => {
    const r = radius * i / 12
    return new THREE.Vector2(r, 0.3 * r * r / radius)
  })
  // Lathe's bowl axis is +Y; rotate toward the front (+Z).
  f.add('hull', new THREE.LatheGeometry(profile, 40), [0, 0, 0], [HALF_PI, 0, 0])
  f.add('frame', new THREE.TorusGeometry(radius, 0.018, 6, 40), [0, 0, radius * 0.3])
  for (let i = 0; i < 3; i++) {
    const a = i * TAU / 3
    f.beam([Math.cos(a) * radius, Math.sin(a) * radius, radius * 0.3], [0, 0, radius * 0.8], 0.009)
  }
  f.add('gold', new THREE.CylinderGeometry(0.035, 0.035, 0.09, 8), [0, 0, radius * 0.8], [HALF_PI, 0, 0])
}

/** Deterministic lumpy rock; `plateau` shears the top flat so things can be built on it. */
function rock(radius: number, scale: Vec3, plateau?: number) {
  const g = new THREE.IcosahedronGeometry(radius, 2)
  const p = g.attributes.position as THREE.BufferAttribute
  const v = new THREE.Vector3()
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i)
    const n = Math.sin(v.x * 12.9898 + v.y * 78.233 + v.z * 37.719) * 43758.5453
    v.multiplyScalar(0.9 + (n - Math.floor(n)) * 0.18).multiply(new THREE.Vector3(...scale))
    if (plateau !== undefined) v.y = Math.min(v.y, plateau)
    p.setXYZ(i, v.x, v.y, v.z)
  }
  g.computeVertexNormals()
  return g
}

// ───────────────────────────── VibeMail ─────────────────────────────
// An email client: a sealed envelope core, a scrolling inbox of thread cards,
// a search lens, and an unread badge.

function mailDeck(h: Hardware) {
  const ez = -0.32
  // Envelope body + edge piping.
  h.box('hull', [1.12, 0.72, 0.16], [0, 0.2, ez])
  for (const face of [-1, 1]) {
    const z = ez + face * 0.086
    // The flap "V" and the lower fold lines, piped in light on both faces.
    h.beam([-0.54, 0.54, z], [0, 0.12, z], 0.014, 'light')
    h.beam([0.54, 0.54, z], [0, 0.12, z], 0.014, 'light')
    h.beam([-0.54, -0.14, z], [-0.14, 0.2, z], 0.008, 'frame')
    h.beam([0.54, -0.14, z], [0.14, 0.2, z], 0.008, 'frame')
  }
  for (const [a, b] of [[[-0.56, -0.16], [0.56, -0.16]], [[-0.56, 0.56], [0.56, 0.56]], [[-0.56, -0.16], [-0.56, 0.56]], [[0.56, -0.16], [0.56, 0.56]]] as const) {
    h.beam([a[0], a[1], ez], [b[0], b[1], ez], 0.03)
  }
  // Unread badge on the corner.
  h.add('light', new THREE.SphereGeometry(0.075, 16, 10), [0.56, 0.56, ez + 0.06])
  h.add('frame', new THREE.TorusGeometry(0.08, 0.012, 6, 20), [0.56, 0.56, ez + 0.06])

  // Inbox rail on the left (thread cards scroll along it, see InboxThreads).
  h.box('frame', [0.05, 1.35, 0.05], [-1.0, 0.2, -0.5])
  h.box('frame', [0.05, 1.35, 0.05], [-0.72, 0.2, -0.5])
  for (const y of [-0.47, 0.87]) h.box('hull', [0.62, 0.06, 0.4], [-0.86, y, -0.33])
  h.beam([-0.56, 0.2, ez], [-0.72, 0.2, -0.5], 0.03)

  // Search lens on the right: rim, glass, handle.
  const lens: Vec3 = [0.98, 0.36, ez]
  h.add('hull', new THREE.TorusGeometry(0.25, 0.05, 10, 36), lens)
  h.add('light', new THREE.TorusGeometry(0.25, 0.012, 6, 36), [lens[0], lens[1], lens[2] + 0.052])
  h.add('glass', new THREE.CylinderGeometry(0.22, 0.22, 0.02, 32), lens, [HALF_PI, 0, 0])
  h.beam([lens[0] + 0.19, lens[1] - 0.19, ez], [1.36, -0.2, ez], 0.05, 'hull')
  h.beam([1.27, -0.11, ez], [1.36, -0.2, ez], 0.058, 'frame')
  h.beam([0.56, 0.3, ez], [0.73, 0.33, ez], 0.03)

  // Relay mast, and a pressurised mail room down to the dock.
  h.beam([0, 0.56, ez], [0, 0.92, ez], 0.025)
  h.box('light', [0.05, 0.05, 0.05], [0, 0.95, ez])
  cabin(h, [0, -0.22, 0.06], [0.44, 0.32, 0.56])
}

/** Virtualised list: cards scroll up the rail, shrinking away at either end before recycling. */
function InboxThreads({ color, hull, phase }: { color: string; hull: string; phase?: number }) {
  const COUNT = 7
  const SPACING = 0.19
  const refs = useRef<(THREE.Group | null)[]>([])
  const parts = useMemo(() => {
    const h = hardware()
    h.box('glass', [0.5, 0.045, 0.34], [0, 0, 0])
    h.box('frame', [0.52, 0.02, 0.36], [0, -0.03, 0])
    h.box('light', [0.05, 0.02, 0.05], [-0.18, 0.03, 0.1])
    for (let i = 0; i < 3; i++) h.box('ink', [0.28 - i * 0.07, 0.008, 0.025], [0.02 - i * 0.035, 0.026, 0.1 - i * 0.07])
    return h.parts
  }, [])
  useStationClock(phase, (t) => {
    refs.current.forEach((g, i) => {
      if (!g) return
      const u = ((i * SPACING + t * 0.07) % (COUNT * SPACING)) / (COUNT * SPACING)
      g.position.y = -0.38 + u * 1.17
      g.scale.setScalar(Math.max(0.001, smooth(u / 0.12) * smooth((1 - u) / 0.12)))
    })
  })
  return <group position={[-0.86, 0, -0.3]}>
    {Array.from({ length: COUNT }, (_, i) => (
      <group key={i} ref={(g) => { refs.current[i] = g }}><BakedHardware parts={parts} color={color} hull={hull} /></group>
    ))}
  </group>
}

// ───────────────────────────── Astra ─────────────────────────────
// An orbital observatory: domed hub, rotating habitat ring, sensor boom — and
// the shader-lit planet it watches, hanging beneath.

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
  // Telescope: an angled tube on a yoke, peering out past the ring.
  const scope = h.frame([0, 0.3, -0.1], [-0.75, 0, 0])
  scope.add('hull', new THREE.CylinderGeometry(0.11, 0.13, 0.75, 16, 1, true), [0, 0.42, 0])
  scope.add('frame', new THREE.CylinderGeometry(0.1, 0.1, 0.02, 16), [0, 0.22, 0])
  scope.add('light', new THREE.TorusGeometry(0.11, 0.012, 6, 24), [0, 0.795, 0], [HALF_PI, 0, 0])
  for (const r of [0.3, 0.6]) scope.add('gold', new THREE.TorusGeometry(0.125, 0.014, 6, 24), [0, r, 0], [HALF_PI, 0, 0])
  // Narrow sensor boom occupies the rear opening, above the ring's swept volume.
  h.beam([0, 0.02, -0.23], [0, 0.02, -0.85], 0.032)
  h.beam([0, 0.02, -0.85], [0, 0.88, -0.85], 0.027)
  h.add('hull', new THREE.OctahedronGeometry(0.15), [0, 0.88, -0.85])
  h.box('light', [0.03, 0.12, 0.03], [0, 1.08, -0.85])
  // Tether down to the planet.
  h.beam([0, -0.7, 0], [0, -1.12, 0], 0.012, 'light')
}

/** Only the observatory rim rotates; its spokes, sensor mast, and dock stay fixed. */
function ObservatoryRim({ color, hull, phase }: { color: string; hull: string; phase?: number }) {
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
  useStationClock(phase, (t) => { if (rotor.current) rotor.current.rotation.z = t * 0.06 })
  // The complete swept rim stays below y=-.62, clear of the dock and its braces.
  return <group position={[0, -0.72, 0]} rotation={[HALF_PI, 0, 0]}><group ref={rotor}><BakedHardware parts={parts} color={color} hull={hull} /></group></group>
}

/** Banded gas world with an additive atmosphere shell. */
function AstraPlanet({ color, phase }: { color: string; phase?: number }) {
  const spin = useRef<THREE.Mesh>(null)
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 128
    const ctx = canvas.getContext('2d')!
    const accent = new THREE.Color(color)
    const deep = new THREE.Color('#1a1238')
    const pale = new THREE.Color('#9fd8ff')
    for (let y = 0; y < 128; y++) {
      const v = y / 128
      const band = Math.sin(v * 22) * 0.5 + Math.sin(v * 57 + 1.3) * 0.25 + Math.sin(v * 9) * 0.25
      const c = deep.clone().lerp(accent, 0.35 + band * 0.35).lerp(pale, Math.max(0, band - 0.55))
      ctx.fillStyle = `#${c.getHexString()}`
      ctx.fillRect(0, y, 256, 1)
    }
    // A storm eye.
    ctx.fillStyle = 'rgba(255,220,250,0.55)'
    ctx.beginPath()
    ctx.ellipse(170, 78, 18, 7, 0, 0, TAU)
    ctx.fill()
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }, [color])
  useEffect(() => () => texture.dispose(), [texture])
  useStationClock(phase, (t) => { if (spin.current) spin.current.rotation.y = t * 0.05 })
  return (
    <group position={[0, -1.62, 0]} rotation={[0.35, 0, 0.18]}>
      <mesh ref={spin}>
        <sphereGeometry args={[0.5, 48, 32]} />
        <meshStandardMaterial map={texture} roughness={0.8} metalness={0} emissive={color} emissiveIntensity={0.12} />
      </mesh>
      <mesh scale={1.12}>
        <sphereGeometry args={[0.5, 32, 24]} />
        <meshBasicMaterial color={color} side={THREE.BackSide} transparent opacity={0.28} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh rotation={[HALF_PI, 0, 0]}>
        <torusGeometry args={[0.78, 0.006, 6, 96]} />
        <meshBasicMaterial color={color} transparent opacity={0.55} toneMapped={false} depthWrite={false} />
      </mesh>
    </group>
  )
}

// ───────────────────────────── Mars Colony ─────────────────────────────
// A colony on a rust-red rock: pressurised domes linked by corridors, a mining
// derrick drilling into the regolith, life-support tanks, rovers and a solar farm.

function colony(h: Hardware) {
  const P = -0.3 // plateau height
  h.add('rust', rock(0.98, [1, 0.42, 0.8], P + 0.42), [0, -0.42, -0.34])
  // Lit landing pad on the front-left of the plateau.
  h.add('frame', new THREE.CylinderGeometry(0.17, 0.17, 0.02, 24), [-0.56, P + 0.01, 0.06])
  h.add('light', new THREE.TorusGeometry(0.15, 0.008, 6, 32), [-0.56, P + 0.022, 0.06], [HALF_PI, 0, 0])
  h.box('light', [0.12, 0.004, 0.02], [-0.56, P + 0.022, 0.06])
  h.box('light', [0.02, 0.004, 0.12], [-0.56, P + 0.022, 0.06])

  // Pressurised domes, each with a lit hab floor glowing through the glass.
  const domes: [number, number, number][] = [[-0.52, -0.42, 0.31], [0.1, -0.76, 0.27], [0.58, -0.32, 0.28]]
  for (const [x, z, r] of domes) {
    h.add('hull', new THREE.CylinderGeometry(r + 0.02, r + 0.05, 0.1, 24), [x, P + 0.05, z])
    h.add('glass', new THREE.SphereGeometry(r, 28, 14, 0, TAU, 0, HALF_PI), [x, P + 0.1, z])
    for (const a of [0, Math.PI / 3, -Math.PI / 3]) {
      h.add('frame', new THREE.TorusGeometry(r + 0.004, 0.009, 6, 28, Math.PI), [x, P + 0.1, z], [0, a, 0])
    }
    h.add('frame', new THREE.TorusGeometry(r * 0.72, 0.008, 6, 28), [x, P + 0.1 + r * 0.69, z], [HALF_PI, 0, 0])
    h.add('light', new THREE.TorusGeometry(r + 0.035, 0.012, 6, 36), [x, P + 0.105, z], [HALF_PI, 0, 0])
    // Airlock facing outward.
    const out = Math.atan2(x, z + 0.34)
    h.add('hull', new THREE.CylinderGeometry(0.05, 0.05, 0.12, 12).rotateX(HALF_PI).rotateY(out), [x + Math.sin(out) * (r + 0.05), P + 0.06, z + Math.cos(out) * (r + 0.05)])
  }
  // Corridors between the domes.
  h.beam([-0.52, P + 0.06, -0.42], [0.1, P + 0.06, -0.76], 0.05, 'hull')
  h.beam([0.1, P + 0.06, -0.76], [0.58, P + 0.06, -0.32], 0.05, 'hull')

  // Mining derrick: a tall tapered lattice tower over a drill head, the colony's landmark.
  const dx = -0.04
  const dz = -0.12
  const base = 0.14
  const top = 0.04
  const H = 1.1
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const
  corners.forEach(([sx, sz], i) => {
    const [nx, nz] = corners[(i + 1) % 4]
    h.beam([dx + sx * base, P, dz + sz * base], [dx + sx * top, P + H, dz + sz * top], 0.015, 'gold')
    for (const f of [0, 0.22, 0.44, 0.66]) {
      const w = base + (top - base) * f
      const wn = base + (top - base) * (f + 0.22)
      h.beam([dx + sx * w, P + H * f, dz + sz * w], [dx + nx * wn, P + H * (f + 0.22), dz + nz * wn], 0.007, 'gold')
    }
  })
  h.box('frame', [0.16, 0.06, 0.16], [dx, P + H, dz])
  h.add('frame', new THREE.CylinderGeometry(0.06, 0.06, 0.03, 16), [dx + 0.06, P + H + 0.05, dz], [0, 0, HALF_PI])
  h.box('light', [0.05, 0.08, 0.05], [dx, P + H + 0.07, dz])
  h.add('frame', new THREE.ConeGeometry(0.07, 0.2, 12), [dx, P + 0.08, dz], [Math.PI, 0, 0])
  h.add('frame', new THREE.CylinderGeometry(0.011, 0.011, H, 6), [dx, P + H / 2, dz])
  // Ore hopper + conveyor feeding the dock.
  h.box('gold', [0.18, 0.12, 0.16], [0.24, P + 0.06, 0.04])
  h.box('rust', [0.14, 0.03, 0.12], [0.24, P + 0.13, 0.04])
  h.beam([dx + 0.1, P + 0.04, dz + 0.06], [0.18, P + 0.08, 0.02], 0.02, 'frame')

  // Life-support tanks.
  for (const [i, z] of [[0, -0.02], [1, 0.12]] as const) {
    h.add('white', new THREE.CapsuleGeometry(0.06, 0.24, 4, 12), [0.5, P + 0.07, z + i * 0.01], [0, 0, HALF_PI])
  }
  h.box('frame', [0.04, 0.06, 0.26], [0.5, P + 0.03, 0.05])

  // Rovers on the regolith, headlights on.
  for (const [x, z, yaw] of [[-0.3, 0.16, 0.5], [0.2, -0.34, -2.2]] as const) {
    const r = h.frame([x, P, z], [0, yaw, 0])
    r.box('white', [0.2, 0.06, 0.12], [0, 0.065, 0])
    r.box('frame', [0.08, 0.05, 0.1], [-0.04, 0.115, 0])
    r.beam([-0.06, 0.14, 0.03], [-0.06, 0.24, 0.03], 0.005)
    for (const wx of [-0.07, 0.07]) for (const wz of [-0.066, 0.066]) {
      r.add('ink', new THREE.CylinderGeometry(0.034, 0.034, 0.03, 12), [wx, 0.034, wz], [HALF_PI, 0, 0])
    }
    r.box('light', [0.01, 0.018, 0.08], [0.102, 0.075, 0])
  }

  // Elevated solar farm on stilts along the rear rim.
  for (const x of [-0.5, 0.52]) {
    for (const sx of [-0.12, 0.12]) h.beam([x + sx, P, -0.98], [x + sx, P + 0.42, -0.98], 0.014)
    sail(h, [x, P + 0.62, -0.98], 0.5, 0.5, 4, 4)
  }
  // Comms mast on the back dome.
  h.beam([0.1, P + 0.37, -0.76], [0.1, P + 0.75, -0.76], 0.016)
  h.box('light', [0.04, 0.04, 0.04], [0.1, P + 0.77, -0.76])
  // Landing collar where the rock meets the dock.
  h.box('hull', [0.36, 0.26, 0.24], [0, -0.24, 0.32])
}

// ───────────────────────────── Cosmos ─────────────────────────────
// A NASA dashboard made physical: a mapped globe with the ISS tracking around it,
// glass widget panels (space weather, APOD, near-Earth objects), and a deep-space dish.

const GLOBE: Vec3 = [0, 0.22, -0.32]
const GLOBE_R = 0.4

function observatoryDeck(h: Hardware) {
  const [gx, gy, gz] = GLOBE
  h.add('glass', new THREE.SphereGeometry(GLOBE_R, 32, 20), GLOBE)
  // Graticule — the MapLibre grid.
  for (const lat of [-60, -30, 0, 30, 60]) {
    const a = lat * Math.PI / 180
    h.add(lat === 0 ? 'light' : 'frame', new THREE.TorusGeometry(Math.cos(a) * GLOBE_R + 0.003, lat === 0 ? 0.007 : 0.004, 4, 48),
      [gx, gy + Math.sin(a) * GLOBE_R, gz], [HALF_PI, 0, 0])
  }
  for (let i = 0; i < 6; i++) h.add('frame', new THREE.TorusGeometry(GLOBE_R + 0.003, 0.004, 4, 48), GLOBE, [0, i * Math.PI / 6, 0])
  // Ground-station pins on the map.
  for (const [lat, lon] of [[35, 0.4], [-20, -0.5], [50, 2.4], [10, -2.1]]) {
    const a = lat * Math.PI / 180
    const n = new THREE.Vector3(Math.cos(a) * Math.sin(lon), Math.sin(a), Math.cos(a) * Math.cos(lon))
    const pin = new THREE.ConeGeometry(0.022, 0.07, 8)
    pin.rotateX(Math.PI)
    pin.translate(0, 0.035, 0)
    pin.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), n))
    h.add('light', pin, n.multiplyScalar(GLOBE_R).add(new THREE.Vector3(...GLOBE)).toArray())
  }
  // ISS ground track (the station itself orbits in IssOrbit).
  h.add('light', new THREE.TorusGeometry(0.66, 0.004, 4, 96), GLOBE, [HALF_PI + 0.5, 0, 0.3])
  // Pedestal + mail-room link to the dock.
  h.add('hull', new THREE.CylinderGeometry(0.1, 0.18, 0.2, 16), [gx, gy - GLOBE_R - 0.06, gz])
  h.add('frame', new THREE.TorusGeometry(0.62, 0.02, 6, 64), [gx, gy - GLOBE_R - 0.16, gz], [HALF_PI, 0, 0])
  for (let i = 0; i < 4; i++) {
    const a = i * TAU / 4 + Math.PI / 4
    h.beam([gx, gy - GLOBE_R - 0.16, gz], [gx + Math.cos(a) * 0.62, gy - GLOBE_R - 0.16, gz + Math.sin(a) * 0.62], 0.016)
  }
  cabin(h, [0, -0.24, 0.17], [0.38, 0.3, 0.42])

  // Glassmorphic widget panels, fanned around the globe and facing outward.
  const widgets = ['weather', 'apod', 'neo', 'orbit'] as const
  widgets.forEach((kind, i) => {
    const yaw = [-1.95, -1.15, 1.15, 1.95][i]
    const p = h.frame([gx + Math.sin(yaw) * 1.0, gy + 0.05, gz + Math.cos(yaw) * 1.0], [0, yaw, 0])
    p.box('glass', [0.5, 0.36, 0.02], [0, 0, 0])
    p.box('frame', [0.54, 0.4, 0.012], [0, 0, -0.016])
    p.box('light', [0.5, 0.012, 0.004], [0, 0.18, 0.012])
    p.box('ink', [0.16, 0.015, 0.004], [-0.14, 0.14, 0.012])
    if (kind === 'weather') {
      ;[0.08, 0.15, 0.11, 0.21, 0.17, 0.24].forEach((bh, j) => p.box('light', [0.045, bh, 0.006], [-0.17 + j * 0.068, -0.15 + bh / 2, 0.013]))
    } else if (kind === 'apod') {
      p.box('ink', [0.36, 0.22, 0.004], [0, -0.03, 0.012])
      p.add('gold', new THREE.CircleGeometry(0.07, 20), [0.05, -0.02, 0.016])
      p.add('light', new THREE.RingGeometry(0.085, 0.095, 24), [0.05, -0.02, 0.017])
    } else if (kind === 'neo') {
      for (const [x, y, s] of [[-0.15, 0.03, 0.03], [-0.04, -0.09, 0.02], [0.06, 0.05, 0.035], [0.16, -0.05, 0.022], [0.0, -0.01, 0.015]]) {
        p.add('gold', new THREE.OctahedronGeometry(s), [x, y, 0.02])
      }
      p.add('light', new THREE.RingGeometry(0.11, 0.118, 32), [0, -0.02, 0.013])
    } else {
      const pts = [[-0.2, -0.1], [-0.12, 0.02], [-0.04, -0.04], [0.04, 0.08], [0.12, -0.02], [0.2, 0.06]]
      for (let j = 1; j < pts.length; j++) p.beam([pts[j - 1][0], pts[j - 1][1], 0.014], [pts[j][0], pts[j][1], 0.014], 0.006, 'light')
    }
    // Strut back to the pedestal ring.
    h.beam([gx + Math.sin(yaw) * 0.97, gy - 0.13, gz + Math.cos(yaw) * 0.97], [gx + Math.sin(yaw) * 0.62, gy - GLOBE_R - 0.16, gz + Math.cos(yaw) * 0.62], 0.014)
  })

  // Deep-space dish on a mast above the globe.
  h.beam([gx, gy + GLOBE_R, gz - 0.1], [gx, gy + GLOBE_R + 0.3, gz - 0.25], 0.025)
  reflector(h, [gx, gy + GLOBE_R + 0.34, gz - 0.27], 0.22, [-0.9, 0, 0])
}

/** A tiny ISS — truss, modules, four solar wings — riding the ground track. */
function IssOrbit({ color, hull, phase }: { color: string; hull: string; phase?: number }) {
  const rotor = useRef<THREE.Group>(null)
  const parts = useMemo(() => {
    const h = hardware()
    h.box('frame', [0.34, 0.02, 0.02], [0, 0, 0])
    h.add('white', new THREE.CylinderGeometry(0.025, 0.025, 0.16, 10), [0, 0, 0], [HALF_PI, 0, 0])
    h.add('white', new THREE.CylinderGeometry(0.02, 0.02, 0.1, 10), [0, 0.03, 0], [0, 0, HALF_PI])
    for (const x of [-0.15, -0.09, 0.09, 0.15]) h.box('solar', [0.045, 0.004, 0.17], [x, 0, 0])
    h.box('light', [0.012, 0.012, 0.012], [0, 0.06, 0])
    return h.parts
  }, [])
  useStationClock(phase, (t) => { if (rotor.current) rotor.current.rotation.z = t * 0.35 })
  return (
    <group position={GLOBE} rotation={[HALF_PI + 0.5, 0, 0.3]}>
      <group ref={rotor}>
        <group position={[0.66, 0, 0]} rotation={[-HALF_PI, 0, 0]}><BakedHardware parts={parts} color={color} hull={hull} /></group>
      </group>
    </group>
  )
}

// ───────────────────────────── Periodical ─────────────────────────────
// A three-volume magazine: the volumes stand on a shelf with numbered spines,
// and an open issue on a lectern above keeps turning its pages.

const LECTERN: Vec3 = [0, 0.78, -0.42]
const LECTERN_TILT: Vec3 = [-0.55, 0, 0]
const PAGE_W = 0.44
const PAGE_H = 0.56

function pageFace(h: Hardware, sign: number, picture: boolean) {
  for (const face of [-1, 1]) {
    const z = face * 0.008
    h.box('ink', [0.3, 0.035, 0.003], [sign * 0.22, 0.2, z])
    if (picture) h.box('gold', [0.3, 0.16, 0.003], [sign * 0.22, 0.04, z])
    for (let i = 0; i < (picture ? 4 : 8); i++) {
      h.box('ink', [i % 3 === 2 ? 0.2 : 0.32, 0.012, 0.003], [sign * (0.22 + (i % 3 === 2 ? -0.06 : 0) * sign), (picture ? -0.08 : 0.12) - i * 0.04, z])
    }
  }
}

function press(h: Hardware) {
  // Shelf with bookends.
  h.box('frame', [1.5, 0.05, 0.8], [0, -0.5, -0.46])
  for (const x of [-0.73, 0.73]) h.box('frame', [0.04, 0.4, 0.6], [x, -0.29, -0.5])
  h.box('light', [1.46, 0.012, 0.012], [0, -0.47, -0.135])

  // Three volumes, spines forward, numbered I · II · III.
  ;[-0.44, 0, 0.44].forEach((x, i) => {
    const lean = i === 2 ? -0.12 : 0
    const v = h.frame([x + (i === 2 ? 0.04 : 0), -0.47, -0.5], [0, 0, lean])
    const w = 0.3
    const H = [0.9, 0.82, 0.86][i]
    const d = 0.62
    // Page block, edged with fine lines so it reads as paper, not hull.
    v.box('paper', [w - 0.04, H - 0.05, d - 0.02], [0, H / 2, -0.02])
    for (let k = 1; k < 6; k++) v.box('ink', [w - 0.035, 0.004, 0.004], [0, H * k / 6, -d / 2 - 0.012])
    for (const s of [-1, 1]) v.box('hull', [0.022, H, d], [s * (w / 2 - 0.011), H / 2, 0])
    // Rounded spine.
    v.add('hull', new THREE.CylinderGeometry(w / 2, w / 2, H, 16, 1, false, -HALF_PI, Math.PI), [0, H / 2, d / 2 - 0.02])
    for (const y of [0.07, H - 0.07]) {
      v.add('gold', new THREE.CylinderGeometry(w / 2 + 0.004, w / 2 + 0.004, 0.025, 16, 1, true, -HALF_PI, Math.PI), [0, y, d / 2 - 0.02])
    }
    // Spine label with the volume number I · II · III.
    v.box('paper', [0.16, 0.24, 0.01], [0, H * 0.66, d / 2 + w / 2 - 0.015])
    for (let n = 0; n <= i; n++) v.box('ink', [0.022, 0.14, 0.006], [(n - i / 2) * 0.045, H * 0.66, d / 2 + w / 2 - 0.006])
    v.box('light', [0.12, 0.014, 0.01], [0, H * 0.32, d / 2 + w / 2 - 0.012])
  })

  // Lectern: an open issue tilted toward approaching pilots.
  const l = h.frame(LECTERN, LECTERN_TILT)
  l.box('hull', [PAGE_W * 2 + 0.08, PAGE_H + 0.06, 0.02], [0, 0, -0.03], [0, 0, 0])
  for (const s of [-1, 1]) {
    const page = new THREE.BoxGeometry(PAGE_W, PAGE_H, 0.01)
    page.translate(s * PAGE_W / 2, 0, 0)
    l.add('paper', page, [0, 0, 0], [0, s * -0.12, 0])
    const face = l.frame([0, 0, 0], [0, s * -0.12, 0])
    pageFace(face, s, s < 0)
  }
  l.box('gold', [0.03, PAGE_H + 0.02, 0.03], [0, 0, -0.01])
  h.beam([0, -0.47 + 0.92, -0.45], [0, LECTERN[1] - 0.18, LECTERN[2] - 0.08], 0.03)
  h.beam([-0.3, -0.47 + 0.92, -0.55], [0, LECTERN[1] - 0.18, LECTERN[2] - 0.08], 0.018)
  h.beam([0.3, -0.47 + 0.92, -0.55], [0, LECTERN[1] - 0.18, LECTERN[2] - 0.08], 0.018)

  // Printing-press rollers under the shelf feeding the dock.
  for (const z of [-0.3, -0.62]) h.add('gold', new THREE.CylinderGeometry(0.06, 0.06, 1.2, 16), [0, -0.6, z], [0, 0, HALF_PI])
  h.box('paper', [1.1, 0.008, 0.36], [0, -0.535, -0.46])
  cabin(h, [0, -0.24, 0.1], [0.4, 0.3, 0.42])
}

/** The page lifts toward the reader (+Z), crosses the spine, and lands on the left. */
function TurningPage({ color, hull, phase }: { color: string; hull: string; phase?: number }) {
  const leaf = useRef<THREE.Group>(null)
  const parts = useMemo(() => {
    const h = hardware()
    const page = new THREE.BoxGeometry(PAGE_W, PAGE_H, 0.008)
    page.translate(PAGE_W / 2, 0, 0)
    h.add('paper', page)
    pageFace(h, 1, false)
    return h.parts
  }, [])
  useStationClock(phase, (t) => {
    if (!leaf.current) return
    const cycle = (t % 4.5) / 4.5
    const k = smooth(cycle / 0.55)
    leaf.current.rotation.y = -0.12 - k * (Math.PI - 0.24)
    leaf.current.visible = cycle < 0.92
  })
  return (
    <group position={LECTERN} rotation={LECTERN_TILT}>
      <group position={[0, 0, 0.012]} ref={leaf}><BakedHardware parts={parts} color={color} hull={hull} /></group>
    </group>
  )
}

// ───────────────────────────── Cube Lab ─────────────────────────────
// A Rubik's Cube lab: a full-colour 3×3 core whose top layer keeps twisting,
// a 2×2 test cube tumbling above, and outboard sails.

const CUBE_C: Vec3 = [0, 0.1, -0.3]
const PITCH = 0.3
const CELL = 0.285
const FACE_COLORS: [Vec3, Finish][] = [
  [[1, 0, 0], 'red'], [[-1, 0, 0], 'orange'], [[0, 1, 0], 'white'],
  [[0, -1, 0], 'yellow'], [[0, 0, 1], 'green'], [[0, 0, -1], 'blue'],
]

function cubies(h: Hardware, n: number, pitch: number, cell: number, keep: (iy: number) => boolean) {
  const half = (n - 1) / 2
  for (let ix = 0; ix < n; ix++) for (let iy = 0; iy < n; iy++) for (let iz = 0; iz < n; iz++) {
    if (!keep(iy)) continue
    const c = [ix - half, iy - half, iz - half]
    const pos: Vec3 = [c[0] * pitch, c[1] * pitch, c[2] * pitch]
    h.box('ink', [cell, cell, cell], pos)
    for (const [axis, finish] of FACE_COLORS) {
      const a = axis.findIndex((v) => v !== 0)
      if (c[a] * axis[a] !== half) continue
      const size: Vec3 = [cell * 0.8, cell * 0.8, cell * 0.8]
      size[a] = 0.012
      const p: Vec3 = [...pos]
      p[a] += axis[a] * (cell / 2 + 0.005)
      h.box(finish, size, p)
    }
  }
}

function cubeLab(h: Hardware) {
  const core = h.frame(CUBE_C)
  cubies(core, 3, PITCH, CELL, (iy) => iy < 2)
  // Axle + bearing cap for the twisting layer.
  core.add('frame', new THREE.CylinderGeometry(0.03, 0.03, 0.2, 8), [0, PITCH * 1.5 + 0.1, 0])
  // Rear boom with sails.
  h.box('frame', [0.14, 0.14, 0.42], [0, CUBE_C[1], CUBE_C[2] - 0.62])
  for (const side of [-1, 1] as const) {
    h.beam([side * 0.2, CUBE_C[1], CUBE_C[2] - 0.62], [side * 0.68, CUBE_C[1], CUBE_C[2] - 0.62], 0.022)
    sail(h, [side * 0.96, CUBE_C[1] - 0.05, CUBE_C[2] - 0.62], 0.52, 1.0)
  }
  // Grid-size selector: lit pips for 2–6 layer modes on the boom.
  for (let i = 0; i < 5; i++) h.box('light', [0.03, 0.03, 0.03], [-0.12 + i * 0.06, CUBE_C[1] + 0.09, CUBE_C[2] - 0.62])
  // Containment rings around the core.
  h.add('frame', new THREE.TorusGeometry(0.66, 0.018, 6, 64), CUBE_C, [HALF_PI, 0, 0])
  h.add('light', new THREE.TorusGeometry(0.66, 0.006, 6, 64), [CUBE_C[0], CUBE_C[1] + 0.022, CUBE_C[2]], [HALF_PI, 0, 0])
  for (const a of [Math.PI / 4, -Math.PI / 4, 3 * Math.PI / 4, -3 * Math.PI / 4]) {
    h.beam([CUBE_C[0] + Math.cos(a) * 0.36, CUBE_C[1], CUBE_C[2] + Math.sin(a) * 0.36], [CUBE_C[0] + Math.cos(a) * 0.66, CUBE_C[1], CUBE_C[2] + Math.sin(a) * 0.66], 0.014)
  }
  cabin(h, [0, -0.24, 0.24], [0.36, 0.28, 0.36])
}

/** Top layer turns a quarter at a time; the mini cube tumbles slowly overhead. */
function CubeTwist({ color, hull, phase }: { color: string; hull: string; phase?: number }) {
  const layer = useRef<THREE.Group>(null)
  const mini = useRef<THREE.Group>(null)
  const parts = useMemo(() => {
    const top = hardware()
    cubies(top, 3, PITCH, CELL, (iy) => iy === 2)
    const small = hardware()
    cubies(small, 2, 0.13, 0.122, () => true)
    return { top: top.parts, small: small.parts }
  }, [])
  useStationClock(phase, (t) => {
    const STEP = 2.4
    const n = Math.floor(t / STEP)
    const k = smooth(((t % STEP) / STEP) / 0.35)
    const dir = n % 4 < 2 ? 1 : -1
    if (layer.current) layer.current.rotation.y = dir * (n % 2 + k) * HALF_PI
    if (mini.current) mini.current.rotation.set(t * 0.4, t * 0.3, t * 0.2)
  })
  return <group position={CUBE_C}>
    <group ref={layer}><BakedHardware parts={parts.top} color={color} hull={hull} /></group>
    <group position={[0, 0.82, 0]} ref={mini}><BakedHardware parts={parts.small} color={color} hull={hull} /></group>
  </group>
}

// ───────────────────────────── registry ─────────────────────────────

const BUILDERS: Record<string, (h: Hardware) => void> = {
  vibemail: mailDeck,
  astra: observatory,
  mars: colony,
  cosmos: observatoryDeck,
  periodical: press,
  cube: cubeLab,
}
const HULLS: Record<string, string> = {
  vibemail: '#c3d4e4', astra: '#a7b8c5', mars: '#c9b8a6', cosmos: '#9fb3c2', periodical: '#7a3b4b', cube: '#c5b4c8',
}
const MOVING: Record<string, ((p: { color: string; hull: string; phase?: number }) => JSX.Element)[]> = {
  vibemail: [InboxThreads],
  astra: [ObservatoryRim, AstraPlanet],
  cosmos: [IssOrbit],
  periodical: [TurningPage],
  cube: [CubeTwist],
}

export function StationStructure({ id, color, radius, phase }: { id: string; color: string; radius: number; phase?: number }) {
  const parts = useMemo(() => {
    const h = hardware()
    ;(BUILDERS[id] ?? mailDeck)(h)
    dock(h)
    return h.parts
  }, [id])
  const hull = HULLS[id] ?? '#a7b5c4'
  return (
    <group scale={radius}>
      <BakedHardware parts={parts} color={color} hull={hull} />
      {(MOVING[id] ?? []).map((Moving, i) => <Moving key={i} color={color} hull={hull} phase={phase} />)}
    </group>
  )
}
