import { useGame } from '../store/useGame'
import { STUDIO } from '../data/studio'

/**
 * The About "page": no station, no modal panel — the camera rides the ship at
 * warp while the studio story plays over the view as HUD-grade type. Esc or ✕
 * hands the stick back.
 */
export function AboutCinematic() {
  const mode = useGame((s) => s.mode)
  const closeAbout = useGame((s) => s.closeAbout)
  const { about } = STUDIO

  if (mode !== 'about') return null

  return (
    <div className="about-cine" role="dialog" aria-modal="true" aria-label="About Jacinto Design">
      <button className="icon-btn cine-close" onClick={closeAbout} aria-label="Close">
        ✕
      </button>

      <div className="cine-copy">
        <p className="cine-eyebrow">
          <span className="tick" /> {STUDIO.name} · 本社ログ
        </p>
        <h2>{about.heading}</h2>
        {about.body.map((para, i) => (
          <p key={i} className="cine-body" style={{ animationDelay: `${0.35 + i * 0.3}s` }}>
            {para}
          </p>
        ))}

        <div className="cine-stats">
          {about.stats.map((s, i) => (
            <div className="cine-stat" key={s.label} style={{ animationDelay: `${1.3 + i * 0.18}s` }}>
              <span className="value">{s.value}</span>
              <span className="label">{s.label}</span>
            </div>
          ))}
        </div>

        <p className="cine-hint">ESC — return to the stick</p>
      </div>

      {/* warp telemetry dressing, bottom-right */}
      <div className="cine-telemetry" aria-hidden>
        <span>VEL — WARP</span>
        <span>HDG — DEEP FIELD</span>
        <span>SYS — ALL GREEN</span>
      </div>
    </div>
  )
}
