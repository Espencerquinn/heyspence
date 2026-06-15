# heyspence.me Landing Page — Design Spec

**Date:** 2026-06-13
**Goal:** Turn the root of heyspence.me into a personal landing page that gives a prospective employer (currently applying to Anthropic, plus other AI/operator roles) a fast, strong first impression and a downloadable résumé.

## Context

- Static site at `/Users/quinnkb/Desktop/Dev Projects/heyspence.me`, repo `Espencerquinn/heyspence`, auto-deployed by Cloudflare Pages (`heyspenceq.pages.dev`) on push to `main`. Apex `heyspence.me` 301-redirects to `www.heyspence.me`.
- Replaces the current root `index.html` + `styles.css` ("digital workshop" placeholder).
- Source content: `Spencer Quinn Resume 2025 GTM Strategy & Operations, Special Projects.docx`.

## Decisions (locked)

- **Visual direction:** Dark / Builder. Background `#0c0d10`, light text, Inter for headings/body, a monospace accent for small terminal-style touches, single mint accent `#6ee7b7`.
- **Résumé:** convert the .docx to `resume.pdf` (via Microsoft Word), place at repo root, link as the primary download.
- **Contact links:** Email (espencer.quinn@gmail.com), LinkedIn (https://www.linkedin.com/in/spencer-quinn/), GitHub (github.com/Espencerquinn), Phone (480.403.1577).
- **AI framing:** subtle / general — "AI-native operator" positioning that resonates with Anthropic but stays reusable across applications. No hard-coded "Why Anthropic" section.

## Page structure (single static page, no build step)

1. **Hero** — name, small `whoami` terminal flourish, headline ("AI-native operator who builds the thing, then ships it"), ~2-line distilled summary, primary **Download résumé (PDF)** button + Email/LinkedIn/GitHub links.
2. **Metrics strip** — `$80M+` scaled · `$50M+` GMV · `33%` YoY · `15+ yrs`.
3. **What I do** — 3 cards: GTM Strategy & Ops · AI Product Development (agentic software, Claude Code) · RevOps & Financial Modeling.
4. **Experience highlights** — compact timeline of recent roles (CEO Merch Makers AI → Director, Biolite/Goal Zero → Sr. Ecommerce Mgr, Pattern → earlier), 1–2 metric bullets each; "full history → résumé PDF".
5. **Projects** — existing cards relinked to live sites: AHS Online → https://cf.americanheritageschool.org, Timpview Circle → https://timpviewcircle.com.
6. **Footer** — repeated contact links + copyright.

## Implementation notes

- Pure HTML + CSS in root `index.html` / `styles.css`. Responsive (mobile-first; stacks on narrow screens). No JS required; keep optional progressive enhancements minimal.
- Accessible: semantic landmarks, alt text, sufficient contrast on dark bg, focus styles on links/buttons.
- Set page `<title>` and meta description; add Open Graph tags so the link previews well when shared with recruiters.

## Out of scope (YAGNI)

- CMS, blog, analytics, contact form, animations beyond subtle hover/transition.
- Touching sub-projects (ahs-online, timpviewcircle-app, units) — only the root landing page changes.

## Deploy

- Build + preview locally, get approval, then commit & push to `main` (triggers Cloudflare Pages deploy). Push only on explicit go-ahead since it's public.
