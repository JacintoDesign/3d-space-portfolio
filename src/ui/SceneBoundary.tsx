import { Component, type ReactNode } from 'react'
import { STUDIO } from '../data/studio'
import { PROJECTS } from '../data/projects'

/** Cheap one-shot check: can this device create a WebGL context at all? */
function webglOK(): boolean {
  try {
    const c = document.createElement('canvas')
    return !!(
      window.WebGLRenderingContext &&
      (c.getContext('webgl') || c.getContext('experimental-webgl'))
    )
  } catch {
    return false
  }
}

/**
 * Static, no-3D fallback — a compact portfolio so the work is still reachable if
 * WebGL is unavailable or the scene throws. Doubles as graceful degradation on
 * old GPUs and locked-down browsers.
 */
function Fallback({ crashed }: { crashed?: boolean }) {
  return (
    <div className="scene-fallback">
      <div className="fb-inner">
        <p className="fb-eyebrow">電脳星雲 · NEBULA DRIFT</p>
        <h1>
          Jacinto <span className="accent">Design</span>
        </h1>
        <p className="fb-tag">{STUDIO.tagline}</p>
        <p className="fb-note">
          {crashed
            ? 'The 3D flight view hit a snag on this device — here’s the work directly.'
            : 'Your browser or GPU can’t start the 3D flight view — here’s the work directly.'}
        </p>

        <ul className="fb-projects">
          {PROJECTS.map((p) => (
            <li key={p.id}>
              <span className="fb-p-name">{p.sign}</span>
              <span className="fb-p-tag">{p.tagline}</span>
              <span className="fb-p-links">
                {p.links.map((l) => (
                  <a key={l.href} href={l.href} target="_blank" rel="noreferrer">
                    {l.label} ↗
                  </a>
                ))}
              </span>
            </li>
          ))}
        </ul>

        <div className="fb-contact">
          <a href={`mailto:${STUDIO.email}`}>{STUDIO.email}</a>
          {STUDIO.socials.map((s) => (
            <a key={s.label} href={s.href} target="_blank" rel="noreferrer">
              {s.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

interface Props {
  children: ReactNode
}
interface State {
  crashed: boolean
}

/**
 * Wraps the 3D Canvas. Renders the static Fallback if WebGL is unavailable up
 * front, or if anything in the scene throws at runtime (shader compile, context
 * loss surfaced as a render error, etc.) — never a blank black screen.
 */
export class SceneBoundary extends Component<Props, State> {
  state: State = { crashed: false }
  supported = webglOK()

  static getDerivedStateFromError(): State {
    return { crashed: true }
  }

  componentDidCatch(error: unknown) {
    if (import.meta.env.DEV) console.error('Scene crashed:', error)
  }

  render() {
    if (!this.supported) return <Fallback />
    if (this.state.crashed) return <Fallback crashed />
    return this.props.children
  }
}
