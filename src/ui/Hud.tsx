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
  const zone = useGame((s) => s.zone)
  const voidWarp = useGame((s) => s.voidWarp)
  const voidScore = useGame((s) => s.voidScore)
  const dropOutOfWarp = useGame((s) => s.dropOutOfWarp)
  const parked = useGame((s) => s.parked)
  const resumeFlight = useGame((s) => s.resumeFlight)
  const autopilot = useGame((s) => s.autopilot)
  const setAutopilot = useGame((s) => s.setAutopilot)
  const throttle = useShip((s) => s.throttle)
  const speed = useShip((s) => s.speed)
  const boosting = useShip((s) => s.boosting)
  const limiter = useShip((s) => s.limiter)
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
      {parked && (
        <button className="ap-chip parked-chip" onClick={resumeFlight}>
          <span className="ap-tag">◎ STATION HOLD</span>
          <span>Return to free roam</span>
          <span className="ap-cancel">ESC</span>
        </button>
      )}
      {/* center targeting reticle */}
      <div className={`reticle${target ? ' locked' : ''}`}>
        <span className="b tl" />
        <span className="b tr" />
        <span className="b bl" />
        <span className="b br" />
        <span className="dot" />
      </div>

      {/* attitude limiter — nose held short of vertical, easing back level */}
      {limiter && (
        <div className="attitude-chip" role="status">
          ◈ ATTITUDE ASSIST · LEVELING TO HORIZON
        </div>
      )}

      {/* void warp transit — drop out to enter the asteroid belt */}
      {zone === 'void' && voidWarp && (
        <button className="warp-drop-btn" onClick={dropOutOfWarp} title="Drop out of warp (B)">
          <span className="warp-drop-tag">◈ WARP DRIVE</span>
          <span className="warp-drop-label">DROP OUT</span>
          <span className="warp-drop-hint">B</span>
        </button>
      )}

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

      {/* throttle / velocity gauge + void score */}
      <div className="hud-left">
        <div className="throttle">
          <div className="meta">
            <span>THR</span>
            <span className={boosting ? 'boost on' : 'boost'}>
              {voidWarp && zone === 'void' ? 'WARP' : boosting ? 'BOOST' : 'CRUISE'}
            </span>
          </div>
          <div className="bar">
            <i style={{ width: `${Math.round(throttle * 100)}%` }} />
          </div>
          <div className="vel">VEL {Math.round(speed)} u/s</div>
        </div>

        {zone === 'void' && !voidWarp && (
          <div className="void-score">
            <span className="tag">◈ SCORE</span>
            <span className="value">{voidScore.toLocaleString()}</span>
          </div>
        )}
      </div>

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
    </div>
  )
}
