import { useMemo } from 'react'
import { EffectComposer, Bloom, Vignette, ChromaticAberration, Noise } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'
import * as THREE from 'three'
import { useGame } from '../../store/useGame'

/**
 * Neon-noir post stack. Bloom does the heavy lifting (all signage, engines, rings
 * are emissive / toneMapped=false so they bloom into real light); chromatic
 * aberration + vignette + a whisper of grain finish the cyberpunk grade.
 */
export function Effects() {
  const isMobile = useGame((s) => s.isMobile)
  const caOffset = useMemo(() => new THREE.Vector2(0.0007, 0.0009), [])

  return (
    <EffectComposer multisampling={isMobile ? 0 : 4}>
      <Bloom
        intensity={isMobile ? 0.7 : 1.0}
        luminanceThreshold={0.18}
        luminanceSmoothing={0.9}
        mipmapBlur
        radius={0.8}
      />
      <ChromaticAberration
        blendFunction={BlendFunction.NORMAL}
        offset={caOffset}
        radialModulation={false}
        modulationOffset={0}
      />
      <Vignette eskil={false} offset={0.25} darkness={0.7} />
      <Noise premultiply blendFunction={BlendFunction.OVERLAY} opacity={isMobile ? 0.02 : 0.045} />
    </EffectComposer>
  )
}
