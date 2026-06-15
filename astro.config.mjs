// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// ─────────────────────────────────────────────────────────────────────────────
// GitHub Pages configuration
//
// This site is configured for a *project* page (served from a sub-path), e.g.
//   https://<your-username>.github.io/dev-portfolio/
//
// 1. Set `site` to "https://<your-username>.github.io".
// 2. Set `base` to "/<your-repo-name>" (must start with a slash, no trailing slash).
//
// If you deploy to a *user/organisation* page (https://<username>.github.io),
// set `base` to "/" (or remove it) and keep `site` as the root domain.
//
// Every internal link & asset in this project uses `import.meta.env.BASE_URL`,
// so changing `base` here is all you need.
// ─────────────────────────────────────────────────────────────────────────────

const SITE = 'https://bentj-01.github.io';
const BASE = '/dev-portfolio';

// https://astro.build/config
export default defineConfig({
  site: SITE,
  base: BASE,
  trailingSlash: 'ignore',
  integrations: [sitemap()],
  build: {
    format: 'directory',
  },
});
