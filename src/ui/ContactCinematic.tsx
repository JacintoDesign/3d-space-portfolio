import { useState, type FormEvent } from 'react'
import { useGame } from '../store/useGame'
import { STUDIO, FORMSUBMIT_ENDPOINT } from '../data/studio'
import { MailIcon, SocialIcon } from './SocialIcons'

type Status = 'idle' | 'sending' | 'ok' | 'err'

/**
 * The Contact "page": like About, no station and no modal — the camera rides
 * the ship at warp while the comms form floats on the RIGHT side of the view.
 */
export function ContactCinematic() {
  const mode = useGame((s) => s.mode)
  const closeContact = useGame((s) => s.closeContact)
  const [status, setStatus] = useState<Status>('idle')
  const { contact } = STUDIO

  if (mode !== 'contact') return null

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const data = new FormData(form)
    setStatus('sending')
    try {
      const res = await fetch(FORMSUBMIT_ENDPOINT, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: data,
      })
      if (!res.ok) throw new Error(String(res.status))
      setStatus('ok')
      form.reset()
    } catch {
      setStatus('err')
    }
  }

  return (
    <div className="about-cine right" role="dialog" aria-modal="true" aria-label="Contact Jacinto Design">
      <button className="icon-btn cine-close" onClick={closeContact} aria-label="Close">
        ✕
      </button>

      <div className="cine-copy">
        <p className="cine-eyebrow">
          <span className="tick" /> OPEN CHANNEL · 通信
        </p>
        <h2>{contact.heading}</h2>
        <p className="cine-body" style={{ animationDelay: '0.35s' }}>
          {contact.body}
        </p>

        {status === 'ok' ? (
          <p className="form-status ok">Message sent — thank you. I&apos;ll be in touch soon. ✦</p>
        ) : (
          <form className="form cine-form" onSubmit={onSubmit} style={{ animationDelay: '0.6s' }}>
            {/* FormSubmit config */}
            <input type="hidden" name="_subject" value="New message from jacinto.design portfolio" />
            <input type="text" name="_honey" style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />
            <input type="hidden" name="_template" value="table" />

            <div>
              <label htmlFor="name">Name</label>
              <input id="name" name="name" type="text" required placeholder="Your name" />
            </div>
            <div>
              <label htmlFor="email">Email</label>
              <input id="email" name="email" type="email" required placeholder="you@studio.com" />
            </div>
            <div>
              <label htmlFor="message">Message</label>
              <textarea id="message" name="message" required placeholder="Tell me about your project…" />
            </div>

            {status === 'err' && (
              <p className="form-status err">Something went wrong. Email me directly at {STUDIO.email}.</p>
            )}

            <button className="btn" type="submit" disabled={status === 'sending'} style={{ justifyContent: 'center' }}>
              {status === 'sending' ? 'Transmitting…' : 'Send Transmission'}
            </button>
          </form>
        )}

        <a className="socials-mail" href={`mailto:${STUDIO.email}`}>
          <MailIcon className="mail-ic" /> {STUDIO.email}
        </a>

        {/* social channels — icon row */}
        <div className="socials-icons">
          {STUDIO.socials.map((s) => (
            <a
              key={s.label}
              className="social-icon"
              href={s.href}
              target="_blank"
              rel="noreferrer"
              aria-label={s.label}
              title={s.label}
            >
              <SocialIcon label={s.label} />
            </a>
          ))}
        </div>
        <p className="cine-loc">◈ {STUDIO.location}</p>

        <p className="cine-hint">ESC — return to the stick</p>
      </div>
    </div>
  )
}
