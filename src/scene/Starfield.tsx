import { Stars, Sparkles } from '@react-three/drei'
import { useGame } from '../store/useGame'

/**
 * Deep-field stars. In the nebula they're a soft twinkling layer behind the
 * clouds; in the void beyond the portal they become a vast, fine, distant
 * starfield — everything small and far, no big foreground glints.
 */
export function Starfield() {
  const isVoid = useGame((s) => s.zone === 'void')

  if (isVoid) {
    return (
      <Stars radius={480} depth={220} count={11000} factor={1.1} saturation={0} fade speed={0.15} />
    )
  }

  return (
    <>
      <Stars radius={340} depth={140} count={6500} factor={4} saturation={0} fade speed={0.4} />
      <Sparkles
        count={90}
        scale={[160, 70, 320]}
        position={[0, 0, -70]}
        size={3.5}
        speed={0.25}
        opacity={0.5}
        color="#9fe9ff"
      />
    </>
  )
}
