# Compass — Landing Page

> Static marketing site for Compass. Vanilla HTML / CSS / JS. No build step, no framework, no dependencies.

This is the **public-facing** surface that lives next to the app's source. The app itself (`/`) is for xKryptic's mom (and future users after the v1.1 launch). This page is the *front door* a visitor hits before signing in.

## What's in here

| File | Purpose |
|---|---|
| `index.html` | Single-page marketing site. Sections: nav, hero, manifesto, cockpit, plan, AI, voice, almanac, CTA. |
| `styles.css` | All styling. Component Oracle Terminal tokens (`--cosmos #060A12`, `--terminal-cyan #2DD4BF`, `--gold #C9A45C`, `--ok #4ADE80`, `--ink-3 #28404C`). Sora + JetBrains Mono via Google Fonts. |
| `script.js` | The net-worth ticker (auto-scroll, mock data) and a small `IntersectionObserver` reveal helper. No external dependencies. |

~99 KB total. No `<script src>` to a CDN. No tracking pixels. No fonts loaded from the landing (Google Fonts is the only network call).

## Important: `#waitlist` form has no backend

The "REQUEST ACCESS" CTA (`<form id="waitlist">` near the bottom of `index.html`) is **UI-only**. Submission currently does nothing visible — it does not POST anywhere, does not write to a database, does not send email.

If you wire it up, you have two options:

1. **Formspree / Netlify Forms / Buttondown** — point the form's `action` at a hosted endpoint. No backend code needed. Free tier covers most small sites.
2. **Compass itself** — add a `/api/waitlist` route under the app (`src/app/api/waitlist/route.ts`), point the form's `action` at `https://compass.example.com/api/waitlist`. Routes through the existing Postgres schema + auth.

The cleanest path is option 2 once Compass is publicly deployed — one source of truth, one auth model, one database. Don't ship to a third-party form service.

## Preview locally

```bash
# From the repo root, the simplest path:
npx serve compass-landing
# → http://localhost:3000
```

No install needed. The files are static.

## Deploy

The site is pure static. Any of these work:

- **Vercel** — `vercel deploy compass-landing --prod` (CLI) or import the directory in the dashboard. Build command: empty. Output directory: `.` (root). No env vars. Recommended: deploy as a separate Vercel project so the landing URL doesn't change when the app rebuilds.
- **Cloudflare Pages** — drag-and-drop the directory. No build. Workers not needed.
- **Netlify** — drag-and-drop, or `netlify deploy --dir compass-landing --prod`.
- **GitHub Pages** — works but requires the directory to be the repo root or a `gh-pages` branch with the right base path.

Custom domain: set the CNAME in your DNS provider to the platform's target.

## Design system alignment

The landing reuses the **Component Oracle Terminal** tokens from the app (D8 v5.0 → v6 Sovereign Monad transition kept the cosmos / cyan / gold tokens as the additive base — see `00-DESIGN.md` §0a and the migration notes in `COORDINATION.md`). When the app's vessel palette evolves, mirror the change here so the landing doesn't drift from the in-app voice.

The "v4.0" badge in the nav (`<span class="brand__ver">v4.0</span>`) tracks `00-DESIGN.md` version, not the app's git tag. Bump it when the spec's headline version moves.

## When to update this

- New marketing claim lands in the app → mirror here.
- Pricing page goes up → add a `pricing.html` next to `index.html`.
- Brand voice / tagline changes → update `<title>` + `<meta description>` + the hero `<h1>` (search engines cache these aggressively).
- Any new JS dependency that lands in `script.js` → audit the bundle size; the page should stay under 120 KB total.

## Ownership

Lives in this repo. No separate marketing-site repo, no separate Vercel project *yet* — both are operator decisions. See `HANDOVER.md` for the open question of whether to split this into a `compass-marketing/` repo.