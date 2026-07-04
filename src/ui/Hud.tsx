import type { CSSProperties } from 'react'
import { useGame } from '../store/useGame'
import { useShip } from '../store/useShip'
import { landmarkById } from '../data/world'

/**
 * Cockpit flight HUD — targeting reticle, dock-lock readout, and a throttle /
 * velocity gauge. DOM overlay, fed by the throttled telemetry store.
 */
export function Hud() {
  const mode = useGame((s) => s.mode)
  const autopilot = useGame((s) => s.autopilot)
  const setAutopilot = useGame((s) => s.setAutopilot)
  const throttle = useShip((s) => s.throttle)
  const speed = useShip((s) => s.speed)
  const boosting = useShip((s) => s.boosting)
  const targetId = useShip((s) => s.targetId)
  const targetDist = useShip((s) => s.targetDist)
  const px = useShip((s) => s.px)
  const py = useShip((s) => s.py)
  const pz = useShip((s) => s.pz)

  if (mode !== 'play') return null

  const target = targetId ? landmarkById(targetId) : null
  const accent = target?.color ?? '#5be9ff'

  const gateway = autopilot === 'gateway'
  const ap = autopilot && !gateway ? landmarkById(autopilot) : null
  const apDist = ap
    ? Math.round(Math.hypot(ap.position[0] - px, ap.position[1] - py, ap.position[2] - pz))
    : 0

  return (
    <div className="hud" style={{ '--hud': accent } as CSSProperties}>
      {/* center targeting reticle */}
      <div className={`reticle${target ? ' locked' : ''}`}>
        <span className="b tl" />
        <span className="b tr" />
        <span className="b bl" />
        <span className="b br" />
        <span className="dot" />
      </div>

      {/* gateway run — click (or steer) to take back the stick */}
      {gateway && (
        <button
          className="ap-chip"
          style={{ '--ap': '#9fe9ff' } as CSSProperties}
          onClick={() => setAutopilot(null)}
          title="Cancel autopilot"
        >
          <span className="ap-tag">◈ AUTOPILOT</span>
          <span className="ap-name">ゲート · GATEWAY</span>
          <span className="ap-cancel">✕</span>
        </button>
      )}

      {/* autopilot banner — click (or steer) to cancel */}
      {ap && (
        <button
          className="ap-chip"
          style={{ '--ap': ap.color } as CSSProperties}
          onClick={() => setAutopilot(null)}
          title="Cancel autopilot"
        >
          <span className="ap-tag">◈ AUTOPILOT</span>
          <span className="ap-name">
            {ap.signJP} · {ap.sign}
          </span>
          <span className="ap-dist">{apDist} u</span>
          <span className="ap-cancel">✕</span>
        </button>
      )}

      {/* dock-lock readout */}
      {target && (
        <div className="target-readout">
          <span className="tag">◎ DOCK LOCK</span>
          <span className="name">
            {target.signJP} · {target.sign}
          </span>
          <span className="dist">{Math.round(targetDist)} u</span>
        </div>
      )}

      {/* throttle / velocity gauge */}
      <div className="throttle">
        <div className="meta">
          <span>THR</span>
          <span className={boosting ? 'boost on' : 'boost'}>{boosting ? 'BOOST' : 'CRUISE'}</span>
        </div>
        <div className="bar">
          <i style={{ width: `${Math.round(throttle * 100)}%` }} />
        </div>
        <div className="vel">VEL {Math.round(speed)} u/s</div>
      </div>
    </div>
  )
}
