# Next.js Project (Converted from Framer)

Exported from **https://www.buzzinga.studio/** using [Site2NextJS / Framer2NextJS](https://github.com).
Includes **1 page(s)** statically prerendered as Next.js App Router routes.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Run local development server
npm run dev
# Open http://localhost:3000

# 3. Production build
npm run build
npm start
```

## Features & Optimizations Included

- **100% Fidelity Static Route Handlers**: Served through App Router static route handlers (`app/<route>/route.ts`) preserving markup, styles, scripts, and hydration markers for instant client hydration.
- **Image Optimization**: Images are re-encoded to WebP and self-hosted under `public/assets/img/`.
- **Font Self-Hosting**: Web fonts downloaded locally to `public/assets/fonts/` with `font-display: swap` forced.
- **SEO & Accessibility**: Prioritized LCP hero image (`fetchpriority="high"`), added `lang="en"`, descriptive `title` tags for iframes, accessibility labels for icon links.
- **Asset Resolving**: Relative stylesheets and script references resolved to avoid broken links.
- **Zero Vendor Lock-in**: Deploy to **Vercel**, **Netlify**, or **Cloudflare Pages** in one click.
