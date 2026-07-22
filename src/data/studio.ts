export const STUDIO = {
  name: 'Jacinto Design',
  tagline: 'Interactive experiences, engineered at the edge of the map.',
  hero: 'Design-led. Engineering-true. Charting the dark.',
  email: 'contact@jacinto.design',
  location: 'Toronto, Canada',
  about: {
    sign: 'ABOUT',
    /** Japanese blade-sign + station class label. */
    signJP: '本社',
    sub: '本社 · HOME STATION',
    color: '#05d9e8',
    heading: 'A self-taught developer making quality education accessible.',
    body: [
      'I’m Jacinto Wong — Senior Developer at the Canadian Broadcasting Corporation and instructor at Zero to Mastery, flying out of Toronto, Canada. The obsession started at age 12, when I built my first computer; as a self-taught developer I landed a senior role after just four months of online learning, so I know first-hand how daunting the jump into tech can be.',
      'At the CBC I build front-end that has to survive live air — election-night television programming and HTML graphics for the Olympics, running on national broadcasts with no second take.',
      'With five years of teaching experience across Canada and South Korea, I now create high-quality, affordable courses that help students build real portfolio projects and confidently transition into web development careers — quality education for everyone, regardless of background or budget.',
    ],
    stats: [
      { label: 'Years as senior developer', value: '8+' },
      { label: 'Years teaching developers', value: '5+' },
      { label: 'Projects created', value: '100+' },
    ],
    course: {
      label: 'Latest course',
      title: 'The Vibe Coding Bootcamp: Become an AI-Augmented Developer',
      blurb:
        'An AI-first path into tech — master tools like Cursor, Copilot, Claude and Gemini, direct your vision, build real projects, and create a job-ready portfolio. Live on Zero to Mastery.',
      url: 'https://zerotomastery.io/courses/learn-vibe-coding/',
      linkLabel: 'View the course',
    },
  },
  contact: {
    sign: 'CONTACT',
    signJP: '通信',
    sub: '通信 · COMMS RELAY',
    color: '#ff2a6d',
    heading: "Let's build something.",
    body: 'Have a project, a course idea, or just want to say hello? My inbox is always open — I read every transmission.',
  },
  socials: [
    { label: 'Website', href: 'https://jacinto.design' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/in/jacintowong/' },
    { label: 'GitHub', href: 'https://github.com/JacintoDesign' },
    { label: 'Medium', href: 'https://jacintowong.medium.com' },
    { label: 'CodePen', href: 'https://codepen.io/jacintodesign' },
  ],
} as const

/** FormSubmit AJAX endpoint. Activated on first real submission. */
export const FORMSUBMIT_ENDPOINT = `https://formsubmit.co/ajax/${STUDIO.email}`
