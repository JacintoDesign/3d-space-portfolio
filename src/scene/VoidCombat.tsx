import { useMemo, useRef, type RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useKeyboardControls } from '@react-three/drei'
import * as THREE from 'three'
import type { Controls } from '../ship/keyboardMap'
import { useGame, VOID_ASTEROID_SCORES, type AsteroidSizeTier } from '../store/useGame'
import { createAsteroidGeometry } from './asteroidGeometry'
import { useInput } from '../store/useInput'

const MAX_ASTEROIDS = 120
const MAX_LASERS = 24
const MAX_EXPLOSIONS = 20
const DEBRIS_PER = 6
const SPARKS_PER = 14
const EXPLOSION_LIFE = 1.35
const ASTEROID_SPEED = 7
const LASER_SPEED = 140
const SPAWN_INTERVAL = 0.38
const SPAWN_BURST = 3
const SPAWN_RADIUS = 95
const HIT_RADIUS = 0.22
const FIRE_INTERVAL = 0.2
const GUN_FWD = 2.2
const GUN_SIDE = 0.85
const AIM_DIST = 120
const BELT_SEED = 42

const ASTEROID_TIERS: Record<AsteroidSizeTier, { r: number; weight: number }> = {
  small: { r: 0.95, weight: 0.52 },
  medium: { r: 1.75, weight: 0.33 },
  large: { r: 2.85, weight: 0.15 },
}

function pickAsteroidTier(): AsteroidSizeTier {
  const roll = Math.random()
  let acc = 0
  for (const [tier, { weight }] of Object.entries(ASTEROID_TIERS) as [AsteroidSizeTier, { r: number; weight: number }][]) {
    acc += weight
    if (roll < acc) return tier
  }
  return 'small'
}

type Asteroid = {
  x: number
  y: number
  z: number
  r: number
  tier: AsteroidSizeTier
  spin: number
  phase: number
  alive: boolean
  vx: number
  vy: number
  vz: number
  variant: number
  birth: number
}
type Laser = { x: number; y: number; z: number; dx: number; dy: number; dz: number; life: number; alive: boolean }
type DebrisSeed = {
  vx: number
  vy: number
  vz: number
  rx: number
  ry: number
  rz: number
  spinX: number
  spinY: number
  spinZ: number
  size: number
  sx: number
  sy: number
  sz: number
}
type SparkSeed = { vx: number; vy: number; vz: number }
type Explosion = {
  x: number
  y: number
  z: number
  scale: number
  life: number
  alive: boolean
  debris: DebrisSeed[]
  sparks: SparkSeed[]
}

function seedDebris(scale: number): DebrisSeed[] {
  return Array.from({ length: DEBRIS_PER }, () => {
    const u = Math.random()
    const v = Math.random()
    const theta = 2 * Math.PI * u
    const phi = Math.acos(2 * v - 1)
    const spd = 9 + Math.random() * 22
    const size = (0.14 + Math.random() * 0.42) * (0.65 + scale * 0.35)
    return {
      vx: spd * Math.sin(phi) * Math.cos(theta),
      vy: spd * Math.sin(phi) * Math.sin(theta),
      vz: spd * Math.cos(phi),
      rx: Math.random() * Math.PI * 2,
      ry: Math.random() * Math.PI * 2,
      rz: Math.random() * Math.PI * 2,
      spinX: (Math.random() - 0.5) * 14,
      spinY: (Math.random() - 0.5) * 12,
      spinZ: (Math.random() - 0.5) * 10,
      size,
      sx: 0.55 + Math.random() * 0.9,
      sy: 0.45 + Math.random() * 0.75,
      sz: 0.5 + Math.random() * 0.85,
    }
  })
}

function seedSparks(): SparkSeed[] {
  return Array.from({ length: SPARKS_PER }, () => {
    const u = Math.random()
    const v = Math.random()
    const theta = 2 * Math.PI * u
    const phi = Math.acos(2 * v - 1)
    const spd = 18 + Math.random() * 34
    return {
      vx: spd * Math.sin(phi) * Math.cos(theta),
      vy: spd * Math.sin(phi) * Math.sin(theta),
      vz: spd * Math.cos(phi),
    }
  })
}

