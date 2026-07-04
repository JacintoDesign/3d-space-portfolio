import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    // Standard WebGL three. dedupe keeps a single three instance shared across
    // r3f / drei / postprocessing / three-stdlib.
    dedupe: ['three'],
  },
  build: {
    target: 'esnext',
    // three.js itself is ~1.05 MB and can't be split further; keep the warning
    // above it so it only fires if app/vendor code genuinely balloons.
    chunkSizeWarningLimit: 1150,
    rollupOptions: {
      output: {
        // Split the heavy, rarely-changing 3D stack into its own long-cached
        // chunk so app-code edits don't bust it (and the main chunk shrinks).
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (/three|postprocessing|meshoptimizer/.test(id)) return 'three'
            if (/@react-three/.test(id)) return 'r3f'
            return 'vendor'
          }
        },
      },
    },
  },
  assetsInclude: ['**/*.hdr'],
})
