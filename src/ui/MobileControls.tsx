import { useRef, useState } from 'react'
import { useGame } from '../store/useGame'
import { useInput } from '../store/useInput'

type Dir = 'up' | 'down' | 'left' | 'right'

/**
 * Touch controls: a semi-transparent d-pad steers (yaw + pitch) and THRUST /
 * BOOST drive the engines. No idle thrust — hold THRUST to move.
 */
export function MobileControls() {
  const isMobile = useGame((s) => s.isMobile)
  const mode = useGame((s) => s.mode)
  const setSteer = useInput((s) => s.setSteer)
  const setThrust = useInput((s) => s.setThrust)
  const setBoost = useInput((s) => s.setBoost)

  const dirs = useRef({ up: false, down: false, left: false, right: false })
  const [active, setActive] = useState<Record<Dir, boolean>>({
    up: false,
    down: false,
    left: false,
    right: false,
  })
  const [thrusting, setThrusting] = useState(false)
  const [boosting, setBoosting] = useState(false)

  if (!isMobile || mode !== 'play') return null

  const apply = () => {
    const d = dirs.current
    // up on the d-pad = nose up (steerY negative), matching the flight model.
    setSteer((d.right ? 1 : 0) - (d.left ? 1 : 0), (d.down ? 1 : 0) - (d.up ? 1 : 0))
  }
  const press = (dir: Dir, on: boolean) => (e: React.PointerEvent) => {
    e.preventDefault()
    dirs.current[dir] = on
    setActive((a) => ({ ...a, [dir]: on }))
    apply()
  }

  const pad = (dir: Dir, glyph: string) => (
    <button
      className={`dpad-btn ${dir}${active[dir] ? ' on' : ''}`}
      onPointerDown={press(dir, true)}
      onPointerUp={press(dir, false)}
      onPointerLeave={press(dir, false)}
      onPointerCancel={press(dir, false)}
      aria-label={dir}
    >
      {glyph}
    </button>
  )

  return (
    <div className="mobile-controls">
      <div className="dpad" role="group" aria-label="Steer">
        <span className="dpad-hub" />
        {pad('up', '▲')}
        {pad('left', '◀')}
        {pad('right', '▶')}
        {pad('down', '▼')}
      </div>

      <div className="touch-actions">
        <button
          className={`touch-btn boost${boosting ? ' on' : ''}`}
          onPointerDown={(e) => {
            e.preventDefault()
            setBoosting(true)
            setBoost(true)
          }}
          onPointerUp={() => {
            setBoosting(false)
            setBoost(false)
          }}
          onPointerLeave={() => {
            setBoosting(false)
            setBoost(false)
          }}
          onPointerCancel={() => {
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
            setThrusting(true)
            setThrust(true)
          }}
          onPointerUp={() => {
            setThrusting(false)
            setThrust(false)
          }}
          onPointerLeave={() => {
            setThrusting(false)
            setThrust(false)
          }}
          onPointerCancel={() => {
            setThrusting(false)
            setThrust(false)
          }}
        >
          THRUST
        </button>
      </div>
    </div>
  )
}
