import { Suspense, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { AdaptiveDpr, Environment, KeyboardControls, Lightformer, Preload } from '@react-three/drei'
import * as THREE from 'three'
import { Atmosphere } from './Atmosphere'
import { Lighting } from './Lighting'
import { Nebula } from './Nebula'
import { Starfield } from './Starfield'
import { SpaceDust } from './SpaceDust'
import { Moon } from './Moon'
import { Sector } from './Sector'
import { Effects } from './effects/Effects'
import { Ship } from '../ship/Ship'
import { ChaseCamera } from '../ship/ChaseCamera'
import { StationMarkers } from './StationMarkers'
import { keyboardMap } from '../ship/keyboardMap'
import { useGame } from '../store/useGame'

export function Experience() {
  const ship = useRef<THREE.Group>(null)
  const isMobile = useGame((s) => s.isMobile)

  return (
    <KeyboardControls map={keyboardMap}>
      <Canvas
        shadows
        dpr={[1, isMobile ? 1.3 : 2]}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          // Keep the drawing buffer so photo-mode shots (and the OG capture) can
          // be saved / read back from the canvas.
          preserveDrawingBuffer: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.1,
        }}
        camera={{ fov: 60, near: 0.1, far: 1200, position: [0, 5, 40] }}
      >
        <Atmosphere />
        <Lighting />
        <Nebula />
        <Starfield />
        <Moon />

        <Suspense fallback={null}>
          {/* Procedural nebula-toned env map — gives the PBR hulls their sheen
              without any runtime CDN fetch. */}
          <Environment resolution={64} frames={1}>
            <Lightformer intensity={2.2} color="#7de9ff" position={[10, 8, -10]} scale={[10, 10, 1]} />
            <Lightformer intensity={1.5} color="#ff2a6d" position={[-12, -6, 8]} scale={[12, 8, 1]} />
            <Lightformer intensity={1} color="#b537f2" position={[0, 14, 4]} scale={[18, 6, 1]} />
          </Environment>
          <SpaceDust />
          <Sector />
          <Ship groupRef={ship} />
          <Preload all />
        </Suspense>

        <ChaseCamera targetRef={ship} />
        <StationMarkers />
        <Effects />
        <AdaptiveDpr pixelated />
      </Canvas>
    </KeyboardControls>
  )
}
