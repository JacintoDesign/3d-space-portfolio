import { Suspense, useLayoutEffect, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { Environment, Lightformer, OrbitControls } from '@react-three/drei'
import { StationStructure } from '../stations/StationStructure'
import { LANDMARKS } from '../data/world'

const VIEWS: Record<string, [number, number, number]> = {
  Perspective: [2.8, 1.8, 4], Front: [0, 0, 5], Rear: [0, 0, -5], Left: [-5, 0, 0], Right: [5, 0, 0], Top: [0, 5, 0.001], Bottom: [0, -5, 0.001],
}

function CameraView({ view }: { view: string }) {
  const camera = useThree((s) => s.camera)
  useLayoutEffect(() => {
    camera.position.set(...VIEWS[view])
    camera.lookAt(0, 0, 0)
  }, [camera, view])
  return null
}

/** Development-only inspection bench; the production bundle excludes this module. */
export default function StationLab() {
  const [id, setId] = useState('vibemail')
  const [view, setView] = useState('Perspective')
  const [phase, setPhase] = useState<number | undefined>(0)
  const landmark = LANDMARKS.find((l) => l.id === id)!
  const button = { padding: '9px 13px', background: '#18283b', color: '#e3eef8', border: '1px solid #456078', borderRadius: 5, cursor: 'pointer' }
  return (
    <main style={{ height: '100dvh', background: '#101a29', color: '#dce8f2', display: 'flex', flexDirection: 'column', font: '13px monospace' }}>
      <header style={{ padding: 16, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {LANDMARKS.map((l) => <button key={l.id} style={{ ...button, borderColor: id === l.id ? l.color : '#456078' }} aria-pressed={id === l.id} onClick={() => setId(l.id)}>{l.sign}</button>)}
        <a href="/" style={{ color: '#c6ddf0', padding: 10 }}>Back to flight</a>
      </header>
      <div style={{ padding: '0 16px 12px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {Object.keys(VIEWS).map((name) => <button key={name} style={button} aria-pressed={view === name} onClick={() => setView(name)}>{name}</button>)}
        <button style={button} onClick={() => setPhase(phase === undefined ? 0 : undefined)}>{phase === undefined ? 'Freeze rim' : 'Animate rim'}</button>
        <button style={button} onClick={() => setPhase((p) => ((p ?? 0) + Math.PI / 4) % (Math.PI * 2))}>Advance rim 45°</button>
      </div>
      <div style={{ flex: 1, minHeight: 0 }}>
        <Canvas camera={{ position: VIEWS.Perspective, fov: 46 }} dpr={[1, 1.5]}>
          <color attach="background" args={['#101a29']} />
          <ambientLight intensity={0.85} />
          <hemisphereLight intensity={1.5} color="#d7ebff" groundColor="#6c7290" />
          <directionalLight position={[3, 5, 4]} intensity={2} />
          <directionalLight position={[-3, -1, -4]} intensity={1.4} />
          <Suspense fallback={null}>
            <Environment resolution={64} frames={1}>
              <Lightformer intensity={1.5} position={[0, -4, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={10} />
              <Lightformer intensity={2} position={[0, 4, 0]} rotation={[Math.PI / 2, 0, 0]} scale={10} />
              <Lightformer intensity={1.5} position={[0, 0, 5]} scale={10} />
              <Lightformer intensity={1.5} position={[0, 0, -5]} rotation={[0, Math.PI, 0]} scale={10} />
            </Environment>
            <StationStructure id={id} radius={1} color={landmark.color} phase={phase} />
          </Suspense>
          <CameraView view={view} />
          <OrbitControls makeDefault />
        </Canvas>
      </div>
      <footer style={{ padding: 14 }}>Station assembly inspection · {landmark.sign} · {view} · rim {phase === undefined ? 'animated' : `${Math.round(phase * 180 / Math.PI)}°`} · Drag to orbit / scroll to zoom</footer>
    </main>
  )
}
