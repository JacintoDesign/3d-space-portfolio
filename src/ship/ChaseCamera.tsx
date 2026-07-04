import { useEffect, useRef, type RefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useShip } from '../store/useShip'
import { useGame } from '../store/useGame'
import { landmarkById } from '../data/world'
import { cameraDrag } from './cameraDrag'

const DIST = 9
const HEIGHT = 3
const LOOK_AHEAD = 10
const BASE_FOV = 60
const BOOST_FOV = 70

// Drag-to-orbit (desktop "mouse is for the camera"): press + drag on the canvas
// to swing the chase camera around the ship; it eases back behind on release.
const ORBIT_SENS = 0.006 // rad per px dragged
const ORBIT_PITCH_MIN = -0.5
const ORBIT_PITCH_MAX = 1.15
const ORBIT_RETURN = 1.8 // how fast the view eases back behind the ship
const DRAG_THRESHOLD = 6 // px before a press is a camera drag, not a station click

// Cinematic orbit (About/Contact): a slow turntable around the ship so it reads
// from many angles — level, side, high near-top-down — while it warps along.
const CINE_DIST = 6.4
const CINE_FOV = 74
const ORBIT_SPEED = 0.24 // rad/s azimuth (~26s per loop)
// Keep the camera ABOVE the ship (el stays positive) and short of straight-down
// so screen-right — cross(camFwd, worldUp) — never degenerates or flips, which
// would swing the pinned ship to the wrong side of frame. Range ≈ 3°…56°.
const ELEV_BASE = 0.52 // baseline camera elevation (rad)
const ELEV_AMP = 0.46 // swing up toward a high, near-top-down angle
const ELEV_SPEED = 0.16 // rad/s elevation oscillation
// Pin the ship to a fixed horizontal screen position (NDC x) so it sits centred
// in the text-free half and never drifts under the copy — About text is on the
// left → ship pinned right (+), Contact form is on the right → ship left (−).
const CINE_NDC_X = 0.46

// Parked (autopilot hover): frame the docked station dead-centre with the ship
// tucked into the lower-foreground so the station you flew to fills the view.
const PARK_BACK = 9
const PARK_UP = 3.4
const PARK_SIDE = 4.6

// Intro fly-in on first launch: the camera starts high + far and eases to the
// chase pose (skipped under reduced-motion).
const INTRO_DUR = 2.4
const HERO_BACK = 26
const HERO_UP = 15
const HERO_FOV = 84
// Reduced-motion: hold the cinematic camera at a fixed, flattering 3/4 angle
// instead of the auto-orbit.
const RM_AZ = 0.7
const RM_EL = 0.5

const back = new THREE.Vector3()
const up = new THREE.Vector3()
const fwd = new THREE.Vector3()
const desired = new THREE.Vector3()
const look = new THREE.Vector3()
const axis = new THREE.Vector3()
const side = new THREE.Vector3()
const camFwd = new THREE.Vector3()
const stationPos = new THREE.Vector3()
const heroVec = new THREE.Vector3()
const qTmp = new THREE.Quaternion()
const WORLD_UP = new THREE.Vector3(0, 1, 0)

