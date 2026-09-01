import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Served as a subfolder of heyspence.me at /hq/. Build output is written to the
// repo-root `hq/` dir (committed, like /jobs and /units) and served by the root
// Netlify site.
export default defineConfig({
  base: '/hq/',
  plugins: [react()],
  build: { outDir: '../hq', emptyOutDir: true },
});
