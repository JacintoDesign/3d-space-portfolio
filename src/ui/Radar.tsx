import { useGame } from '../store/useGame'
import { useShip } from '../store/useShip'
import { LANDMARKS } from '../data/world'

// World → radar (0..100) mapping. Forward (-Z) is up.
const X_MIN = -62
const X_MAX = 62
const Z_MIN = -196
const Z_MAX = 36
const sx = (x: number) => ((x - X_MIN) / (X_MAX - X_MIN)) * 100
const sy = (z: number) => ((z - Z_MIN) / (Z_MAX - Z_MIN)) * 100

/** Top-down sector radar with station blips + a heading-aware ship marker. */
export function Radar() {
  const mode = useGame((s) => s.mode)
  const zone = useGame((s) => s.zone)
  const visited = useGame((s) => s.visited)
  const px = useShip((s) => s.px)
  const pz = useShip((s) => s.pz)
  const heading = useShip((s) => s.heading)
  const targetId = useShip((s) => s.targetId)

  if (mode !== 'play') return null

  // heading = atan2(forward.x, forward.z); rebuild the screen-space travel angle.
  const fx = Math.sin(heading)
  const fz = Math.cos(heading)
  const shipDeg = (Math.atan2(fz, fx) * 180) / Math.PI + 90

  return (
    <div className="radar">
      <svg viewBox="0 0 100 100" aria-hidden>
        <defs>
          <clipPath id="radar-clip">
            <circle cx="50" cy="50" r="49" />
          </clipPath>
        </defs>
        <g clipPath="url(#radar-clip)">
          <circle cx="50" cy="50" r="49" className="r-bg" />
          <circle cx="50" cy="50" r="33" className="r-ring" />
          <circle cx="50" cy="50" r="16" className="r-ring" />
          <line x1="50" y1="1" x2="50" y2="99" className="r-grid" />
          <line x1="1" y1="50" x2="99" y2="50" className="r-grid" />
          <line x1="50" y1="50" x2="50" y2="1" className="r-sweep" />

          {zone === 'nebula' &&
            LANDMARKS.map((l) => {
              const isTarget = l.id === targetId
              const isVisited = visited.includes(l.id)
              return (
                <circle
                  key={l.id}
                  cx={sx(l.position[0])}
                  cy={sy(l.position[2])}
                  r={isTarget ? 3.2 : 2}
                  fill={l.color}
                  opacity={isVisited && !isTarget ? 0.32 : 1}
                  className={isTarget ? 'blip target' : 'blip'}
                />
              )
            })}
          {/* the gateway shows on both sides — it's the way home */}
          <circle cx={sx(0)} cy={sy(-150)} r={2.4} fill="#9fe9ff" opacity={0.9} className="blip" />

          <g transform={`translate(${sx(px)} ${sy(pz)}) rotate(${shipDeg})`}>
            <polygon points="0,-3.4 2.6,3 0,1.4 -2.6,3" className="ship-marker" />
          </g>
        </g>
        <circle cx="50" cy="50" r="49" className="r-frame" />
      </svg>
      <span className="radar-label">{zone === 'nebula' ? 'SECTOR · JD-7' : '虚空 · THE VOID'}</span>
    </div>
  )
}