export function ChaseCamera({ targetRef }: { targetRef: RefObject<THREE.Group | null> }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const gl = useThree((s) => s.gl)
  const fov = useRef(BASE_FOV)
  const dist = useRef(DIST)
  const height = useRef(HEIGHT)
  const time = useRef(0)
  const curLook = useRef(new THREE.Vector3())
  const inited = useRef(false)
  const orbitYaw = useRef(0)
  const orbitPitch = useRef(0)
  const dragging = useRef(false)
  const prevMode = useRef('loading')
  const introUntil = useRef(0)
  const pendingSnap = useRef(false)

  // Drag-to-orbit the camera. A press that never moves past the threshold stays
  // a click (station travel); a drag past it orbits and suppresses that click.
  useEffect(() => {
    const el = gl.domElement
    let active = false
    let downX = 0
    let downY = 0
    let lastX = 0
    let lastY = 0
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 || useGame.getState().mode !== 'play') return
      active = true
      dragging.current = false
      cameraDrag.moved = false
      downX = lastX = e.clientX
      downY = lastY = e.clientY
    }
    const onMove = (e: PointerEvent) => {
      if (!active) return
      const dx = e.clientX - lastX
      const dy = e.clientY - lastY
      lastX = e.clientX
      lastY = e.clientY
      if (!dragging.current && Math.hypot(e.clientX - downX, e.clientY - downY) > DRAG_THRESHOLD) {
        dragging.current = true
        cameraDrag.moved = true
      }
      if (dragging.current) {
        orbitYaw.current += dx * ORBIT_SENS
        orbitPitch.current = THREE.MathUtils.clamp(
          orbitPitch.current + dy * ORBIT_SENS,
          ORBIT_PITCH_MIN,
          ORBIT_PITCH_MAX,
        )
      }
    }
    const onUp = () => {
      active = false
      dragging.current = false
    }
    el.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      el.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [gl])

  useFrame((_, dRaw) => {
    const ship = targetRef.current
    if (!ship) return
    if (import.meta.env.DEV) (window as unknown as { __cam: THREE.Camera }).__cam = camera
    const delta = Math.min(dRaw, 0.05)
    time.current += delta
    const g = useGame.getState()
    const m = g.mode
    const reduced = g.reducedMotion
    const cinematic = m === 'about' || m === 'contact'
    const parkedLm = m === 'play' && g.parked ? landmarkById(g.parked) : null

    // Kick off the one-time intro fly-in the frame we leave the loader.
    if (prevMode.current === 'loading' && m === 'play' && !reduced) {
      introUntil.current = time.current + INTRO_DUR
      pendingSnap.current = true
    }
    prevMode.current = m
    const introE =
      time.current < introUntil.current && m === 'play'
        ? ((introUntil.current - time.current) / INTRO_DUR) ** 2 // ease-out, 1→0
        : 0

    const q = ship.quaternion
    back.set(0, 0, 1).applyQuaternion(q)
    up.set(0, 1, 0).applyQuaternion(q)
    fwd.set(0, 0, -1).applyQuaternion(q)

    // --- desired camera position ---
    if (cinematic) {
      // Slow turntable around the ship — or, under reduced-motion, a fixed 3/4.
      const az = reduced ? RM_AZ : time.current * ORBIT_SPEED
      const el = reduced ? RM_EL : ELEV_BASE + Math.sin(time.current * ELEV_SPEED) * ELEV_AMP
      const ce = Math.cos(el)
      desired
        .set(Math.sin(az) * ce, Math.sin(el), Math.cos(az) * ce)
        .multiplyScalar(CINE_DIST)
        .add(ship.position)
    } else if (parkedLm) {
      // Frame the docked station dead-centre, ship in the lower-foreground.
      stationPos.set(...parkedLm.position)
      axis.copy(stationPos).sub(ship.position)
      if (axis.lengthSq() < 1e-4) axis.copy(fwd)
      axis.normalize()
      side.crossVectors(axis, WORLD_UP)
      if (side.lengthSq() < 1e-4) side.set(1, 0, 0)
      side.normalize()
      desired
        .copy(ship.position)
        .addScaledVector(axis, -PARK_BACK)
        .addScaledVector(WORLD_UP, PARK_UP)
        .addScaledVector(side, PARK_SIDE)
    } else {
      const ke = 1 - Math.exp(-3 * delta)
      dist.current += (DIST - dist.current) * ke
      height.current += (HEIGHT - height.current) * ke
      // Ease the mouse-orbit back behind the ship when not dragging.
      if (!dragging.current) {
        const d = Math.exp(-ORBIT_RETURN * delta)
        orbitYaw.current *= d
        orbitPitch.current *= d
      }
      // Base chase offset (behind + above), then swing it by the mouse-orbit.
      desired.set(0, 0, 0).addScaledVector(back, dist.current).addScaledVector(up, height.current)
      qTmp.setFromAxisAngle(WORLD_UP, orbitYaw.current)
      desired.applyQuaternion(qTmp)
      side.crossVectors(desired, WORLD_UP)
      if (side.lengthSq() > 1e-6) {
        side.normalize()
        qTmp.setFromAxisAngle(side, orbitPitch.current)
        desired.applyQuaternion(qTmp)
      }
      desired.add(ship.position)
    }

    // Intro fly-in: ease the chase pose out from a high, far hero shot.
    if (introE > 0 && !cinematic && !parkedLm) {
      heroVec.copy(ship.position).addScaledVector(back, HERO_BACK).addScaledVector(up, HERO_UP)
      if (pendingSnap.current) {
        camera.position.copy(heroVec)
        pendingSnap.current = false
      }
      desired.lerp(heroVec, introE)
    }

    const posRate = cinematic ? 8 : parkedLm ? 4.5 : 6
    camera.position.lerp(desired, 1 - Math.exp(-posRate * delta))

    // --- look target ---
    if (cinematic) {
      // Aim just off the ship so it lands at a fixed screen x. Computed from the
      // ACTUAL camera position (post-lerp) so the pin holds regardless of the
      // ship's warp motion or camera lag — it stays put while the orbit spins
      // it through different faces.
      camFwd.copy(ship.position).sub(camera.position)
      const distShip = camFwd.length() || 1
      camFwd.normalize()
      side.crossVectors(camFwd, WORLD_UP)
      if (side.lengthSq() < 1e-4) side.set(1, 0, 0)
      side.normalize()
      const tanX = Math.tan(((fov.current * Math.PI) / 180) / 2) * camera.aspect
      const shipSide = m === 'about' ? 1 : -1
      look.copy(ship.position).addScaledVector(side, -shipSide * CINE_NDC_X * distShip * tanX)
    } else if (parkedLm) {
      look.copy(stationPos)
    } else {
      // Look ahead of the ship normally, but pull the aim back toward the ship
      // as the mouse-orbit swings out so it stays framed from any angle.
      const orbitMag = Math.min(1, (Math.abs(orbitYaw.current) + Math.abs(orbitPitch.current)) / 1.2)
      look
        .copy(ship.position)
        .addScaledVector(fwd, LOOK_AHEAD * (1 - 0.75 * orbitMag))
        .addScaledVector(up, 0.5)
    }

    // Eased look target for smooth mode transitions. The cinematic pins exactly
    // (no lerp) so the ship holds its screen spot while the orbit spins it; the
    // mode cut is already covered by the warp flash + ship reposition.
    if (!inited.current || cinematic) {
      curLook.current.copy(look)
      inited.current = true
    } else {
      curLook.current.lerp(look, 1 - Math.exp(-6 * delta))
    }
    camera.lookAt(curLook.current)

    // FOV breathes on boost; goes wide for the cinematics + the intro reveal.
    const baseFov = cinematic ? CINE_FOV : useShip.getState().boosting ? BOOST_FOV : BASE_FOV
    const targetFov = baseFov + (HERO_FOV - baseFov) * introE
    fov.current += (targetFov - fov.current) * (1 - Math.exp(-5 * delta))
    if (Math.abs(camera.fov - fov.current) > 0.01) {
      camera.fov = fov.current
      camera.updateProjectionMatrix()
    }
  })

  return null
}