function randSphere(): [number, number, number] {
  const u = Math.random()
  const v = Math.random()
  const theta = 2 * Math.PI * u
  const phi = Math.acos(2 * v - 1)
  const r = SPAWN_RADIUS * (0.35 + Math.random() * 0.65)
  return [
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.sin(phi) * Math.sin(theta) * 0.55,
    r * Math.cos(phi),
  ]
}

export function VoidCombat({ shipRef, practice }: {
  shipRef: RefObject<THREE.Group | null>
  /** Development bench drives the real projectile and fracture simulation. */
  practice?: { shot: number; paused: boolean; smallTarget?: boolean; coarseStep?: boolean; onImpact?: () => void; onStats: (stats: { large: number; medium: number; small: number; hits: number }) => void }
}) {
  const isVoid = useGame((s) => s.zone === 'void')
  const voidWarp = useGame((s) => s.voidWarp)
  const playing = useGame((s) => s.mode === 'play')
  const [, getKeys] = useKeyboardControls<Controls>()
  const camera = useThree((s) => s.camera)

  const asteroids = useRef<Asteroid[]>(
    Array.from({ length: MAX_ASTEROIDS }, () => ({
      x: 0,
      y: 0,
      z: 0,
      r: 0,
      tier: 'small' as AsteroidSizeTier,
      spin: 0,
      phase: 0,
      alive: false, vx: 0, vy: 0, vz: 0, variant: 0, birth: 0,
    })),
  )
  const lasers = useRef<Laser[]>(
    Array.from({ length: MAX_LASERS }, () => ({
      x: 0,
      y: 0,
      z: 0,
      dx: 0,
      dy: 0,
      dz: 0,
      life: 0,
      alive: false,
    })),
  )
  const explosions = useRef<Explosion[]>(
    Array.from({ length: MAX_EXPLOSIONS }, () => ({
      x: 0,
      y: 0,
      z: 0,
      scale: 1,
      life: 0,
      alive: false,
      debris: seedDebris(1),
      sparks: seedSparks(),
    })),
  )
  const astMeshes = useRef<(THREE.InstancedMesh | null)[]>([])
  const rockGeometries = useMemo(() => [0, 1, 2].map(createAsteroidGeometry), [])
  const hits = useRef(0)
  const reportedAt = useRef(0)
  const testShot = useRef(0)
  const laserMesh = useRef<THREE.InstancedMesh>(null)
  const flashMesh = useRef<THREE.InstancedMesh>(null)
  const debrisMesh = useRef<THREE.InstancedMesh>(null)
  const sparkMesh = useRef<THREE.InstancedMesh>(null)
  const flashMat = useRef<THREE.MeshBasicMaterial>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const spawnAcc = useRef(0)
  const fireCooldown = useRef(0)
  const fireSide = useRef(0)
  const beltSeeded = useRef(false)
  const fwd = useMemo(() => new THREE.Vector3(), [])
  const right = useMemo(() => new THREE.Vector3(), [])
  const spawnPos = useMemo(() => new THREE.Vector3(), [])
  const aimPoint = useMemo(() => new THREE.Vector3(), [])
  const muzzle = useMemo(() => new THREE.Vector3(), [])
  const aimDir = useMemo(() => new THREE.Vector3(), [])
  const ndcCenter = useMemo(() => new THREE.Vector2(0, 0), [])
  const raycaster = useMemo(() => new THREE.Raycaster(), [])

  const spawnAsteroid = (ship: THREE.Group) => {
    const pool = asteroids.current
    if (pool.filter((a) => a.alive).length >= MAX_ASTEROIDS - 12) return
    const slot = pool.find((a) => !a.alive)
    if (!slot) return

    const [ox, oy, oz] = randSphere()
    spawnPos.set(ox, oy, oz).applyQuaternion(ship.quaternion).add(ship.position)
    slot.x = spawnPos.x
    slot.y = spawnPos.y
    slot.z = spawnPos.z
    const tier = pickAsteroidTier()
    slot.tier = tier
    slot.r = ASTEROID_TIERS[tier].r
    slot.spin = (Math.random() - 0.5) * 2.2
    slot.phase = Math.random() * Math.PI * 2
    fwd.set(0, 0, 1).applyQuaternion(ship.quaternion).multiplyScalar(ASTEROID_SPEED)
    slot.vx = fwd.x
    slot.vy = fwd.y
    slot.vz = fwd.z
    slot.variant = Math.floor(Math.random() * rockGeometries.length)
    slot.birth = 0
    slot.alive = true
  }

  const seedBelt = (ship: THREE.Group) => {
    if (practice) {
      const a = asteroids.current[0]
      Object.assign(a, { x: 0, y: 0, z: -20, r: ASTEROID_TIERS[practice.smallTarget ? 'small' : 'large'].r, tier: practice.smallTarget ? 'small' : 'large', spin: 0.2, phase: 0, alive: true, vx: 0, vy: 0, vz: 0, variant: 0, birth: 0 })
    } else for (let i = 0; i < BELT_SEED; i++) spawnAsteroid(ship)
  }

  const reticleAim = (ship: THREE.Group) => {
    if (practice) {
      const target = asteroids.current.filter((a) => a.alive).sort((a, b) => b.r - a.r)[0]
      if (target) {
        const lead = Math.hypot(target.x - ship.position.x, target.y - ship.position.y, target.z - ship.position.z) / LASER_SPEED
        return aimPoint.set(target.x + target.vx * lead, target.y + target.vy * lead, target.z + target.vz * lead)
      }
    }
    raycaster.setFromCamera(ndcCenter, camera)
    // Converge on the rock under the reticle, avoiding camera/muzzle parallax.
    let nearest = AIM_DIST
    for (const a of asteroids.current) {
      if (!a.alive) continue
      spawnPos.set(a.x, a.y, a.z).sub(raycaster.ray.origin)
      const along = spawnPos.dot(raycaster.ray.direction)
      if (along > 0 && along < nearest && spawnPos.lengthSq() - along * along < a.r * a.r) nearest = along
    }
    aimPoint.copy(raycaster.ray.origin).addScaledVector(raycaster.ray.direction, nearest)
    if (!Number.isFinite(aimPoint.x)) {
      fwd.set(0, 0, -1).applyQuaternion(ship.quaternion).normalize()
      aimPoint.copy(ship.position).addScaledVector(fwd, AIM_DIST)
    }
    return aimPoint
  }

  const fireLaser = (ship: THREE.Group) => {
    const pool = lasers.current
    const slot = pool.find((l) => !l.alive)
    if (!slot) return

    fwd.set(0, 0, -1).applyQuaternion(ship.quaternion).normalize()
    right.set(1, 0, 0).applyQuaternion(ship.quaternion).normalize()

    const side = fireSide.current % 2 === 0 ? -1 : 1
    fireSide.current++

    const aim = reticleAim(ship)
    muzzle
      .copy(ship.position)
      .addScaledVector(fwd, GUN_FWD)
      .addScaledVector(right, side * GUN_SIDE)
      .addScaledVector(fwd, 0.1)
    aimDir.copy(aim).sub(muzzle)
    if (aimDir.lengthSq() < 1e-6) aimDir.copy(fwd)
    aimDir.normalize()

    slot.x = muzzle.x
    slot.y = muzzle.y
    slot.z = muzzle.z
    slot.dx = aimDir.x
    slot.dy = aimDir.y
    slot.dz = aimDir.z
    slot.life = 1.6
    slot.alive = true
  }

  const spawnExplosion = (x: number, y: number, z: number, scale: number) => {
    const slot = explosions.current.find((e) => !e.alive)
    if (!slot) return
    slot.x = x
    slot.y = y
    slot.z = z
    slot.scale = scale
    slot.life = EXPLOSION_LIFE
    slot.alive = true
    slot.debris = seedDebris(scale)
    slot.sparks = seedSparks()
  }

  const fracture = (parent: Asteroid) => {
    const childTier = parent.tier === 'large' ? 'medium' : parent.tier === 'medium' ? 'small' : null
    const count = parent.tier === 'large' ? 3 : 2
    // Copy before reusing the parent's pool slot; the field always stays bounded.
    const source = { ...parent }
    parent.alive = false
    if (!childTier) return
    const childR = ASTEROID_TIERS[childTier].r
    for (let i = 0; i < count; i++) {
      // Keep room for the whole split, even if an unusually dense chain fills the pool.
      const slot = asteroids.current.find((a) => !a.alive) ?? asteroids.current
        .filter((a) => a.birth === 0)
        .reduce<Asteroid | undefined>((furthest, a) => !furthest ||
          Math.hypot(a.x - source.x, a.y - source.y, a.z - source.z) > Math.hypot(furthest.x - source.x, furthest.y - source.y, furthest.z - source.z) ? a : furthest, undefined)
      if (!slot) break
      const a = i * Math.PI * 2 / count + source.phase
      const nx = Math.cos(a)
      const ny = Math.sin(a)
      const spread = childR * 1.2
      Object.assign(slot, {
        x: source.x + nx * spread, y: source.y + ny * spread, z: source.z,
        r: childR, tier: childTier, spin: (i % 2 ? -1 : 1) * 0.7, phase: source.phase + i,
        vx: source.vx + nx * 3.2, vy: source.vy + ny * 3.2, vz: source.vz + (i - (count - 1) / 2) * 0.8,
        variant: (source.variant + i + 1) % 3, birth: 0.06, alive: true,
      })
    }
  }

  useFrame((_, delta) => {
    const ship = shipRef.current
    const inBelt = isVoid && playing && ship && !voidWarp
    for (const mesh of astMeshes.current) if (mesh) mesh.visible = Boolean(inBelt)
    if (laserMesh.current) laserMesh.current.visible = Boolean(inBelt)
    if (flashMesh.current) flashMesh.current.visible = Boolean(inBelt)
    if (debrisMesh.current) debrisMesh.current.visible = Boolean(inBelt)
    if (sparkMesh.current) sparkMesh.current.visible = Boolean(inBelt)

    // Dense belt the moment warp drops — not during transit.
    if ((!isVoid || voidWarp) && beltSeeded.current) {
      for (const a of asteroids.current) a.alive = false
      for (const l of lasers.current) l.alive = false
      fireCooldown.current = 0
      spawnAcc.current = 0
      beltSeeded.current = false
    }
    if (inBelt && !beltSeeded.current && ship) {
      seedBelt(ship)
      beltSeeded.current = true
    }

    if (!inBelt || !ship) {
      if (!inBelt) {
        for (const e of explosions.current) e.alive = false
      }
      return
    }

    const d = practice?.paused ? 0 : practice?.coarseStep ? 0.05 : Math.min(delta, 0.05)
    if (!practice) spawnAcc.current += d
    while (spawnAcc.current >= SPAWN_INTERVAL) {
      spawnAcc.current -= SPAWN_INTERVAL
      for (let n = 0; n < SPAWN_BURST; n++) spawnAsteroid(ship)
    }

    const keys = getKeys()
    const firing = keys.fire || useInput.getState().fire
    fireCooldown.current = Math.max(0, fireCooldown.current - d)
    if ((firing && fireCooldown.current === 0) || (practice && practice.shot !== testShot.current)) {
      fireLaser(ship)
      fireCooldown.current = FIRE_INTERVAL
      testShot.current = practice?.shot ?? 0
    }
    if (!firing && !practice) fireCooldown.current = 0

    for (const a of asteroids.current) {
      if (!a.alive) continue
      a.x += a.vx * d
      a.y += a.vy * d
      a.z += a.vz * d
      a.birth = Math.max(0, a.birth - d)
      a.phase += a.spin * d

      const dx = a.x - ship.position.x
      const dy = a.y - ship.position.y
      const dz = a.z - ship.position.z
      if (Math.hypot(dx, dy, dz) > SPAWN_RADIUS * 1.6) a.alive = false
    }

    for (const l of lasers.current) {
      if (!l.alive) continue
      const sx = l.x, sy = l.y, sz = l.z
      const step = LASER_SPEED * d
      l.x += l.dx * step
      l.y += l.dy * step
      l.z += l.dz * step
      l.life -= d
      // Swept relative-motion test: fast shots cannot tunnel through small rocks.
      let victim: Asteroid | null = null
      let first = Infinity
      for (const a of asteroids.current) {
        if (!a.alive || a.birth > 0) continue
        const dx = l.dx * step - a.vx * d
        const dy = l.dy * step - a.vy * d
        const dz = l.dz * step - a.vz * d
        const ox = sx - (a.x - a.vx * d), oy = sy - (a.y - a.vy * d), oz = sz - (a.z - a.vz * d)
        const aa = dx * dx + dy * dy + dz * dz
        const bb = 2 * (ox * dx + oy * dy + oz * dz)
        const cc = ox * ox + oy * oy + oz * oz - (a.r + HIT_RADIUS) ** 2
        const disc = bb * bb - 4 * aa * cc
        if (aa < 1e-10 || disc < 0) continue
        const entry = cc <= 0 ? 0 : (-bb - Math.sqrt(disc)) / (2 * aa)
        if (entry >= 0 && entry <= 1 && entry < first) { first = entry; victim = a }
      }
      if (victim) {
        spawnExplosion(victim.x, victim.y, victim.z, victim.r)
        useGame.getState().addVoidScore(VOID_ASTEROID_SCORES[victim.tier])
        hits.current++
        fracture(victim)
        if (practice) { reportedAt.current = 0.13; practice.onImpact?.() }
        l.alive = false
      } else if (l.life <= 0) l.alive = false
    }
    if (practice) {
      reportedAt.current += d
      if (reportedAt.current > 0.12) {
        reportedAt.current = 0
        const stats = { large: 0, medium: 0, small: 0, hits: hits.current }
        for (const a of asteroids.current) if (a.alive) stats[a.tier]++
        practice.onStats(stats)
      }
    }

    for (const e of explosions.current) {
      if (!e.alive) continue
      e.life -= d
      if (e.life <= 0) e.alive = false
    }

    const flashOpacity = flashMat.current
    if (flashMesh.current) {
      let i = 0
      for (const e of explosions.current) {
        if (!e.alive) continue
        const t = e.life / EXPLOSION_LIFE
        const age = EXPLOSION_LIFE - e.life
        const flashScale = e.scale * Math.max(0, 1 - age / 0.16) * 0.35
        if (t <= 0 || flashScale === 0) continue
        dummy.position.set(e.x, e.y, e.z)
        dummy.rotation.set(0, 0, 0)
        dummy.scale.set(flashScale, flashScale, flashScale)
        dummy.updateMatrix()
        flashMesh.current.setMatrixAt(i++, dummy.matrix)
      }
      flashMesh.current.count = i
      flashMesh.current.instanceMatrix.needsUpdate = true
      if (flashOpacity) flashOpacity.opacity = i > 0 ? 0.92 : 0
    }

    if (debrisMesh.current) {
      let i = 0
      for (const e of explosions.current) {
        if (!e.alive) continue
        const age = 1 - e.life / EXPLOSION_LIFE
        const elapsed = age * EXPLOSION_LIFE
        const fade = Math.max(0, 1 - age * 0.72)
        for (const chunk of e.debris) {
          dummy.position.set(
            e.x + chunk.vx * elapsed * 0.52,
            e.y + chunk.vy * elapsed * 0.52,
            e.z + chunk.vz * elapsed * 0.52,
          )
          dummy.rotation.set(
            chunk.rx + chunk.spinX * elapsed,
            chunk.ry + chunk.spinY * elapsed,
            chunk.rz + chunk.spinZ * elapsed,
          )
          const s = chunk.size * fade
          dummy.scale.set(s * chunk.sx, s * chunk.sy, s * chunk.sz)
          dummy.updateMatrix()
          debrisMesh.current.setMatrixAt(i++, dummy.matrix)
        }
      }
      debrisMesh.current.count = i
      debrisMesh.current.instanceMatrix.needsUpdate = true
    }

    if (sparkMesh.current) {
      let i = 0
      for (const e of explosions.current) {
        if (!e.alive) continue
        const age = 1 - e.life / EXPLOSION_LIFE
        const elapsed = age * EXPLOSION_LIFE
        const fade = Math.max(0, 1 - age * 1.05)
        for (const spark of e.sparks) {
          const px = e.x + spark.vx * elapsed * 0.38
          const py = e.y + spark.vy * elapsed * 0.38
          const pz = e.z + spark.vz * elapsed * 0.38
          dummy.position.set(px, py, pz)
          dummy.lookAt(px + spark.vx, py + spark.vy, pz + spark.vz)
          const len = 0.1 + fade * 0.72 * e.scale
          dummy.scale.set(0.035, 0.035, len)
          dummy.updateMatrix()
          sparkMesh.current.setMatrixAt(i++, dummy.matrix)
        }
      }
      sparkMesh.current.count = i
      sparkMesh.current.instanceMatrix.needsUpdate = true
    }

    for (let variant = 0; variant < rockGeometries.length; variant++) {
      const mesh = astMeshes.current[variant]
      if (!mesh) continue
      let i = 0
      for (const a of asteroids.current) {
        if (!a.alive || a.variant !== variant) continue
        dummy.position.set(a.x, a.y, a.z)
        dummy.rotation.set(a.phase * 0.7, a.phase, a.phase * 1.3)
        dummy.scale.setScalar(a.r)
        dummy.updateMatrix()
        mesh.setMatrixAt(i++, dummy.matrix)
      }
      mesh.count = i
      mesh.instanceMatrix.needsUpdate = true
    }

    if (laserMesh.current) {
      let i = 0
      for (const l of lasers.current) {
        if (!l.alive) continue
        dummy.position.set(l.x, l.y, l.z)
        dummy.lookAt(l.x + l.dx, l.y + l.dy, l.z + l.dz)
        dummy.scale.set(0.08, 0.08, 2.4)
        dummy.updateMatrix()
        laserMesh.current.setMatrixAt(i++, dummy.matrix)
      }
      laserMesh.current.count = i
      laserMesh.current.instanceMatrix.needsUpdate = true
    }
  })

  if (!isVoid) return null

  return (
    <group>
      {rockGeometries.map((geometry, i) => (
        <instancedMesh key={i} ref={(mesh) => { astMeshes.current[i] = mesh }} args={[geometry, undefined, MAX_ASTEROIDS]} frustumCulled={false}>
          <meshStandardMaterial vertexColors metalness={0.06} roughness={0.96} flatShading />
        </instancedMesh>
      ))}
      <instancedMesh ref={laserMesh} args={[undefined, undefined, MAX_LASERS]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#7df9ff" toneMapped={false} />
      </instancedMesh>
      <instancedMesh ref={flashMesh} args={[undefined, undefined, MAX_EXPLOSIONS]} frustumCulled={false}>
        <sphereGeometry args={[1, 10, 10]} />
        <meshBasicMaterial
          ref={flashMat}
          color="#7df9ff"
          transparent
          opacity={0}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          fog={false}
        />
      </instancedMesh>
      <instancedMesh
        ref={debrisMesh}
        args={[undefined, undefined, MAX_EXPLOSIONS * DEBRIS_PER]}
        frustumCulled={false}
      >
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial
          color="#6a5848"
          emissive="#ff6622"
          emissiveIntensity={0.22}
          metalness={0.28}
          roughness={0.86}
          flatShading
        />
      </instancedMesh>
      <instancedMesh
        ref={sparkMesh}
        args={[undefined, undefined, MAX_EXPLOSIONS * SPARKS_PER]}
        frustumCulled={false}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial
          color="#d4ffff"
          transparent
          opacity={0.88}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          fog={false}
        />
      </instancedMesh>
    </group>
  )
}
