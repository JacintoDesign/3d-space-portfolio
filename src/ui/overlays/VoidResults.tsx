import type { CSSProperties } from 'react'
import { useGame, VOID_SCORES_MAX } from '../../store/useGame'

const ACCENT = '#ff6a3d'

function taglineFor(rank: number) {
  if (rank === 1) return 'New best run.'
  if (rank > 1) return 'You made the board.'
  return 'Try again for a new high score.'
}

/**
 * Timed asteroid-belt results: the minute is over, the board is saved, and
 * Restart seeds a fresh field for another run.
 */
export function VoidResults() {
  const voidRound = useGame((s) => s.voidRound)
  const voidScore = useGame((s) => s.voidScore)
  const scores = useGame((s) => s.voidHighScores)
  const lastAt = useGame((s) => s.voidLastRunAt)
  const restart = useGame((s) => s.restartVoidRound)

  if (voidRound !== 'over') return null

  const board = scores.slice(0, VOID_SCORES_MAX)
  const rank = lastAt != null ? board.findIndex((e) => e.at === lastAt) + 1 : 0
  const isBest = rank === 1

  return (
    <div className="overlay-scrim void-results-scrim" style={{ zIndex: 45 }}>
      <div
        className="panel void-results"
        style={{ '--accent': ACCENT } as CSSProperties}
        role="dialog"
        aria-modal="true"
        aria-label="Asteroid belt high scores"
      >
        <p className="eyebrow">Asteroid belt</p>
        <h2>Time&apos;s up</h2>
        <p className="tagline">{taglineFor(rank)}</p>

        <div className="void-results-score">
          <span className="tag">This run</span>
          <span className="value">{voidScore.toLocaleString()}</span>
          {rank > 0 && <span className="rank">{isBest ? '◈ BEST' : `RANK ${rank}`}</span>}
        </div>

        <ol className="void-scoreboard">
          {board.length === 0 ? (
            <li className="empty">No scores saved yet.</li>
          ) : (
            board.map((entry, i) => (
              <li key={`${entry.at}-${entry.score}`} className={entry.at === lastAt ? 'current' : undefined}>
                <span className="place">{i + 1}</span>
                <span className="pts">{entry.score.toLocaleString()}</span>
                <span className="when">
                  {entry.at
                    ? new Date(entry.at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
                    : '—'}
                </span>
              </li>
            ))
          )}
        </ol>

        <div className="btn-row big">
          <button className="btn" type="button" onClick={restart} autoFocus>
            Restart ↗
          </button>
        </div>
      </div>
    </div>
  )
}
