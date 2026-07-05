import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    // Single React + three instances across r3f / drei / postprocessing.
    dedupe: ['react', 'react-dom', 'three'],
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
        // React must not be in a separate interdependent chunk from r3f — that
        // causes "useLayoutEffect of undefined" when three loads before vendor.
        // Include drei's three-importing peers (maath, gainmap, …) so vendor
        // never circularly depends on the three chunk.
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (/[\\/]node_modules[\\/](react-dom|react|scheduler)([\\/]|$)/.test(id)) {
            return 'react'
          }
          if (
            /three|@react-three|postprocessing|meshoptimizer|maath|meshline|@monogrid|n8ao/.test(
              id,
            )
          ) {
            return 'three'
          }
          return 'vendor'
        },
      },
    },
  },
  assetsInclude: ['**/*.hdr'],
})
