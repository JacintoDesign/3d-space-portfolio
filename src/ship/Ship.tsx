import { useEffect, useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { useKeyboardControls } from '@react-three/drei'
import * as THREE from 'three'
import { ShipModel, type ShipMotion } from './ShipModel'
import type { Controls } from './keyboardMap'
import { useGame } from '../store/useGame'
import { useInput } from '../store/useInput'
import { useShip } from '../store/useShip'
import { setEngine } from '../audio/ambience'
import { LANDMARKS, WORLD, landmarkById } from '../data/world'

const CRUISE = 16
const BOOST = 32
const STOP = 0.4
const ACCEL_LERP = 2.4
// No idle thrust: the ship coasts to a stop unless you hold thrust (W / mobile
// THRUST). Hold to cruise, Shift / BOOST to boost. The void is a fast corridor
// when you do thrust through it.
const VOID_CRUISE = 26
// About/Contact cinematic: the ship only drifts gently (so the orbit camera can
// hold a rock-steady frame + the auto-return home is short) while warp streaks
// are forced on for the speed read.
const CINE_SPEED = 10
// Leaving the void for a project teleports the ship to the gateway approach and
// runs this express warp so the punch-through + hop to the station is < ~3s.
const EXPRESS = 66
// Minimum approach speed for a manual fly-in to auto-dock (a slow coast never docks).
const DOCK_MIN_SPEED = 1.6

const YAW_RATE = 1.25 // rad/s at full deflection
const PITCH_RATE = 0.95
const MAX_BANK = 0.62
const AUTO_LEVEL = 0.9

// Autopilot shaping: steering gains + arrival distance (fraction of dock range).
const AP_YAW_GAIN = 3
const AP_PITCH_GAIN = 2.6
const AP_ARRIVE = 0.6
// Manual-input thresholds that hand the stick back from the autopilot.
const AP_CANCEL_STEER = 0.45

/** Sentinel autopilot id: fly to (and through) the gateway portal. */
export const AP_GATEWAY = 'gateway'
// Crossing this fraction of the bounds radius engages an autopilot back to the
// nearest unvisited station — aggressive on purpose, so the edge always points
// you at something worth seeing rather than empty sky.
const PERIMETER_ENGAGE = 0.85

// Portal transit: crossing the gateway plane inside this fraction of its radius
// swaps zones and slams the throttle to warp for a moment.
const PORTAL_OPENING = 0.8
const TRANSIT_WARP_S = 1.8

// Auto-dock: within range, aim your nose within this dot of a station and it
// docks itself; drifting closer than the near fraction docks regardless of aim.
const DOCK_AIM = 0.55
const DOCK_NEAR = 0.4

const SHIP_CLEAR = 1.6
const TELEMETRY_DT = 0.08

// Scratch (avoid per-frame allocation).
const forward = new THREE.Vector3()
const right = new THREE.Vector3()
const qTmp = new THREE.Quaternion()
const boundsCenter = new THREE.Vector3(...WORLD.bounds.center)
// The void has its own play-volume, centred beyond the portal so drifting never
// yanks you back through it — the gateway (z≈-150) sits just inside the near rim.
const VOID_CENTER = new THREE.Vector3(0, 0, -310)
const VOID_RADIUS = 165
// Where the ship jumps to when an About/Contact warp cinematic begins — deep in
// the void, clear of the gateway ring, so the auto-return home is a short hop.
const VOID_ANCHOR = new THREE.Vector3(0, 0, -270)
// How far void-side of the gate to drop the ship for an express run — lined up
// on the gate→target line so a straight punch-through threads the ring.
const GATE_APPROACH_DIST = 14
const toCenter = new THREE.Vector3()
const push = new THREE.Vector3()
const apDir = new THREE.Vector3()
const WORLD_UP = new THREE.Vector3(0, 1, 0)

export function Ship({ groupRef }: { groupRef: RefObject<THREE.Group | null> }) {
  const motion = useRef<ShipMotion>({ speed: 0, throttle: 0, boost: false, bank: 0 })
  const [, getKeys] = useKeyboardControls<Controls>()

  const speed = useRef(0)
  const telAcc = useRef(0)
  const time = useRef(0)
  const dockLatch = useRef<string | null>(null) // station just closed; blocks re-dock until out of range
  const hover = useRef(false) // parked by the autopilot in front of a station; any input releases
  const parkedLm = useRef<string | null>(null) // which station we're hover-parked at (framing camera)
  const warpUntil = useRef(0) // portal transit: forced-warp window end (sim time)
  const prevPortalDz = useRef<number | null>(null) // signed distance to the portal plane last frame
  const wasCinematic = useRef(false) // was in an About/Contact warp cinematic last frame
  const apRouted = useRef<string | null>(null) // station id we've express-teleported to the gate for

  useFrame((_, dRaw) => {
    const group = groupRef.current
    if (!group) return
    const delta = Math.min(dRaw, 0.05) // clamp big frame gaps
    time.current += delta
    const game = useGame.getState()
    const playing = game.mode === 'play'
    const cinematic = game.mode === 'about' || game.mode === 'contact' // warp-speed overlay views
    const flying = playing || cinematic
    const inNebula = game.zone === 'nebula'
    const mobile = game.isMobile
    const input = useInput.getState()
    const keys = getKeys()

    // Hover only lives while flying free; leaving play (overlay/cinematic) drops it.
    if (!playing) hover.current = false

    // --- entering an About/Contact cinematic: warp out to the void. The store
    //     already flipped zone→void + fired the flash; jump the ship to the
    //     anchor so it warps against deep space, not the nebula it was in. ---
    if (cinematic && !wasCinematic.current) {
      group.position.copy(VOID_ANCHOR)
      group.quaternion.identity() // faces -Z, deeper into the void
      prevPortalDz.current = null
      hover.current = false
    }
    wasCinematic.current = cinematic

    // --- gather manual steering intent. Desktop steers with the keyboard only
    //     (the mouse is for the camera + clicking stations); mobile uses the
    //     on-screen d-pad. ---
    let sx = 0
    let sy = 0
    if (playing) {
      if (mobile) {
        sx = input.steerX
        sy = input.steerY
      }
      if (keys.yawLeft) sx -= 1
      if (keys.yawRight) sx += 1
      if (keys.pitchUp) sy -= 1
      if (keys.pitchDown) sy += 1
    } else if (cinematic) {
      // A slow banking arc through the void so the ship stays near its warp
      // anchor (short auto-return home) while the copy plays and streaks stream.
      sx = 0.35 + Math.sin(time.current * 0.5) * 0.1
      sy = Math.sin(time.current * 0.4 + 1.7) * 0.05
    }
    sx = THREE.MathUtils.clamp(sx, -1, 1)
    sy = THREE.MathUtils.clamp(sy, -1, 1)

    // --- hover: parked in front of a station by the autopilot. Any throttle
    //     key / mobile button hands back the engines. ---
    if (
      hover.current &&
      (keys.accelerate ||
        keys.brake ||
        keys.boost ||
        (mobile && (input.thrust || input.boost || input.brake)))
    ) {
      hover.current = false
    }

    // --- autopilot: deliberate input hands the stick back ---
    let apId = playing ? game.autopilot : null
    if (apId) hover.current = false
    if (apId) {
      const wantsManual =
        Math.abs(sx) > AP_CANCEL_STEER ||
        Math.abs(sy) > AP_CANCEL_STEER ||
        keys.accelerate ||
        keys.brake ||
        keys.boost ||
        (mobile && (input.thrust || input.boost || input.brake))
      if (wantsManual) {
        game.setAutopilot(null)
        apId = null
      }
    }

    // --- perimeter guard: hitting the edge autopilots you to the nearest
    //     unvisited station, so the boundary always aims you at content ---
    toCenter.copy(boundsCenter).sub(group.position)
    const centerDist = toCenter.length()
    if (playing && inNebula && !apId && centerDist > WORLD.bounds.radius * PERIMETER_ENGAGE) {
      let best: string | null = null
      let bestScore = Infinity
      for (const s of LANDMARKS) {
        const dx = s.position[0] - group.position.x
        const dy = s.position[1] - group.position.y
        const dz = s.position[2] - group.position.z
        // Unvisited stations win by a mile; among peers, nearest wins.
        const score = Math.sqrt(dx * dx + dy * dy + dz * dz) + (game.visited.includes(s.id) ? 1e5 : 0)
        if (score < bestScore) {
          bestScore = score
          best = s.id
        }
      }
      if (best) {
        game.setAutopilot(best)
        apId = best
      }
    }

    // --- gate express: engaging a station autopilot while out in the void
    //     teleports the ship to the gateway approach so the trip home is a quick
    //     punch-through, not a long haul across empty void (user: "teleport
    //     close to the gate, then go through to the project quickly"). ---
    if (apRouted.current && apRouted.current !== apId) apRouted.current = null
    if (playing && apId && apId !== AP_GATEWAY && !inNebula && apRouted.current !== apId) {
      const lm = landmarkById(apId)
      if (lm) {
        const gw = WORLD.gateway.position
        // Unit direction from the gate toward the target (points into the nebula).
        push.set(lm.position[0] - gw[0], lm.position[1] - gw[1], lm.position[2] - gw[2]).normalize()
        // Drop the ship just void-side of the gate on that line, facing the target
        // through the ring, so a straight run threads the portal and homes in.
        group.position.set(
          gw[0] - push.x * GATE_APPROACH_DIST,
          gw[1] - push.y * GATE_APPROACH_DIST,
          gw[2] - push.z * GATE_APPROACH_DIST,
        )
        forward.set(0, 0, -1)
        qTmp.setFromUnitVectors(forward, push)
        group.quaternion.copy(qTmp)
        speed.current = EXPRESS // start at warp — no spool-up before the gate
        prevPortalDz.current = null
        hover.current = false
        apRouted.current = apId
      }
    }

    // --- autopilot steering: fly at the target; park + prompt on arrival ---
    let apSpeed: number | null = null
    if (apId) {
      const isGate = apId === AP_GATEWAY
      const lm = isGate ? null : landmarkById(apId)
      if (!isGate && !lm) {
        game.setAutopilot(null)
      } else {
        // A station lives on the nebula side. If we're in the void, we can't fly
        // to it directly — steer through the gateway first; the portal-crossing
        // flips us back to the nebula, then we home in on the station.
        const routeViaGate = !isGate && !inNebula
        const steerTo = isGate || routeViaGate ? WORLD.gateway.position : lm!.position
        apDir.set(
          steerTo[0] - group.position.x,
          steerTo[1] - group.position.y,
          steerTo[2] - group.position.z,
        )
        const distToSteer = apDir.length()

        // Arrival applies only to the real goal — never the routing waypoint.
        let arrived = false
        if (isGate) arrived = distToSteer < WORLD.gateway.radius * 0.35
        else if (!routeViaGate) arrived = distToSteer - lm!.radius < WORLD.dockRange * AP_ARRIVE

        if (arrived) {
          game.setAutopilot(null)
          apRouted.current = null
          if (lm) {
            // Stations: park and let the dock prompt do the asking.
            hover.current = true
            parkedLm.current = lm.id
          } else {
            // Gateway: lined up — punch through the membrane at warp.
            warpUntil.current = time.current + 1.2
          }
        } else {
          apDir.normalize()
          forward.set(0, 0, -1).applyQuaternion(group.quaternion)
          const dotH = forward.x * apDir.x + forward.z * apDir.z
          const crossY = forward.z * apDir.x - forward.x * apDir.z
          // Target behind: commit to a full turn; otherwise steer proportionally.
          sx = dotH < 0 ? (crossY > 0 ? -1 : 1) : THREE.MathUtils.clamp(-crossY * AP_YAW_GAIN, -1, 1)
          sy = THREE.MathUtils.clamp((forward.y - apDir.y) * AP_PITCH_GAIN, -1, 1)
          const surf = distToSteer - (!isGate && !routeViaGate ? lm!.radius : 0)
          // Express run (teleported from the void): full EXPRESS to punch through
          // the gate (the void bounds fight the crossing), then ramp the speed
          // down with distance so a near station doesn't get overshot + orbited.
          apSpeed =
            apRouted.current === apId
              ? routeViaGate
                ? EXPRESS
                : THREE.MathUtils.clamp(surf * 1.7, 12, EXPRESS)
              : routeViaGate
                ? BOOST
                : surf > 90
                  ? BOOST
                  : surf > 34
                    ? CRUISE
                    : 9
        }
      }
    }

    // --- hover framing: hold the nose on the parked station (ignore the cursor)
    //     so it stays dead-centre in view while the dock prompt asks ---
    if (hover.current && !apId) {
      const lm = parkedLm.current ? landmarkById(parkedLm.current) : null
      if (lm) {
        apDir
          .set(
            lm.position[0] - group.position.x,
            lm.position[1] - group.position.y,
            lm.position[2] - group.position.z,
          )
          .normalize()
        forward.set(0, 0, -1).applyQuaternion(group.quaternion)
        const dotH = forward.x * apDir.x + forward.z * apDir.z
        const crossY = forward.z * apDir.x - forward.x * apDir.z
        sx = dotH < 0 ? (crossY > 0 ? -1 : 1) : THREE.MathUtils.clamp(-crossY * AP_YAW_GAIN, -1, 1)
        sy = THREE.MathUtils.clamp((forward.y - apDir.y) * AP_PITCH_GAIN, -1, 1)
      } else {
        sx = 0
        sy = 0
      }
    }

    // --- throttle: no thrust unless applied. Hold W / mobile THRUST to cruise,
    //     Shift / BOOST to boost, S / BRAKE to stop; release and the ship coasts
    //     to rest. The void cruises faster (warp corridor) when you do thrust. ---
    const boostK = playing && (keys.boost || input.boost)
    const braking = playing && (keys.brake || input.brake)
    const wantThrust = playing && (keys.accelerate || input.thrust)
    let targetSpeed: number
    if (cinematic) targetSpeed = CINE_SPEED
    else if (!playing) targetSpeed = 0
    else if (time.current < warpUntil.current) targetSpeed = BOOST // portal warp burst
    else if (hover.current) targetSpeed = 0
    else if (apSpeed !== null) targetSpeed = apSpeed
    else if (braking) targetSpeed = STOP
    else if (boostK) targetSpeed = BOOST
    else if (!wantThrust) targetSpeed = 0
    else targetSpeed = inNebula ? CRUISE : VOID_CRUISE
    speed.current += (targetSpeed - speed.current) * Math.min(1, delta * ACCEL_LERP)

    // --- orientation: yaw about WORLD up (stable horizon), pitch about local right ---
    if (sx !== 0) {
      qTmp.setFromAxisAngle(WORLD_UP, -sx * YAW_RATE * delta)
      group.quaternion.premultiply(qTmp)
    }
    right.set(1, 0, 0).applyQuaternion(group.quaternion).normalize()
    if (sy !== 0) {
      qTmp.setFromAxisAngle(right, -sy * PITCH_RATE * delta)
      group.quaternion.premultiply(qTmp)
    }
    // Auto-level pitch back toward the horizon when no pitch input (arcade feel).
    // Suppressed while hover-parked so the nose can hold on an off-level station.
    forward.set(0, 0, -1).applyQuaternion(group.quaternion)
    if (!hover.current && Math.abs(sy) < 0.05 && Math.abs(forward.y) > 0.001) {
      qTmp.setFromAxisAngle(right, forward.y * AUTO_LEVEL * delta)
      group.quaternion.premultiply(qTmp)
    }
    group.quaternion.normalize()

    // --- translate along the nose ---
    forward.set(0, 0, -1).applyQuaternion(group.quaternion)
    group.position.addScaledVector(forward, speed.current * delta)

    // --- portal transit: crossing the gateway plane inside the ring swaps
    //     zones (nebula ↔ void) and slams the throttle to warp for a beat.
    //     Only while free-flying — the cinematic circles the void without
    //     transiting, and the auto-return home crosses cleanly in play mode. ---
    if (playing) {
      const gw = WORLD.gateway.position
      const dzPortal = group.position.z - gw[2]
      const prev = prevPortalDz.current
      if (prev !== null && (dzPortal > 0) !== (prev > 0)) {
        const lat = Math.hypot(group.position.x - gw[0], group.position.y - gw[1])
        if (lat < WORLD.gateway.radius * PORTAL_OPENING) {
          warpUntil.current = time.current + TRANSIT_WARP_S
          hover.current = false
          // Keep a station-bound autopilot alive so it carries on to its target
          // on the far side; only a gateway-targeted run ends at the membrane.
          if (game.autopilot === AP_GATEWAY) game.setAutopilot(null)
          game.doTransit()
        }
      }
      prevPortalDz.current = dzPortal
    } else {
      prevPortalDz.current = null
    }

    // --- soft spherical bounds (per zone): ease back toward centre at the edge.
    //     Skipped during an express gate run — the void edge sits just short of
    //     the gate and would otherwise fight the punch-through to a standstill. ---
    if (!apRouted.current) {
      const bC = inNebula ? boundsCenter : VOID_CENTER
      const bR = inNebula ? WORLD.bounds.radius : VOID_RADIUS
      toCenter.copy(bC).sub(group.position)
      const dist = toCenter.length()
      const soft = bR * 0.9
      if (dist > soft) {
        toCenter.normalize()
        group.position.addScaledVector(toCenter, (dist - soft) * 1.8 * delta)
      }
    }

    // --- cheap station push-out so you can't fly through cores (nebula only) ---
    if (inNebula) {
      for (const s of LANDMARKS) {
        push.set(
          group.position.x - s.position[0],
          group.position.y - s.position[1],
          group.position.z - s.position[2],
        )
        const clear = s.radius + SHIP_CLEAR
        const d = push.length()
        if (d < clear && d > 1e-4) {
          push.multiplyScalar((clear - d) / d)
          group.position.add(push)
        }
      }
    }

    // --- nearest dockable station (stations only exist on the nebula side) ---
    let nearestId: string | null = null
    let nearestSurf = Infinity
    let nearestCenter = 0
    if (inNebula) {
      for (const s of LANDMARKS) {
        const dx = group.position.x - s.position[0]
        const dy = group.position.y - s.position[1]
        const dz = group.position.z - s.position[2]
        const centerD = Math.sqrt(dx * dx + dy * dy + dz * dz)
        const surf = centerD - s.radius
        if (surf < WORLD.dockRange && surf < nearestSurf) {
          nearestSurf = surf
          nearestId = s.id
          nearestCenter = centerD
        }
      }
    }
    if (playing) useGame.getState().setNearTarget(nearestId)

    // Publish the parked station so the chase camera can frame it dead-centre.
    const wantParked = playing && hover.current ? parkedLm.current : null
    if (game.parked !== wantParked) useGame.getState().setParked(wantParked)

    // --- auto-dock: aim at an in-range station (or fly right up to one) and
    //     it opens itself. Requires deliberate approach speed so a hands-off
    //     drift never re-docks you; a latch also stops the just-closed station
    //     from instantly re-docking until you leave its range. ---
    // Hovering (parked by the autopilot) never auto-docks — the prompt asks.
    const deliberate = speed.current > DOCK_MIN_SPEED && !hover.current
    if (dockLatch.current && dockLatch.current !== nearestId) dockLatch.current = null
    if (playing && !apId && deliberate && nearestId && nearestId !== dockLatch.current) {
      const lm = landmarkById(nearestId)
      if (lm) {
        apDir
          .set(
            lm.position[0] - group.position.x,
            lm.position[1] - group.position.y,
            lm.position[2] - group.position.z,
          )
          .normalize()
        forward.set(0, 0, -1).applyQuaternion(group.quaternion)
        const aim = forward.x * apDir.x + forward.y * apDir.y + forward.z * apDir.z
        if (aim > DOCK_AIM || nearestSurf < WORLD.dockRange * DOCK_NEAR) {
          dockLatch.current = nearestId
          game.openOverlay(nearestId)
        }
      }
    }

    // --- cosmetic + telemetry ---
    const norm = THREE.MathUtils.clamp(speed.current / BOOST, 0, 1)
    motion.current.speed = speed.current
    motion.current.throttle = norm
    // Cinematic forces the streaks on even though the ship only drifts gently.
    motion.current.boost = cinematic || speed.current > CRUISE * 1.05
    motion.current.bank = -sx * MAX_BANK

    telAcc.current += delta
    if (telAcc.current >= TELEMETRY_DT) {
      telAcc.current = 0
      useShip.getState().setTelemetry({
        throttle: norm,
        speed: speed.current,
        boosting: motion.current.boost,
        targetId: nearestId,
        targetDist: nearestId ? Math.max(0, nearestCenter) : 0,
        px: group.position.x,
        py: group.position.y,
        pz: group.position.z,
        heading: Math.atan2(forward.x, forward.z),
      })
      if (flying && !useGame.getState().muted) setEngine(norm)
    }
  })

  // Spawn pose: identity rotation already faces -Z (into the corridor).
  useEffect(() => {
    const g = groupRef.current
    if (g) g.position.set(...WORLD.spawn)
    if (import.meta.env.DEV && g) {
      ;(window as unknown as { __shipObj: THREE.Group }).__shipObj = g
    }
  }, [groupRef])

  return (
    <group ref={groupRef}>
      <ShipModel motion={motion} />
    </group>
  )
}
