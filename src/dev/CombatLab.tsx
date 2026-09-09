import { Suspense, useLayoutEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { KeyboardControls, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { VoidCombat } from '../scene/VoidCombat'
import { keyboardMap } from '../ship/keyboardMap'
import { useGame } from '../store/useGame'

function Trial({ shot, paused, onStats, onImpact, coarse }: { coarse: boolean; onImpact: () => void; shot: number; paused: boolean; onStats: (s: { large: number; medium: number; small: number; hits: number }) => void }) {
  const ship = useRef<THREE.Group>(null)
  return <><group ref={ship} /><VoidCombat shipRef={ship} practice={{ shot, paused, onStats, onImpact, smallTarget: coarse, coarseStep: coarse }} /></>
}

/** Deterministic target, real projectiles, pool, scoring, and fracture behavior. */
export default function CombatLab() {
  const [coarse, setCoarse] = useState(false)
  const [trial, setTrial] = useState(0)
  const [shot, setShot] = useState(0)
  const [paused, setPaused] = useState(false)
  const [stats, setStats] = useState({ large: 0, medium: 0, small: 0, hits: 0 })
  const score = useGame((s) => s.voidScore)
  useLayoutEffect(() => {
    useGame.setState({ mode: 'play', zone: 'void', voidWarp: false, voidScore: 0 })
  }, [trial])
  const button = { padding: '10px 16px', color: '#e4efff', background: '#24374a', border: '1px solid #5b7997', borderRadius: 5 }
  return (
    <KeyboardControls map={keyboardMap}>
      <main style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: '#101724', color: '#e4efff', font: '14px monospace' }}>
        <header style={{ padding: 16, display: 'flex', gap: 12 }}>
          <button style={button} onClick={() => { setPaused(false); setShot((s) => s + 1) }}>Fire guided test shot</button>
          <button style={button} onClick={() => setPaused((p) => !p)}>{paused ? 'Resume' : 'Pause'}</button>
          <button style={button} onClick={() => { setCoarse(false); setTrial((t) => t + 1); setShot(0); setPaused(false) }}>Reset large target</button>
          <button style={button} onClick={() => { setCoarse(true); setTrial((t) => t + 1); setShot(0); setPaused(false) }}>20 FPS small-target test</button>
          <a href="/" style={{ color: '#bce7fa', padding: 10 }}>Back to flight</a>
        </header>
        <p style={{ padding: '0 16px' }}>Large: {stats.large} · Medium: {stats.medium} · Small: {stats.small} · Hits: {stats.hits} · Score: {score}</p>
        <div style={{ flex: 1, minHeight: 0 }}>
          <Canvas camera={{ position: [0, 3, 5], fov: 48 }} dpr={[1, 1.5]}>
            <color attach="background" args={['#101724']} />
            <ambientLight intensity={1.4} />
            <directionalLight position={[8, 8, 0]} intensity={3} />
            <directionalLight position={[-8, -2, -28]} intensity={2} color="#9dd5ec" />
            <Suspense fallback={null}><Trial key={trial} coarse={coarse} shot={shot} paused={paused} onStats={setStats} onImpact={() => setPaused(true)} /></Suspense>
            <OrbitControls target={[0, 0, -20]} />
          </Canvas>
        </div>
        <footer style={{ padding: 16 }}>Production combat simulation · drag to inspect · guided shots aim at the largest remaining chunk; pauses on each hit</footer>
      </main>
    </KeyboardControls>
  )
}
