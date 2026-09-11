export interface ProjectLink {
  label: string
  href: string
}

export interface Project {
  id: string
  title: string
  /** Short neon-sign label shown on the station. */
  sign: string
  /** Japanese blade-sign glyphs (kana/kanji) for the cyberpunk signage. */
  signJP: string
  /** Station-class sub-label, e.g. "市場 · MARKET". */
  sub: string
  /** Card eyebrow meta, e.g. "Full-Stack · App · 2026". */
  meta: string
  tagline: string
  description: string
  tech: string[]
  /** Screenshot shown in the overlay + on the station holo screen. */
  image?: string
  /** Looping preview clip (muted, autoplay when docked). Falls back to the screenshot, then a procedural screen. */
  video?: string
  links: ProjectLink[]
  /** Neon accent color for this station's signage + lighting. */
  color: string
}

/**
 * Portfolio work for Jacinto Design — the real, deployed roster shared with
 * jacinto.design (portfolio v2). Each project is a floating station the player
 * can dock at; screenshots live in /public/images, demo clips in /public/videos.
 */
export const PROJECTS: Project[] = [
  {
    id: 'vibemail',
    title: 'VibeMail',
    sign: 'VIBEMAIL',
    signJP: '電郵',
    sub: '通信 · MAIL DECK',
    meta: 'Full-Stack · App · 2026',
    tagline: 'A full-stack email client with instant search.',
    description:
      'A full-stack email client in a frosted-glass, fully monospaced interface — virtualised threads, instant search, Supabase backend.',
    tech: ['TypeScript', 'Next.js', 'Supabase', 'PostgreSQL'],
    image: '/images/vibemail.jpg',
    links: [
      { label: 'Live Site', href: 'https://vibemail-fullstack.vercel.app/demo' },
      { label: 'GitHub', href: 'https://github.com/JacintoDesign/vibemail-fullstack' },
    ],
    color: '#05d9e8',
  },
  {
    id: 'astra',
    title: 'Astra',
    sign: 'ASTRA',
    signJP: '軌道',
    sub: '観測 · ORBIT DECK',
    meta: '3D · WebGL · 2026',
    tagline: 'A cinematic 3D orbital observatory.',
    description:
      'A cinematic 3D orbital observatory — a procedurally modeled habitat above a shader-generated planet, with camera tours and bloom.',
    tech: ['JavaScript', 'Three.js', 'Vite'],
    image: '/images/astra.jpg',
    links: [
      { label: 'Live Site', href: 'https://ztm-astra-station.vercel.app' },
      { label: 'GitHub', href: 'https://github.com/JacintoDesign/astra' },
    ],
    color: '#b537f2',
  },
  {
    id: 'mars',
    title: 'Mars Colony',
    sign: 'MARS',
    signJP: '火星',
    sub: '植民 · HABITAT BAY',
    meta: 'Game · Simulation · 2026',
    tagline: 'An isometric Mars colony with live logistics.',
    description:
      'An isometric Mars colony simulator — life support, mining and rover logistics against a continuous server-side simulation.',
    tech: ['TypeScript', 'Vite', 'Canvas', 'Supabase'],
    image: '/images/mars.jpg',
    links: [
      { label: 'Live Site', href: 'https://ztm-mars-colony.vercel.app' },
      { label: 'GitHub', href: 'https://github.com/JacintoDesign/ztm-mars-colony' },
    ],
    color: '#ff6a3d',
  },
  {
    id: 'cosmos',
    title: 'Cosmos',
    sign: 'COSMOS',
    signJP: '宇宙',
    sub: '星図 · SCAN DECK',
    meta: 'Dashboard · Web App · 2026',
    tagline: 'A quiet NASA observatory dashboard.',
    description:
      'A quiet NASA observatory dashboard — live APOD, near-Earth objects, space weather and ISS tracking in a glassmorphic interface.',
    tech: ['TypeScript', 'Next.js', 'MapLibre'],
    image: '/images/cosmos.jpg',
    links: [
      { label: 'Live Site', href: 'https://ztm-cosmos.vercel.app' },
      { label: 'GitHub', href: 'https://github.com/JacintoDesign/ztm-cosmos' },
    ],
    color: '#39ff14',
  },
  {
    id: 'periodical',
    title: 'Periodical',
    sign: 'PERIODICAL',
    signJP: '雑誌',
    sub: '刊行 · PRESS DECK',
    meta: 'Editorial · Magazine · 2026',
    tagline: 'A three-volume magazine on web history.',
    description:
      'A three-volume magazine on the history of web development — from the first server to AI-augmented engineering, with perspective page turns.',
    tech: ['HTML', 'CSS', 'JavaScript'],
    image: '/images/periodical.jpg',
    links: [
      { label: 'Live Site', href: 'https://jacintodesign.github.io/ztm-periodical/' },
      { label: 'GitHub', href: 'https://github.com/JacintoDesign/ztm-periodical' },
    ],
    color: '#f9f871',
  },
  {
    id: 'cube',
    title: 'Cube Lab',
    sign: 'CUBE LAB',
    signJP: '立方',
    sub: '実験 · CUBE BAY',
    meta: '3D · Playground · 2026',
    tagline: "A vanilla Three.js Rubik's Cube playground.",
    description:
      "A vanilla Three.js Rubik's Cube playground — drag layers to turn, scramble and solve, with 2–6 layer grids.",
    tech: ['JavaScript', 'Three.js'],
    image: '/images/cube.jpg',
    links: [
      { label: 'Live Site', href: 'https://jacintodesign.github.io/3d-rubiks-cube/' },
      { label: 'GitHub', href: 'https://github.com/JacintoDesign/3d-rubiks-cube' },
    ],
    color: '#ff2a6d',
  },
]

export const projectById = (id: string) => PROJECTS.find((p) => p.id === id)
