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

## Responsive layout and hydration

The home page uses mobile below 810px, tablet from 810px to below 1200px,
desktop from 1200px to below 2560px, and the large desktop layout from 2560px.
Website Curations shows the ₹60,000 streamlined build and the ₹90,000 custom
design/development package in every layout.

`app/route.ts` contains the exported HTML, styles, image sizes, and breakpoint
metadata. `public/assets/scripts/main.mjs` is the local hydration entry point;
it loads the patched `page.mjs`. Shared Framer vendor modules still load from
the original CDN. When refreshing the Framer export, preserve the 1200px
desktop threshold in both HTML and JavaScript and the custom card's tablet
variant (`S1yZrQufx`, Variant 5). Keep server and client changes together.

Run the browser regression check against a production build:

```bash
npx playwright install chromium
npm run build
npm start -- --port 3100
# In another terminal:
npm run test:responsive
# Or verify a deployed site:
TEST_BASE_URL=https://your-deployment.vercel.app npm run test:responsive
```

The check covers server rendering with JavaScript disabled, client hydration,
breakpoint boundaries, live resizing, pricing content, and card overflow.
