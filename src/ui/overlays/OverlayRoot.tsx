import { useGame } from '../../store/useGame'
import { landmarkById } from '../../data/world'
import { projectById } from '../../data/projects'
import { ProjectOverlay } from './ProjectOverlay'

export function OverlayRoot() {
  const mode = useGame((s) => s.mode)
  const activeBuilding = useGame((s) => s.activeBuilding)

  if (mode !== 'overlay' || !activeBuilding) return null
  const landmark = landmarkById(activeBuilding)
  if (!landmark) return null

  const project = landmark.refId ? projectById(landmark.refId) : undefined
  if (!project) return null
  return <ProjectOverlay project={project} />
}
