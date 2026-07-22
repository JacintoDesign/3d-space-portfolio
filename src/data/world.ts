import { PROJECTS } from './projects'

export type LandmarkKind = 'project'

export interface Landmark {
  id: string
  kind: LandmarkKind
  /** Reference id into PROJECTS when kind === 'project'. */
  refId?: string
  /** Latin neon sign (used by HUD + 3D signage). */
  sign: string
  /** Japanese blade-sign glyphs. */
  signJP: string
  /** Station-class sub-label, e.g. "市場 · ARCADE BAY". */
  sub: string
  color: string
  /** World position of the station core. */
  position: [number, number, number]
  /** Station core radius — drives mesh scale and the dock trigger range. */
  radius: number
  /** Deterministic variety seed for procedural detailing. */
  seed: number
}

const p = (id: string) => {
  const proj = PROJECTS.find((x) => x.id === id)
  if (!proj) throw new Error(`world: unknown project ${id}`)
  return proj
}

function projectStation(
  id: string,
  position: [number, number, number],
  radius: number,
  seed: number,
): Landmark {
  const proj = p(id)
  return {
    id: proj.id,
    kind: 'project',
    refId: proj.id,
    sign: proj.sign,
    signJP: proj.signJP,
    sub: proj.sub,
    color: proj.color,
    position,
    radius,
    seed,
  }
}

/**
 * Flight corridor. The five project stations stagger left/right at varied depth +
 * height down a curving lane through the nebula, ordered like the portfolio grid
 * (VibeMail first). A derelict gateway-ring (see Sector) looms behind the lane
 * as the hero landmark. (About is not a station — it's the warp cinematic.)
 */
export const LANDMARKS: Landmark[] = [
  projectStation('vibemail', [-26, -2, -11], 5, 23),
  projectStation('waypoint', [29, 9, -42], 5, 37),
  projectStation('music-player', [-31, 3, -74], 5, 41),
  projectStation('scoundrel', [27, -9, -106], 5, 53),
  projectStation('recipes', [-29, 6, -138], 5, 67),
]

export const landmarkById = (id: string) => LANDMARKS.find((l) => l.id === id)

/** Spawn pose, soft play-volume, and dock trigger distance for the arcade flight model. */
export const WORLD = {
  /** Ship spawn position + the point it initially faces. */
  spawn: [0, 2, 49] as [number, number, number],
  lookAt: [0, 1, 16] as [number, number, number],
  /** Soft spherical boundary: outside this, the ship is gently eased back in. */
  bounds: {
    center: [0, 0, -78] as [number, number, number],
    radius: 186,
  },
  /** Within this distance of a station core, docking becomes available. */
  dockRange: 17,
  /** The hero gateway-ring that frames the far end of the lane. */
  gateway: {
    position: [0, 2, -164] as [number, number, number],
    radius: 46,
  },
}
