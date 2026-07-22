import { Overlay } from './Overlay'
import type { Project } from '../../data/projects'

/**
 * Docked project card, tuned for instant readability: big title, a hero
 * screenshot (demo clip when one exists), and two large actions — Live Site
 * and GitHub. Everything else is secondary.
 */
export function ProjectOverlay({ project }: { project: Project }) {
  return (
    <Overlay accent={project.color}>
      <p className="eyebrow">Selected Work · {project.meta}</p>
      <h2>{project.title}</h2>
      <p className="tagline">{project.tagline}</p>

      {(project.video || project.image) && (
        <div className="shot">
          {project.video ? (
            <video src={project.video} poster={project.image} autoPlay muted loop playsInline />
          ) : (
            <img src={project.image} alt={`${project.title} — screenshot`} />
          )}
        </div>
      )}

      <div className="btn-row big">
        {project.links.map((l, i) => (
          <a className={`btn${i > 0 ? ' ghost' : ''}`} key={l.href} href={l.href} target="_blank" rel="noreferrer">
            {l.label} ↗
          </a>
        ))}
      </div>

      <p className="desc">{project.description}</p>

      <div className="tech-row">
        {project.tech.map((t) => (
          <span className="chip" key={t}>
            {t}
          </span>
        ))}
      </div>
    </Overlay>
  )
}
