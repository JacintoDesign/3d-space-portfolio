export const STUDIO = {
  name: 'Jacinto Design',
  tagline: 'Interactive experiences, engineered at the edge of the map.',
  hero: 'Design-led. Engineering-true. Charting the dark.',
  email: 'contact@jacinto.design',
  about: {
    sign: 'ABOUT',
    /** Japanese blade-sign + station class label. */
    signJP: '本社',
    sub: '本社 · HOME STATION',
    color: '#05d9e8',
    heading: 'A studio of one at the intersection of design & code.',
    body: [
      'Jacinto Design is a one-person, design-led development studio building polished, interactive products for the web. I work where motion, type, and engineering meet — turning ambitious ideas into experiences that feel as good as they look.',
      'From installable games to real-time audio tools and offline-first apps, I obsess over the details most people never notice but always feel: the weight of a transition, the snap of an interaction, the calm of a system that just works.',
      'Built on a decade of shipping and teaching, I bring craft, performance, and a relentless bar for quality to every pixel and every line — out here in the dark between the stars.',
    ],
    stats: [
      { label: 'Years charting the web', value: '10+' },
      { label: 'Products launched', value: '25+' },
      { label: 'Coffee at 3am', value: '∞' },
    ],
  },
  contact: {
    sign: 'CONTACT',
    signJP: '通信',
    sub: '通信 · COMMS RELAY',
    color: '#ff2a6d',
    heading: "Let's build something unforgettable.",
    body: 'Have a project, a wild idea, or a derelict codebase that needs repairs? Open a channel — I read every transmission.',
  },
  socials: [
    { label: 'GitHub', href: 'https://github.com/JacintoDesign' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/jacintowong/' },
    { label: 'YouTube', href: 'https://www.youtube.com/@ZeroToMastery' },
  ],
} as const

/** FormSubmit AJAX endpoint. Activated on first real submission. */
export const FORMSUBMIT_ENDPOINT = `https://formsubmit.co/ajax/${STUDIO.email}`
