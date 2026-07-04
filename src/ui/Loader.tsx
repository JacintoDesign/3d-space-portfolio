import { useEffect, useState } from 'react'
import { DefaultLoadingManager } from 'three'
import { useGame } from '../store/useGame'
import { STUDIO } from '../data/studio'
import { startAmbience, setMuted } from '../audio/ambience'

export function Loader() {
  const setReady = useGame((s) => s.setReady)
  const [forceReady, setForceReady] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [progress, setProgress] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const [ramp, setRamp] = useState(0)

  // Track three's default loading manager.
  useEffect(() => {
    const mgr = DefaultLoadingManager
    const prevProgress = mgr.onProgress
    const prevLoad = mgr.onLoad
    mgr.onProgress = (_url, itemsLoaded, itemsTotal) => {
      setProgress(itemsTotal > 0 ? (itemsLoaded / itemsTotal) * 100 : 0)
    }
    mgr.onLoad = () => setLoaded(true)
    return () => {
      mgr.onProgress = prevProgress
      mgr.onLoad = prevLoad
    }
  }, [])

  // The scene is fully procedural (no async asset loads), so animate a smooth
  // "spool up" ramp for drama, then unlock. A setTimeout backstop guarantees the
  // gate opens even if rAF is throttled (e.g. a backgrounded tab).
  useEffect(() => {
    const start = performance.now()
    const DURATION = 1700
    let raf = 0
    const tick = () => {
      const tt = Math.min(1, (performance.now() - start) / DURATION)
      setRamp(tt * 100)
      if (tt < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    const backstop = setTimeout(() => setForceReady(true), 2100)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(backstop)
    }
  }, [])

  const pct = Math.min(100, Math.round(Math.max(progress, ramp)))
  const ready = forceReady || loaded || pct >= 100

  const enter = () => {
    setLeaving(true)
    startAmbience()
    setMuted(false)
    useGame.setState({ muted: false })
    setTimeout(() => setReady(), 650)
  }

  return (
    <div className={`loader${leaving ? ' hide' : ''}`}>
      <div className="loader-inner">
        <div className="eyebrow-jp">電脳星雲 · NEBULA DRIFT</div>
        <div className="logo">
          JACINTO <span className="accent">DESIGN</span>
        </div>
        <div className="sub">{STUDIO.tagline}</div>
        <div className="bar">
          <i style={{ width: `${ready ? 100 : pct}%` }} />
        </div>
        <button className={`enter-btn${ready ? ' show' : ''}`} disabled={!ready} onClick={enter}>
          {ready ? 'Launch into the Nebula' : `Spooling drives ${pct}%`}
        </button>
        <div className="loader-hint">A playable portfolio · WASD to fly · click a station to travel</div>
      </div>
    </div>
  )
}
