import { lazy, Suspense, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Bundled fonts: JetBrains Mono drives all Latin type (UI, HUD, neon signage);
// Noto Sans JP gives us authentic kana/kanji on the station blade-signs.
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'
import '@fontsource/jetbrains-mono/700.css'
import '@fontsource/jetbrains-mono/800.css'
import '@fontsource/noto-sans-jp/400.css'
import '@fontsource/noto-sans-jp/700.css'
import App from './App.tsx'
import './styles/index.css'

// Warm the font cache so the very first canvas-painted sign isn't a fallback glyph.
if (typeof document !== 'undefined' && document.fonts) {
  void Promise.allSettled([
    document.fonts.load('700 128px "JetBrains Mono"'),
    document.fonts.load('800 128px "JetBrains Mono"'),
    document.fonts.load('700 128px "Noto Sans JP"'),
  ])
}

const InspectionLab = import.meta.env.DEV && new URLSearchParams(window.location.search).has('station-lab')
  ? lazy(() => import('./dev/StationLab'))
  : import.meta.env.DEV && new URLSearchParams(window.location.search).has('combat-lab')
    ? lazy(() => import('./dev/CombatLab'))
    : null

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {InspectionLab ? <Suspense fallback={null}><InspectionLab /></Suspense> : <App />}
  </StrictMode>,
)
