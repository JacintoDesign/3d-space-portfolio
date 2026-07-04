import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useGame } from '../store/useGame'
import { LANDMARKS, landmarkById } from '../data/world'
import { STUDIO } from '../data/studio'

const PROJECTS = LANDMARKS.filter((l) => l.kind === 'project')

/**
 * Site-style navigation over the 3D world. Stations engage the autopilot in
 * flight (flies there + auto-docks) or switch instantly while an overlay is
 * open; About is not a station — it cuts to the warp cinematic.
 */
function go(id: string) {
  const g = useGame.getState()
  if (g.mode === 'about') g.closeAbout()
  if (g.mode === 'contact') g.closeContact()
  if (g.mode === 'overlay') {
    if (g.activeBuilding !== id) g.openOverlay(id)
    return
  }
  g.setAutopilot(id)
}

function goAbout() {
  const g = useGame.getState()
  if (g.mode === 'about') return
  if (g.mode === 'contact') g.closeContact()
  if (g.mode === 'overlay') g.closeOverlay()
  g.openAbout()
}

function goContact() {
  const g = useGame.getState()
  if (g.mode === 'contact') return
  if (g.mode === 'about') g.closeAbout()
  if (g.mode === 'overlay') g.closeOverlay()
  g.openContact()
}

function DestButton({ id, onPick }: { id: string; onPick: () => void }) {
  const visited = useGame((s) => s.visited)
  const l = landmarkById(id)
  if (!l) return null
  return (
    <button
      style={{ '--dot': l.color } as CSSProperties}
      onClick={() => {
        onPick()
        go(id)
      }}
    >
      <span className="nav-dot" />
      <span className="nav-name">{l.sign}</span>
      <span className="nav-sub">{visited.includes(l.id) ? '✓ DOCKED' : l.signJP}</span>
    </button>
  )
}

/** Desktop top-bar nav: ABOUT · PROJECTS ▾ · CONTACT. Hidden on narrow screens. */
export function NavMenu() {
  const [drop, setDrop] = useState(false)
  const mode = useGame((s) => s.mode)
  const autopilot = useGame((s) => s.autopilot)
  const activeBuilding = useGame((s) => s.activeBuilding)
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!drop) return
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setDrop(false)
    }
    window.addEventListener('pointerdown', onDown)
    return () => window.removeEventListener('pointerdown', onDown)
  }, [drop])

  const current = activeBuilding ?? autopilot
  const cls = (active: boolean) => (active ? 'nav-link active' : 'nav-link')

  return (
    <nav className="nav" ref={ref} aria-label="Sections">
      <button className={cls(mode === 'about')} onClick={() => { setDrop(false); goAbout() }}>
        About
      </button>
      <div className="nav-item">
        <button
          className={cls(Boolean(current && PROJECTS.some((p) => p.id === current)))}
          aria-expanded={drop}
          onClick={() => setDrop((v) => !v)}
        >
          Projects <span className="nav-caret">▾</span>
        </button>
        {drop && (
          <div className="nav-drop">
            {PROJECTS.map((l) => (
              <DestButton key={l.id} id={l.id} onPick={() => setDrop(false)} />
            ))}
          </div>
        )}
      </div>
      <button className={cls(mode === 'contact')} onClick={() => { setDrop(false); goContact() }}>
        Contact
      </button>
    </nav>
  )
}

/** Mobile hamburger → full-screen list. Rendered in the top-bar actions. */
export function MobileNav() {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  return (
    <>
      <button className="icon-btn nav-burger" onClick={() => setOpen(true)} aria-label="Navigation">
        ☰
      </button>
      {open && (
        <div className="nav-sheet">
          <div className="nav-sheet-head">
            <span>SECTOR NAV · 航路</span>
            <button className="icon-btn" onClick={close} aria-label="Close navigation">
              ✕
            </button>
          </div>
          <div className="nav-sheet-list">
            <button
              style={{ '--dot': STUDIO.about.color } as CSSProperties}
              onClick={() => {
                close()
                goAbout()
              }}
            >
              <span className="nav-dot" />
              <span className="nav-name">ABOUT</span>
              <span className="nav-sub">{STUDIO.about.signJP} · WARP</span>
            </button>
            {LANDMARKS.map((l) => (
              <DestButton key={l.id} id={l.id} onPick={close} />
            ))}
            <button
              style={{ '--dot': STUDIO.contact.color } as CSSProperties}
              onClick={() => {
                close()
                goContact()
              }}
            >
              <span className="nav-dot" />
              <span className="nav-name">CONTACT</span>
              <span className="nav-sub">{STUDIO.contact.signJP} · WARP</span>
            </button>
          </div>
          <p className="nav-sheet-hint">Autopilot flies you there — steer to cancel</p>
        </div>
      )}
    </>
  )
}
