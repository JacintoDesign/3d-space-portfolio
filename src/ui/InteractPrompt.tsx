import type { CSSProperties } from 'react'
import { useGame } from '../store/useGame'
import { landmarkById } from '../data/world'

export function InteractPrompt() {
  const mode = useGame((s) => s.mode)
  const nearTarget = useGame((s) => s.nearTarget)
  const isMobile = useGame((s) => s.isMobile)
  const openOverlay = useGame((s) => s.openOverlay)

  if (mode !== 'play' || !nearTarget) return null
  const landmark = landmarkById(nearTarget)
  if (!landmark) return null

  const name = landmark.kind === 'project' ? landmark.sign : 'Comms Relay'

  return (
    <button
      className="interact-prompt"
      onClick={() => openOverlay(nearTarget)}
      style={{ '--accent': landmark.color } as CSSProperties}
      aria-label={`Dock at ${name}`}
    >
      {!isMobile && <span className="key">E</span>}
      <span className="label">
        {isMobile ? 'Tap to dock · ' : 'Dock at '}
        <b>{name}</b>
      </span>
    </button>
  )
}
