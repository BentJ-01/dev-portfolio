# Bent Jacobs — Developer Portfolio

- Built with Astro and TypeScript.
- Deployed to GitHub Pages.
- Content is stored in `src/data/portfolio.ts`.
- Includes light/dark themes and responsive layouts.

## Run locally

- Install dependencies: `npm install`
- Start development: `npm run dev`
- Build the site: `npm run build`
- Preview the build: `npm run preview`

Local URL: `http://localhost:4321/`

## Edit the site

- Content and project order: `src/data/portfolio.ts`
- Components and layouts: `src/components/`
- Global styles: `src/styles/global.css`
- Images: `public/images/`
- CV: `public/cv/Bent-Jacobs-CV.pdf`

## Deploy

- Check `SITE` and `BASE` in `astro.config.mjs`.
- Enable GitHub Pages with GitHub Actions as the source.
- Push to `main` to deploy through `.github/workflows/deploy.yml`.

## Notes

- Click the bike icon in the footer for the hidden Strava card.
- Replace the social preview image if needed.
