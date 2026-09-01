// One-off generator for the PWA icons in `public/`. Renders an inline SVG —
// a cyan bracketed diamond glyph on the app's void ground, echoing the
// corner-bracket panel language used throughout the UI (see src/ui/system.css)
// — and rasterizes it with sharp. Re-run with `node scripts/make-icons.mjs`
// any time the icons need to be regenerated; nothing else depends on this
// script at build time.
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const VOID = '#04070f';
const CYAN = '#5ad8ff';

const outDir = fileURLToPath(new URL('../public', import.meta.url));
mkdirSync(outDir, { recursive: true });

// Corner brackets at the four canvas corners, inset by `inset`, each arm
// `arm` long, plus a diamond glyph centered in the remaining space.
function svg(size, { inset, arm, stroke, diamond }) {
  const c = size / 2;
  const x0 = inset;
  const y0 = inset;
  const x1 = size - inset;
  const y1 = size - inset;
  const brackets = `
    <path d="M ${x0} ${y0 + arm} L ${x0} ${y0} L ${x0 + arm} ${y0}" />
    <path d="M ${x1 - arm} ${y0} L ${x1} ${y0} L ${x1} ${y0 + arm}" />
    <path d="M ${x1} ${y1 - arm} L ${x1} ${y1} L ${x1 - arm} ${y1}" />
    <path d="M ${x0 + arm} ${y1} L ${x0} ${y1} L ${x0} ${y1 - arm}" />
  `;
  const d = diamond;
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${VOID}" />
  <g fill="none" stroke="${CYAN}" stroke-width="${stroke}" stroke-linecap="square">
    ${brackets}
  </g>
  <rect x="${c - d}" y="${c - d}" width="${d * 2}" height="${d * 2}"
        transform="rotate(45 ${c} ${c})"
        fill="none" stroke="${CYAN}" stroke-width="${stroke}" />
</svg>`;
}

async function render(name, size, opts) {
  const buf = Buffer.from(svg(size, opts));
  await sharp(buf).png().toFile(path.join(outDir, name));
  console.log(`wrote ${name} (${size}x${size})`);
}

// Standard icons: brackets near the edge, generous diamond.
await render('icon-192.png', 192, { inset: 16, arm: 40, stroke: 8, diamond: 52 });
await render('icon-512.png', 512, { inset: 42, arm: 106, stroke: 20, diamond: 138 });

// Maskable icon: ~20% safe-area padding on all sides, so the glyph survives
// aggressive OS masking (circle, squircle, etc). Keep brackets and diamond
// well inside the safe zone (the inner 60% of the canvas).
await render('icon-maskable.png', 512, { inset: 128, arm: 64, stroke: 18, diamond: 96 });
