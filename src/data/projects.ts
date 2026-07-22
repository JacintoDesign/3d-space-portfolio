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
    id: 'waypoint',
    title: 'Waypoint',
    sign: 'WAYPOINT',
    signJP: '航路',
    sub: '地図 · CHART ROOM',
    meta: 'Geospatial · Web App · 2026',
    tagline: 'Photo-forward travel guides on an interactive map.',
    description:
      'Editorial, photo-forward travel guides — authors pin places on an interactive map, attach photos, and publish curated guides to a public link.',
    tech: ['TypeScript', 'Next.js', 'Supabase', 'PostGIS', 'MapLibre'],
    image: '/images/waypoint.jpg',
    links: [
      { label: 'Live Site', href: 'https://ztm-waypoint.vercel.app' },
      { label: 'GitHub', href: 'https://github.com/JacintoDesign/waypoint' },
    ],
    color: '#39ff14',
  },
  {
    id: 'music-player',
    title: 'ZTM Music',
    sign: 'ZTM MUSIC',
    signJP: '音楽',
    sub: '音楽 · SOUND DOCK',
    meta: 'Audio · Web App · 2026',
    tagline: 'A streaming player rebuilt to portfolio grade.',
    description:
      'A rebuilt streaming player — queue, library, search and playback against a live music API, lifted to portfolio grade.',
    tech: ['TypeScript', 'React', 'Next.js'],
    image: '/images/music.jpg',
    links: [
      { label: 'Live Site', href: 'https://ztm-music.vercel.app' },
      { label: 'GitHub', href: 'https://github.com/JacintoDesign/ztm-music-player-v2' },
    ],
    color: '#b537f2',
  },
  {
    id: 'scoundrel',
    title: 'Scoundrel',
    sign: 'SCOUNDREL',
    signJP: '迷宮',
    sub: '遊戯 · ARCADE BAY',
    meta: 'Game · PWA · 2025',
    tagline: 'A roguelike dungeon crawl in a single deck of cards.',
    description:
      'A strategic single-player dungeon card game. Installable, fully offline, built to feel native on any device.',
    tech: ['JavaScript', 'PWA', 'Service Worker'],
    image: '/images/scoundrel.jpg',
    video: '/videos/scoundrel.mp4',
    links: [
      { label: 'Live Site', href: 'https://ztm-scoundrel-game.vercel.app' },
      { label: 'GitHub', href: 'https://github.com/JacintoDesign/scoundrel-game-pwa' },
    ],
    color: '#ff2a6d',
  },
  {
    id: 'recipes',
    title: 'Recipes App',
    sign: 'RECIPES',
    signJP: '台所',
    sub: '台所 · GALLEY',
    meta: 'Offline-First · PWA · 2025',
    tagline: 'Your kitchen companion — fast, searchable, offline-first.',
    description:
      'An installable recipe manager that works without a connection. Browse, search, and save recipes with cached assets and local persistence, wrapped in a clean, content-forward layout.',
    tech: ['TypeScript', 'PWA', 'Service Workers', 'IndexedDB'],
    video: '/videos/recipes.mp4',
    links: [
      { label: 'Live Site', href: 'https://ztm-recipe-app.vercel.app/' },
      { label: 'GitHub', href: 'https://github.com/JacintoDesign/recipe-app' },
    ],
    color: '#f9f871',
  },
]

export const projectById = (id: string) => PROJECTS.find((p) => p.id === id)
