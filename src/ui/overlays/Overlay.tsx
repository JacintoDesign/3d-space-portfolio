import type { CSSProperties, ReactNode } from 'react'
import { useGame } from '../../store/useGame'

export function Overlay({ accent, children }: { accent: string; children: ReactNode }) {
  const closeOverlay = useGame((s) => s.closeOverlay)

  return (
    <div className="overlay-scrim" onClick={closeOverlay}>
      <div
        className="panel"
        style={{ '--accent': accent } as CSSProperties}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button className="close" onClick={closeOverlay} aria-label="Close">
          ✕
        </button>
        {children}
      </div>
    </div>
  )
}
