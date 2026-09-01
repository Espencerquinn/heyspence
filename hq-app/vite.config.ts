import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Served at hq.heyspence.me on its own Cloudflare Pages project. Cloudflare
// builds from source (no build output is committed); output goes to the
// default `dist/` dir.
export default defineConfig({
  base: '/',
  plugins: [react()],
});
