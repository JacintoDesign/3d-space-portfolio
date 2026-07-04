import { Overlay } from './Overlay'
import type { Project } from '../../data/projects'

export function ProjectOverlay({ project }: { project: Project }) {
  return (
    <Overlay accent={project.color}>
      <p className="eyebrow">Selected Work</p>
      <h2>{project.title}</h2>
      <p className="tagline">{project.tagline}</p>
      <p>{project.description}</p>

      <div className="tech-row">
        {project.tech.map((t) => (
          <span className="chip" key={t}>
            {t}
          </span>
        ))}
      </div>

      <div className="btn-row">
        {project.links.map((l, i) => (
          <a className={`btn${i > 0 ? ' ghost' : ''}`} key={l.href} href={l.href} target="_blank" rel="noreferrer">
            {l.label} ↗
          </a>
        ))}
      </div>
    </Overlay>
  )
}
