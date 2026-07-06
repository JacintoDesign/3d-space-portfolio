import { useMemo, useRef, type RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useKeyboardControls } from '@react-three/drei'
import * as THREE from 'three'
import type { Controls } from '../ship/keyboardMap'
import { useGame, VOID_ASTEROID_SCORES, type AsteroidSizeTier } from '../store/useGame'
import { useInput } from '../store/useInput'

const MAX_ASTEROIDS = 120
const MAX_LASERS = 24
const MAX_EXPLOSIONS = 20
const DEBRIS_PER = 18
const SPARKS_PER = 14
const EXPLOSION_LIFE = 1.35
const ASTEROID_SPEED = 7
const LASER_SPEED = 140
const SPAWN_INTERVAL = 0.38
const SPAWN_BURST = 3
const SPAWN_RADIUS = 95
const HIT_RADIUS = 2.8
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

export function VoidCombat({ shipRef }: { shipRef: RefObject<THREE.Group | null> }) {
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
      alive: false,
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
  const astMesh = useRef<THREE.InstancedMesh>(null)
  const laserMesh = useRef<THREE.InstancedMesh>(null)
  const flashMesh = useRef<THREE.InstancedMesh>(null)
  const debrisMesh = useRef<THREE.InstancedMesh>(null)
  const sparkMesh = useRef<THREE.InstancedMesh>(null)
  const flashMat = useRef<THREE.MeshBasicMaterial>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const spawnAcc = useRef(0)
  const fireLatch = useRef(false)
  const fireSide = useRef(0)
  const prevVoidWarp = useRef(true)
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
    slot.alive = true
  }

  const seedBelt = (ship: THREE.Group) => {
    for (let i = 0; i < BELT_SEED; i++) spawnAsteroid(ship)
  }

  const reticleAim = (ship: THREE.Group) => {
    raycaster.setFromCamera(ndcCenter, camera)
    aimPoint.copy(raycaster.ray.origin).addScaledVector(raycaster.ray.direction, AIM_DIST)
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

  useFrame((_, delta) => {
    const ship = shipRef.current
    const inBelt = isVoid && playing && ship && !voidWarp
    if (astMesh.current) astMesh.current.visible = Boolean(inBelt)
    if (laserMesh.current) laserMesh.current.visible = Boolean(inBelt)
    if (flashMesh.current) flashMesh.current.visible = Boolean(inBelt)
    if (debrisMesh.current) debrisMesh.current.visible = Boolean(inBelt)
    if (sparkMesh.current) sparkMesh.current.visible = Boolean(inBelt)

    // Dense belt the moment warp drops — not during transit.
    if (inBelt && prevVoidWarp.current && ship) seedBelt(ship)
    prevVoidWarp.current = voidWarp

    if (!inBelt || !ship) {
      if (!inBelt) {
        for (const e of explosions.current) e.alive = false
      }
      return
    }

    const d = Math.min(delta, 0.05)
    spawnAcc.current += d
    while (spawnAcc.current >= SPAWN_INTERVAL) {
      spawnAcc.current -= SPAWN_INTERVAL
      for (let n = 0; n < SPAWN_BURST; n++) spawnAsteroid(ship)
    }

    const keys = getKeys()
    const firing = keys.fire || useInput.getState().fire
    if (firing && !fireLatch.current) {
      fireLaser(ship)
      fireLatch.current = true
    }
    if (!firing) fireLatch.current = false

    fwd.set(0, 0, -1).applyQuaternion(ship.quaternion).normalize()
    const drift = fwd.clone().multiplyScalar(-ASTEROID_SPEED * d)

    for (const a of asteroids.current) {
      if (!a.alive) continue
      a.x += drift.x
      a.y += drift.y
      a.z += drift.z
      a.phase += a.spin * d

      const dx = a.x - ship.position.x
      const dy = a.y - ship.position.y
      const dz = a.z - ship.position.z
      if (Math.hypot(dx, dy, dz) > SPAWN_RADIUS * 1.6) a.alive = false
    }

    for (const l of lasers.current) {
      if (!l.alive) continue
      l.x += l.dx * LASER_SPEED * d
      l.y += l.dy * LASER_SPEED * d
      l.z += l.dz * LASER_SPEED * d
      l.life -= d
      if (l.life <= 0) l.alive = false
    }

    for (const l of lasers.current) {
      if (!l.alive) continue
      for (const a of asteroids.current) {
        if (!a.alive) continue
        const dx = l.x - a.x
        const dy = l.y - a.y
        const dz = l.z - a.z
        if (dx * dx + dy * dy + dz * dz < (a.r + HIT_RADIUS) ** 2) {
          spawnExplosion(a.x, a.y, a.z, a.r)
          useGame.getState().addVoidScore(VOID_ASTEROID_SCORES[a.tier])
          a.alive = false
          l.alive = false
          break
        }
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
        const burst = 1 - (1 - t) ** 2
        const flashScale = e.scale * (0.35 + burst * 2.4)
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

    if (astMesh.current) {
      let i = 0
      for (const a of asteroids.current) {
        if (!a.alive) continue
        dummy.position.set(a.x, a.y, a.z)
        dummy.rotation.set(a.phase * 0.7, a.phase, a.phase * 1.3)
        const s = a.r
        dummy.scale.set(s, s * (0.82 + (a.phase % 1) * 0.2), s * 0.9)
        dummy.updateMatrix()
        astMesh.current.setMatrixAt(i++, dummy.matrix)
      }
      astMesh.current.count = i
      astMesh.current.instanceMatrix.needsUpdate = true
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
      <instancedMesh ref={astMesh} args={[undefined, undefined, MAX_ASTEROIDS]} frustumCulled={false}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#4a4038" metalness={0.35} roughness={0.82} flatShading />
      </instancedMesh>
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
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial
          color="#6a5848"
          emissive="#ff6622"
          emissiveIntensity={0.72}
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
