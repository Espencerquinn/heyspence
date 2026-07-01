import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Served as a subfolder of heyspence.me at /jobs/. Build output is written to
// the repo-root `jobs/` dir (committed, like /ahs-online and /units) and served
// by the root Netlify site.
// https://vite.dev/config/
export default defineConfig({
  base: '/jobs/',
  plugins: [react()],
  build: {
    outDir: '../jobs',
    emptyOutDir: true,
  },
})
