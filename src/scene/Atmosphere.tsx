import { useGame } from '../store/useGame'

/**
 * Background colour + exponential fog, per zone. The nebula side is a deep
 * violet soup; the void beyond the portal is true black with thin, distant fog.
 * The Nebula backdrop opts out of fog so distant clouds stay vivid.
 */
export function Atmosphere() {
  const zone = useGame((s) => s.zone)
  const isVoid = zone === 'void'
  return (
    <>
      <color attach="background" args={[isVoid ? '#010102' : '#03040c']} />
      <fogExp2 attach="fog" args={isVoid ? ['#020208', 0.0022] : ['#0a0a24', 0.0046]} />
    </>
  )
}
