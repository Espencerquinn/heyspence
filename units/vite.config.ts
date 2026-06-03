import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Builds to ./ (relative to /units/) so that the output sits at:
 *   heyspence.me/units/index.html
 *   heyspence.me/units/assets/*.js
 *
 * That mirrors how /ahs-online/ ships pre-built artifacts in the repo —
 * Netlify's root publish picks them up automatically.
 */
export default defineConfig({
  plugins: [react()],
  base: '/units/',
  build: {
    outDir: '.',
    emptyOutDir: false,
    sourcemap: false,
    rollupOptions: {
      output: {
        // Keep asset filenames hash-cached so old builds don't collide
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
  server: { port: 5180 },
})
