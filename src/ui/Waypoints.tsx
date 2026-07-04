import type { CSSProperties } from 'react'
import { useGame } from '../store/useGame'
import { useMarkers } from '../store/useMarkers'

const MARGIN = 9 // % inset from the screen edge

/**
 * Off-screen station guidance. For each station not currently visible, a colored
 * chevron rides the screen edge pointing toward it with its sign + distance —
 * so the sector is always navigable. Click one to autopilot straight to it;
 * visited stations dim but stay reachable.
 */
export function Waypoints() {
  const mode = useGame((s) => s.mode)
  const setAutopilot = useGame((s) => s.setAutopilot)
  const autopilot = useGame((s) => s.autopilot)
  const markers = useMarkers((s) => s.markers)

  if (mode !== 'play') return null

  const maxX = 50 - MARGIN
  const maxY = 50 - MARGIN

  return (
    <div className="waypoints">
      {markers
        .filter((m) => !m.onScreen)
        .map((m) => {
          const len = Math.hypot(m.x, m.y) || 1e-3
          const ux = m.x / len
          const uy = -m.y / len // NDC y-up → screen y-down
          const t = Math.min(maxX / (Math.abs(ux) || 1e-3), maxY / (Math.abs(uy) || 1e-3))
          const px = 50 + ux * t
          const py = 50 + uy * t
          const deg = (Math.atan2(uy, ux) * 180) / Math.PI
          const cls = `waypoint${m.visited ? ' visited' : ''}${autopilot === m.id ? ' active' : ''}`
          return (
            <button
              key={m.id}
              className={cls}
              style={{ left: `${px}%`, top: `${py}%`, '--wp': m.color } as CSSProperties}
              onClick={() => setAutopilot(m.id)}
              title={`Autopilot to ${m.sign}`}
            >
              <span className="wp-arrow" style={{ transform: `rotate(${deg}deg)` }}>
                ➤
              </span>
              <span className="wp-name">{m.sign}</span>
              <span className="wp-dist">{Math.round(m.dist)}u</span>
            </button>
          )
        })}
    </div>
  )
}
