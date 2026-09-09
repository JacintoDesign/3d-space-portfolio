import { useEffect, useState } from 'react'
import { useGame } from '../store/useGame'
import { setMuted } from '../audio/ambience'
import { Loader } from './Loader'
import { InteractPrompt } from './InteractPrompt'
import { OverlayRoot } from './overlays/OverlayRoot'
import { ControlsTutorial } from './ControlsTutorial'
import { MobileControls } from './MobileControls'
import { Hud } from './Hud'
import { Radar } from './Radar'
import { Waypoints } from './Waypoints'
import { NavMenu, MobileNav } from './NavMenu'
import { AboutCinematic } from './AboutCinematic'
import { ContactCinematic } from './ContactCinematic'

/** One-shot white-out when the ship punches through the portal membrane. */
function WarpFlash() {
  const transit = useGame((s) => s.transit)
  const reduced = useGame((s) => s.reducedMotion)
  if (!transit || reduced) return null // the flash is pure motion — skip it if reduced
  return <div className="warp-flash" key={transit} aria-hidden />
}

/** Minimal hint shown while the HUD is hidden for screenshots. */
function PhotoHint() {
  return <div className="photo-hint">PHOTO MODE · P / ESC · drag to frame</div>
}

function TopBar({ onHelp }: { onHelp: () => void }) {
  const muted = useGame((s) => s.muted)
  const toggleMuted = useGame((s) => s.toggleMuted)

  const toggle = () => {
    const next = !muted
    toggleMuted()
    setMuted(next)
  }

  return (
    <div className="topbar">
      <div className="brand">
        <h1>
          Jacinto <span className="accent">Design</span>
        </h1>
        <p>Nebula Drift · Sector JD-7</p>
      </div>
      <NavMenu />
      <div className="top-actions">
        <MobileNav />
        <button className="icon-btn" onClick={toggle} aria-label="Toggle sound" title="Toggle sound">
          {muted ? '🔇' : '🔊'}
        </button>
        <button className="icon-btn" onClick={onHelp} aria-label="Controls" title="Controls">
          ?
        </button>
      </div>
    </div>
  )
}

export function UI() {
  const mode = useGame((s) => s.mode)
  const parked = useGame((s) => s.parked)
  const photoMode = useGame((s) => s.photoMode)
  const controlsSeen = useGame((s) => s.controlsSeen)
  const dismissControls = useGame((s) => s.dismissControls)
  const [helpOpen, setHelpOpen] = useState(false)

  // Show the tutorial automatically the first time the player launches.
  useEffect(() => {
    if (mode === 'play' && !controlsSeen) setHelpOpen(true)
  }, [mode, controlsSeen])

  const closeTutorial = () => {
    setHelpOpen(false)
    if (!controlsSeen) dismissControls()
  }

  return (
    <div className={`ui-layer${parked || mode !== 'play' ? ' reading' : ''}`}>
      {mode === 'loading' && <Loader />}

      {mode !== 'loading' && (
        <>
          {/* Flight chrome — hidden in photo mode for clean screenshots. */}
          {!photoMode && (
            <>
              <TopBar onHelp={() => setHelpOpen(true)} />
              <Hud />
              <Waypoints />
              <Radar />
              <InteractPrompt />
              <MobileControls />
              {helpOpen && mode === 'play' && <ControlsTutorial onClose={closeTutorial} />}
            </>
          )}
          {photoMode && <PhotoHint />}
          {/* Overlays + cinematics + warp flash stay available regardless. */}
          <OverlayRoot />
          <AboutCinematic />
          <ContactCinematic />
          <WarpFlash />
        </>
      )}
    </div>
  )
}
