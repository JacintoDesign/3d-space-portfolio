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
  tagline: string
  description: string
  tech: string[]
  /** Screenshot shown behind/while the video loads. */
  image: string
  /** Looping preview clip (muted, autoplay when docked). Falls back to a procedural screen. */
  video?: string
  links: ProjectLink[]
  /** Neon accent color for this station's signage + lighting. */
  color: string
}

/**
 * Portfolio work for Jacinto Design. Each project is a floating station the
 * player can dock at. The three "market" stations carry real shipped work with
 * live demos; the rest fall back to procedural holo-screens until clips are added
 * to /public/videos.
 */
export const PROJECTS: Project[] = [
  {
    id: 'scoundrel',
    title: 'Scoundrel',
    sign: 'SCOUNDREL',
    signJP: '迷宮',
    sub: '市場 · ARCADE BAY',
    tagline: 'A roguelike dungeon crawl in a single deck of cards.',
    description:
      'A strategic, installable card game where a standard 52-card deck becomes a dungeon. Fight monsters, wield weapons, and weigh every draw — built as a fully offline-capable PWA with persistent game state and a tactile, responsive UI.',
    tech: ['JavaScript', 'PWA', 'Service Workers', 'CSS Animations', 'HTML5'],
    image: '/images/scoundrel.jpg',
    video: '/videos/scoundrel.mp4',
    links: [
      { label: 'Launch Demo', href: 'https://ztm-scoundrel-game.vercel.app/' },
      { label: 'View Code', href: 'https://github.com/JacintoDesign/scoundrel-game-pwa' },
    ],
    color: '#ff2a6d',
  },
  {
    id: 'music-player',
    title: 'ZTM Music Player',
    sign: 'PLAYER',
    signJP: '音',
    sub: '市場 · SOUND DOCK',
    tagline: 'A streaming-style player with a live audio visualizer.',
    description:
      'A polished, Spotify-inspired music player featuring playlist management, smooth transport controls, and a real-time frequency visualizer driven by the Web Audio API rendered to canvas. Designed for a fluid, gesture-friendly listening experience.',
    tech: ['TypeScript', 'React', 'Web Audio API', 'Canvas', 'PWA'],
    image: '/images/music-player.jpg',
    video: '/videos/music-player.mp4',
    links: [
      { label: 'Launch Demo', href: 'https://ztm-music-player.vercel.app/' },
      { label: 'View Code', href: 'https://github.com/JacintoDesign/ztm-music-player' },
    ],
    color: '#05d9e8',
  },
  {
    id: 'recipes',
    title: 'Recipes App',
    sign: 'RECIPES',
    signJP: '台所',
    sub: '市場 · GALLEY',
    tagline: 'Your kitchen companion — fast, searchable, offline-first.',
    description:
      'An installable recipe manager that works without a connection. Browse, search, and save recipes with cached assets and local persistence, wrapped in a clean, content-forward layout that stays quick on any device.',
    tech: ['TypeScript', 'PWA', 'Service Workers', 'IndexedDB', 'HTML5'],
    image: '/images/recipes.jpg',
    video: '/videos/recipes.mp4',
    links: [
      { label: 'Launch Demo', href: 'https://ztm-recipe-app.vercel.app/' },
      { label: 'View Code', href: 'https://github.com/JacintoDesign/recipe-app' },
    ],
    color: '#f9f871',
  },
  {
    id: 'podcast',
    title: 'Podcast Player',
    sign: 'ON AIR',
    signJP: '放送',
    sub: '市場 · BROADCAST',
    tagline: 'An interactive podcast experience that travels with you.',
    description:
      'A progressive podcast player with episode browsing, resumable playback, and an audio engine tuned for spoken-word content. Installable and offline-aware so listeners never lose their place.',
    tech: ['TypeScript', 'Web Audio API', 'PWA'],
    image: '/images/podcast.jpg',
    video: '/videos/podcast.mp4',
    links: [{ label: 'View Code', href: 'https://github.com/JacintoDesign' }],
    color: '#b537f2',
  },
  {
    id: 'quotes',
    title: 'Quote Generator',
    sign: 'QUOTES',
    signJP: '言葉',
    sub: '市場 · SIGNAL',
    tagline: 'Fresh inspiration on demand, pulled live from an API.',
    description:
      'A crisp micro-app that fetches and serves random quotes from a REST API with instant copy and share. A study in doing one small thing beautifully — snappy, accessible, and zero-friction.',
    tech: ['JavaScript', 'REST API', 'Fetch', 'CSS'],
    image: '/images/quotes.jpg',
    video: '/videos/quotes.mp4',
    links: [{ label: 'View Code', href: 'https://github.com/JacintoDesign' }],
    color: '#39ff14',
  },
  {
    id: 'reaction',
    title: 'Reaction Game',
    sign: 'REACT!',
    signJP: '反射',
    sub: '市場 · TEST RANGE',
    tagline: 'How fast are you? A reflex test built for speed.',
    description:
      'A reaction-time game that measures split-second reflexes with precise timing, escalating difficulty, and a high-score loop that keeps players coming back. Lightweight, frame-accurate, and endlessly replayable.',
    tech: ['JavaScript', 'DOM', 'Game Loop', 'Local Storage'],
    image: '/images/reaction.jpg',
    video: '/videos/reaction.mp4',
    links: [{ label: 'View Code', href: 'https://github.com/JacintoDesign' }],
    color: '#ff7b00',
  },
]

export const projectById = (id: string) => PROJECTS.find((p) => p.id === id)
