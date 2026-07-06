import { useEffect, useRef, useState } from 'react'
import { useGame } from '../store/useGame'
import { useInput } from '../store/useInput'
import { pointerSteer } from '../ship/pointerSteer'

const STEER_DEAD = 0.08
const DRAG_THRESHOLD = 6 // px — quick taps stay clicks; matches desktop station discrimination

/** UI / interactive targets that must not start touch-hold steering. */
function isSteerExcluded(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  return Boolean(
    target.closest(
      'button, a, input, textarea, .touch-actions, .waypoint, .interact-prompt, .topbar, .tutorial, .overlay-scrim, .warp-drop-btn, .ap-chip, .loader, .nav-sheet, .nav-drop',
    ),
  )
}

/**
 * Touch controls: hold anywhere on screen (outside UI) to steer by offset from
 * centre; THRUST / BOOST / SHOOT on the right. No idle thrust — hold THRUST to move.
 */
export function MobileControls() {
  const isMobile = useGame((s) => s.isMobile)
  const mode = useGame((s) => s.mode)
  const zone = useGame((s) => s.zone)
  const voidWarp = useGame((s) => s.voidWarp)
  const setSteer = useInput((s) => s.setSteer)
  const setMobileAimLock = useInput((s) => s.setMobileAimLock)
  const clearMobileAimLock = useInput((s) => s.clearMobileAimLock)
  const setThrust = useInput((s) => s.setThrust)
  const setBoost = useInput((s) => s.setBoost)
  const setFire = useInput((s) => s.setFire)

  const [thrusting, setThrusting] = useState(false)
  const [boosting, setBoosting] = useState(false)
  const [firing, setFiring] = useState(false)
  const steerActive = useRef(false)
  const pointerId = useRef<number | null>(null)
  const downX = useRef(0)
  const downY = useRef(0)
  const downAt = useRef(0)
  /** Active BOOST / THRUST / SHOOT holds — suppress touch-hold steering. */
  const actionHoldCount = useRef(0)
  /** THRUST / BOOST holds that lock heading from last screen aim. */
  const thrustBoostHoldCount = useRef(0)
  /** Last touch offset from screen centre (−1…1) — survives steer release for action buttons. */
  const lastAimX = useRef(0)
  const lastAimY = useRef(0)

  const inBelt = zone === 'void' && !voidWarp

  const beginActionHold = (lockAim = false) => {
    actionHoldCount.current += 1
    steerActive.current = false
    pointerId.current = null
    if (lockAim) {
      thrustBoostHoldCount.current += 1
      setMobileAimLock(lastAimX.current, lastAimY.current)
    } else {
      setSteer(0, 0)
    }
  }

  const endActionHold = (lockAim = false) => {
    actionHoldCount.current = Math.max(0, actionHoldCount.current - 1)
    if (lockAim) {
      thrustBoostHoldCount.current = Math.max(0, thrustBoostHoldCount.current - 1)
      if (thrustBoostHoldCount.current === 0) clearMobileAimLock()
    }
  }

  // Touch-hold steering: offset from screen centre → yaw/pitch, magnitude ∝ distance.
  useEffect(() => {
    if (!isMobile || mode !== 'play') return

    const markSteerIntent = (clientX: number, clientY: number) => {
      if (pointerSteer.moved) return
      if (Math.hypot(clientX - downX.current, clientY - downY.current) > DRAG_THRESHOLD) {
        pointerSteer.moved = true
      } else if (performance.now() - downAt.current > 120) {
        pointerSteer.moved = true
      }
    }

    const applySteer = (clientX: number, clientY: number) => {
      const cx = window.innerWidth * 0.5
      const cy = window.innerHeight * 0.5
      const nx = Math.max(-1, Math.min(1, (clientX - cx) / cx))
      const ny = Math.max(-1, Math.min(1, (clientY - cy) / cy))
      lastAimX.current = nx
      lastAimY.current = ny

      if (actionHoldCount.current > 0) return

      const mag = Math.hypot(nx, ny)
      if (mag < STEER_DEAD) {
        setSteer(0, 0)
        return
      }
      markSteerIntent(clientX, clientY)
      // top = pitch up (steerY negative), right = yaw right — matches flight model.
      setSteer(nx, ny)
    }

    const clearSteer = () => {
      steerActive.current = false
      pointerId.current = null
      setSteer(0, 0)
      queueMicrotask(() => {
        pointerSteer.moved = false
      })
    }

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 || useGame.getState().mode !== 'play') return
      if (isSteerExcluded(e.target)) return
      steerActive.current = true
      pointerId.current = e.pointerId
      downX.current = e.clientX
      downY.current = e.clientY
      downAt.current = performance.now()
      pointerSteer.moved = false
      applySteer(e.clientX, e.clientY)
    }

    const onMove = (e: PointerEvent) => {
      if (!steerActive.current || e.pointerId !== pointerId.current) return
      applySteer(e.clientX, e.clientY)
    }

    const onUp = (e: PointerEvent) => {
      if (!steerActive.current || e.pointerId !== pointerId.current) return
      clearSteer()
    }

    window.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
      setSteer(0, 0)
    }
  }, [isMobile, mode, setSteer, setMobileAimLock, clearMobileAimLock])

  if (!isMobile || mode !== 'play') return null

  return (
    <div className="mobile-controls">
      <div className="touch-actions">
        <button
          className={`touch-btn boost${boosting ? ' on' : ''}`}
          onPointerDown={(e) => {
            e.preventDefault()
            beginActionHold(true)
            setBoosting(true)
            setBoost(true)
          }}
          onPointerUp={() => {
            endActionHold(true)
            setBoosting(false)
            setBoost(false)
          }}
          onPointerLeave={() => {
            endActionHold(true)
            setBoosting(false)
            setBoost(false)
          }}
          onPointerCancel={() => {
            endActionHold(true)
            setBoosting(false)
            setBoost(false)
          }}
        >
          BOOST
        </button>
        <button
          className={`touch-btn thrust${thrusting ? ' on' : ''}`}
          onPointerDown={(e) => {
            e.preventDefault()
            beginActionHold(true)
            setThrusting(true)
            setThrust(true)
          }}
          onPointerUp={() => {
            endActionHold(true)
            setThrusting(false)
            setThrust(false)
          }}
          onPointerLeave={() => {
            endActionHold(true)
            setThrusting(false)
            setThrust(false)
          }}
          onPointerCancel={() => {
            endActionHold(true)
            setThrusting(false)
            setThrust(false)
          }}
        >
          THRUST
        </button>
        {inBelt && (
          <button
            className={`touch-btn shoot${firing ? ' on' : ''}`}
            onPointerDown={(e) => {
              e.preventDefault()
              beginActionHold()
              setFiring(true)
              setFire(true)
            }}
            onPointerUp={() => {
              endActionHold()
              setFiring(false)
              setFire(false)
            }}
            onPointerLeave={() => {
              endActionHold()
              setFiring(false)
              setFire(false)
            }}
            onPointerCancel={() => {
              endActionHold()
              setFiring(false)
              setFire(false)
            }}
            aria-label="Fire lasers"
          >
            SHOOT
          </button>
        )}
      </div>
    </div>
  )
}
