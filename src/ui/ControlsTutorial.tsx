import { useGame } from '../store/useGame'

export function ControlsTutorial({ onClose }: { onClose: () => void }) {
  const isMobile = useGame((s) => s.isMobile)

  return (
    <div className="tutorial">
      <div className="card">
        <h3>Welcome to the Drift</h3>
        <p className="lead">
          You&apos;re adrift in a neon nebula. Pilot your ship to the floating stations and dock to explore the work
          of Jacinto Design.
        </p>

        {isMobile ? (
          <div className="controls-grid">
            <div className="control">
              <span className="kbd">✛</span>
              <span className="desc">
                <b>Hold</b> on screen to steer — further from centre = sharper turn
              </span>
            </div>
            <div className="control">
              <span className="kbd">THRUST</span>
              <span className="desc">
                Hold <b>THRUST</b> to fly · <b>BOOST</b> for warp
              </span>
            </div>
            <div className="control">
              <span className="kbd">◎</span>
              <span className="desc">
                Fly at a station to <b>dock</b> automatically
              </span>
            </div>
            <div className="control">
              <span className="kbd">☰</span>
              <span className="desc">
                <b>Tap a station</b> or the nav — autopilot flies you there
              </span>
            </div>
            <div className="control">
              <span className="kbd">◈</span>
              <span className="desc">
                Punch through the <b>gateway</b> to warp — tap <b>DROP OUT</b> for the asteroid belt
              </span>
            </div>
            <div className="control">
              <span className="kbd">SHOOT</span>
              <span className="desc">
                In the belt, tap <b>SHOOT</b> to fire lasers at asteroids
              </span>
            </div>
          </div>
        ) : (
          <div className="controls-grid">
            <div className="control">
              <span className="keys">
                <span className="kbd">W</span>
                <span className="kbd">Shift</span>
              </span>
              <span className="desc">
                <b>Thrust</b> to fly (no idle drift) · hold Shift to <b>boost</b>
              </span>
            </div>
            <div className="control">
              <span className="keys">
                <span className="kbd">A</span>
                <span className="kbd">D</span>
                <span className="kbd">↑</span>
                <span className="kbd">↓</span>
              </span>
              <span className="desc">
                <b>Turn</b> — A/D yaw, arrows pitch · <b>S</b> brakes
              </span>
            </div>
            <div className="control">
              <span className="keys">
                <span className="kbd">Mouse</span>
              </span>
              <span className="desc">
                Move or <b>drag</b> to steer — the ship <b>banks</b> into turns · <b>click a station</b> to fly there
              </span>
            </div>
            <div className="control">
              <span className="keys">
                <span className="kbd">Portal</span>
              </span>
              <span className="desc">
                Fly through the <b>gateway</b> to warp into the void — then <b>drop out</b> to enter the asteroid belt
              </span>
            </div>
            <div className="control">
              <span className="keys">
                <span className="kbd">B</span>
              </span>
              <span className="desc">
                <b>Drop out of warp</b> in the void to slow down and enter the belt
              </span>
            </div>
            <div className="control">
              <span className="keys">
                <span className="kbd">Space</span>
              </span>
              <span className="desc">
                After drop-out, <b>fire lasers</b> at drifting asteroids
              </span>
            </div>
            <div className="control">
              <span className="keys">
                <span className="kbd">◎</span>
              </span>
              <span className="desc">
                <b>Dock</b> by flying at a station — it locks on automatically
              </span>
            </div>
            <div className="control">
              <span className="keys">
                <span className="kbd">➤</span>
              </span>
              <span className="desc">
                <b>Autopilot</b> — the top menu or any edge arrow flies you there; the sector edge flies you home
              </span>
            </div>
          </div>
        )}

        <button className="btn" onClick={onClose} style={{ width: '100%', justifyContent: 'center' }}>
          Engage
        </button>
      </div>
    </div>
  )
}
