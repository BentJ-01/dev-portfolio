# Bent Jacobs - Developer Portfolio

A fast, accessible single-page developer portfolio built with **[Astro](https://astro.build/)**
and **TypeScript**, deployed to **GitHub Pages** with CI/CD.

Positioned for three kinds of roles at once - **Salesforce**, **full-stack software**, and
**AI** development - with content ordered so each hiring manager finds what they care about fast.

- ⚡ Near-zero client JS (islands only where needed)
- 🎨 Dark/light theme with system preference + no-flash loading
- ♿ Accessible: keyboard nav, visible focus, skip link, `prefers-reduced-motion`
- 🔍 SEO: meta, Open Graph, JSON-LD, sitemap
- 🚴 A hidden cycling easter egg (try the Konami code)

---

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Run the dev server  →  http://localhost:4321/dev-portfolio
npm run dev

# 3. Production build  →  ./dist
npm run build

# 4. Preview the production build locally
npm run preview
```

> Requires Node.js 18.20+, 20.3+ or 22+ (Astro 5).

---

## Editing content

**All content lives in one typed file: [`src/data/portfolio.ts`](src/data/portfolio.ts).**
Edit the hero, about, skills, experience, projects, certifications, education and contact
data there and it flows through every component - no need to touch the markup.

### Add your photo and CV

| Asset | Where it goes | Notes |
| ----- | ------------- | ----- |
| Portrait | `public/images/bent.jpg` | Square-ish (~800×950). Until it exists, the hero shows a styled placeholder. |
| CV | `public/cv/Bent-Jacobs-CV.pdf` | Linked from the hero "Download CV" button. |
| OG image | `public/images/og-image.svg` | A placeholder is provided; swap it if you like. |

To change any path, edit the matching field in `src/data/portfolio.ts`.

---

## Deploying to GitHub Pages

This project is preconfigured for a **project page** (served from a sub-path, e.g.
`https://<username>.github.io/<repo>/`).

### 1. Set your repo name / base path

Open [`astro.config.mjs`](astro.config.mjs) and update two constants:

```js
const SITE = 'https://<your-username>.github.io'; // your GitHub Pages origin
const BASE = '/<your-repo-name>';                 // e.g. '/dev-portfolio'
```

Every internal link and asset uses `import.meta.env.BASE_URL`, so changing `BASE`
is all that's required for paths to resolve correctly.

> **User/organisation page?** If your repo is named `<username>.github.io`, set
> `BASE = '/'` (or remove it) and keep `SITE` as the root domain.

Also update `site.url` in `src/data/portfolio.ts` (used for canonical/OG URLs).

### 2. Push to GitHub

```bash
git init
git add .
git commit -m "Initial portfolio"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo-name>.git
git push -u origin main
```

### 3. Enable Pages → GitHub Actions

In your repo: **Settings → Pages → Build and deployment → Source → "GitHub Actions"**.

The included workflow at [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)
(using the official `withastro/action`) builds and deploys on every push to `main`.
Watch progress under the **Actions** tab; your site goes live at
`https://<username>.github.io/<repo>/`.

---

## Project structure

```
├─ astro.config.mjs        # site + base path, sitemap integration
├─ public/                 # static assets (favicon, OG image, photo, CV)
├─ src/
│  ├─ data/portfolio.ts    # ← all content, typed, single source of truth
│  ├─ layouts/Layout.astro # <head>, meta/OG/JSON-LD, fonts, theme bootstrap
│  ├─ components/          # Nav, Hero, About, Skills, Experience, Projects,
│  │                       #   Certifications, Education, Contact, Footer,
│  │                       #   ThemeToggle, Icon, SectionHeading, EasterEgg
│  ├─ pages/index.astro    # assembles the single page + scroll-reveal
│  └─ styles/global.css     # design tokens + base styles
└─ .github/workflows/deploy.yml
```

---

## Easter egg 🚴

Enter the **Konami code** - ↑ ↑ ↓ ↓ ← → ← → B A - or click the little bike icon in the
footer to send a cyclist across the screen with a Strava-style "KOM unlocked" toast.
Lightweight, accessible and reduced-motion friendly.

---

## Tech

Astro · TypeScript · scoped component CSS with custom-property design tokens ·
`@astrojs/sitemap` · GitHub Actions. No heavy UI framework.
