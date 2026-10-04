# Cluster 7.16 — Mom-ready / V1 launch

**Status**: 🚧 IN PROGRESS (session `mvs_5c23655691c34fe6abace1b8c67fdabc`, started 2026-09-06)
**Predecessor**: `eb0843b` (Cluster 7.14)
**Paused**: Cluster 7.15 spec is on disk (`00-CLUSTER-7.15-PAYMENT-HISTORY-SPARKLINE.md`); resume after mom is live. 7.15 is a quality-of-life feature for the audit log, not a blocker for launch.
**Goal**: Ship the existing app to xKryptic's mom on a public Vercel URL. She uses it as her day-to-day money surface. xKryptic continues developing on feature branches in parallel; merges to `main` are the manual gate to ship a new cluster to her.

---

## Why this cluster

Compass has been building feature-after-feature on localhost for the past month. Mom has never seen it. The 55-check `smoke:deploy` is green, the env contract is documented, the security headers are in place. **What's missing is the launch shape**: a PWA so she can install it on her phone, a way to provision her account without going through `/welcome` on a production DB, a password-recovery path, and a clear runbook for the Vercel + Neon + GitHub account work.

**Defer the vault to v1.1** — the Safe deployer wallet + Base mainnet ETH + Spritz sandbox is a real product surface but it's not what "single user, budgeting app" means. Mom uses envelopes / goals / recurring / debts / insights / calendar. The crypto layer is opt-in for her later.

## Parallel dev/prod model (the workflow)

- **`main` branch** = mom's deployed app on Vercel
- **Feature branches** = xKryptic's cluster work. Each push auto-creates a Vercel preview URL.
- **Merge `feature → main`** = ship a cluster to mom. Manual gate by xKryptic.
- **Vercel** auto-deploys `main` to production on every merge. No tags, no release branches.
- **xKryptic's local dev** = `pnpm dev` on `localhost:3000` against the Docker Postgres on `5433`. Unchanged.
- **Mom's data** = prod Postgres (Neon). Dev data on `5433` is for xKryptic's work.
- **Branch protection on `main`**: 1 required review (xKryptic reviewing his own merge is fine; the gate is "I clicked the button," not "someone else approved"). Optional: require smoke-deploy to be green on the preview.

This is the Vercel-native pattern. It works because Vercel gives you a preview URL per branch automatically; the only "ceremony" is the merge-to-main decision.

---

## Scope

### Files to add

- `public/manifest.json` — PWA manifest (name, short_name, theme_color, background_color, display: standalone, icons, start_url)
- `public/icon-192.png`, `public/icon-512.png`, `public/apple-touch-icon.png` — app icons (vessel-purple background + C monogram in gold)
- `public/sw.js` — service worker (cache app shell on install, network-first for navigations, cache-first for static)
- `src/components/pwa/ServiceWorkerRegistrar.tsx` — client component that registers the SW on first load; skipped in dev
- `src/components/pwa/InstallPrompt.tsx` — client component that surfaces the "Add to Home Screen" prompt on iOS Safari (Android Chrome handles it automatically)
- `scripts/seed-admin.mjs` — CLI that creates mom's account from `ADMIN_EMAIL` + `ADMIN_PASSWORD` + `ADMIN_NAME` env vars; idempotent; re-runnable on every deploy
- `scripts/reset-password.mjs` — CLI that resets a user's password from the command line; for xKryptic to call when mom forgets; takes email + new password as args
- `00-MOM-LAUNCH-RUNBOOK.md` — step-by-step for xKryptic to do the Vercel + Neon + GitHub account work

### Files to modify

- `src/app/layout.tsx` — add `<link rel="manifest">`, `<meta name="theme-color">`, `<link rel="apple-touch-icon">`, render `<ServiceWorkerRegistrar />` + `<InstallPrompt />`
- `package.json` — add scripts: `seed:admin`, `auth:reset-password`
- `.env.production.example` — add `ADMIN_EMAIL` + `ADMIN_NAME` to the required block (with placeholders), document `RESEND_API_KEY` as optional (for future password reset email flow)
- `tests/smoke-deploy.mjs` — extend with new checks: `manifest.json` present + has required fields, `sw.js` present, `icon-192.png` + `icon-512.png` present, `seed:admin` script in `package.json`, `ADMIN_EMAIL` listed in `.env.production.example`
- `src/app/(auth)/login/page.tsx` — minor copy: if `?reset=success` query param, show a one-line confirmation. No UI change to the form.

### Files NOT touched

- The `vault` page + chain — left in place; the cluster's `Ledger` chapter is in the sidebar but mom just won't tap it. Hidden for v1.1.
- `/welcome` (the signup flow) — works but is not the mom-launch path. Stays as the entry for any future second user.
- Prisma schema — no migration needed. `User` already has the fields we need.
- `src/middleware.ts` — already does the cookie check; nothing to add.
- Cron auth, health endpoint, security headers — already done in C-Vault 4.0.

---

## Spec details

### 1. PWA manifest (`public/manifest.json`)

```json
{
  "name": "Compass",
  "short_name": "Compass",
  "description": "Your money, guided.",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#16121e",
  "theme_color": "#a855f7",
  "orientation": "portrait",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

`start_url: "/"` so the app opens to the dashboard, not a deep link. `display: "standalone"` removes the browser chrome. The theme color (`#a855f7` vessel-purple) matches the D8 Sovereign Monad palette.

### 2. Icons

Three sizes generated with `image_synthesize`:
- `icon-192.png` — 192×192, vessel-purple background + gold "C" monogram, any-purposed
- `icon-512.png` — 512×512, same design, any-purposed
- `icon-maskable-512.png` — 512×512, same design with a 80px safe-zone around the monogram (for Android adaptive icons)
- `apple-touch-icon.png` — 180×180, same design (for iOS Add to Home Screen)

Design: vessel-purple (`#16121e`) background, antique gold (`#c9a45c` from the design system) for the "C" monogram in a thick geometric sans (Sora Bold would be the right face; rendered as a stylized C for the icon).

### 3. Service worker (`public/sw.js`)

Minimal v1:
- **install**: cache the app shell (`/`, `/login`, `/welcome`, the manifest, the icons, the SW itself)
- **fetch (navigations)**: network-first, fall back to cached shell on offline
- **fetch (static assets, next chunks, fonts)**: cache-first
- **activate**: clear old caches

Skip: push notifications, background sync, periodic sync, offline write-back. None of those are v1 surfaces.

### 4. Service worker registrar (`src/components/pwa/ServiceWorkerRegistrar.tsx`)

Client component. `useEffect` on mount, `if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js')`. No-op if `process.env.NODE_ENV !== 'production'` (dev hot-reload + the SW caching shell would mask Next.js dev errors).

### 5. Install prompt (`src/components/pwa/InstallPrompt.tsx`)

Client component. Detects:
- iOS Safari + `navigator.standalone !== true` (not yet installed) → show a 1-line floating tip at the bottom: `// tap share → Add to Home Screen`. Dismissible with ×. Saves the dismissal in `localStorage`.
- Android Chrome: `beforeinstallprompt` event → show a soft "Install Compass" button. Same dismiss logic.
- Desktop: no prompt.

Rendered in `app/layout.tsx` after the main content. Tailwind v4 + the design tokens.

### 6. Seed-admin (`scripts/seed-admin.mjs`)

```bash
ADMIN_EMAIL=mom@example.com ADMIN_NAME="Mom" ADMIN_PASSWORD=<random-32-bytes> pnpm seed:admin
```

Logic:
- Load `.env.local` or `.env.production` via `dotenv`
- Connect Prisma (same client the app uses, via `src/generated/prisma/client`)
- Check if any user with `ADMIN_EMAIL` exists; if yes, log "already provisioned" and exit 0 (idempotent)
- If no, hash `ADMIN_PASSWORD` with `@node-rs/argon2` (same params as `src/server/auth/password.ts`), `prisma.user.create`, log "created mom@example.com" + return the user id

Safety:
- Refuses to run if `NODE_ENV=production` AND `ADMIN_PASSWORD.length < 16` (no "password" or "mom123" nonsense)
- Refuses to run if no `--allow-seed` flag in prod (default: refuse; CI is dev)
- Logs a clear summary of what was/wasn't created

For the actual mom-launch, xKryptic sets `ADMIN_PASSWORD` in Vercel to a 32-byte random string he gives to mom verbally (or via SMS, NOT email). The Vercel build step calls `pnpm seed:admin` after `prisma migrate deploy`. Re-runs on every deploy are idempotent.

### 7. CLI password reset (`scripts/reset-password.mjs`)

```bash
pnpm auth:reset-password mom@example.com
# prompts for new password (or pass --password "<new>")
```

Logic:
- Load env, connect Prisma
- `findUnique({ where: { email } })`; 404 if not found
- Hash new password, `update({ where: { id }, data: { passwordHash } })`
- Invalidate all existing sessions for that user (delete from `Session` table) — force re-login on every device
- Log "reset for mom@example.com; 2 sessions invalidated"

This is xKryptic's recovery path. Mom calls, he runs the CLI, he tells her the new password verbally. Replaces a 3h Resend-integrated email flow that needs a domain + DKIM + transactional email setup. Pragmatic for one user.

### 8. Layout integration (`src/app/layout.tsx`)

Add to `<head>`:
```tsx
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="#a855f7" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="Compass" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
```

Add to body:
```tsx
<ServiceWorkerRegistrar />
<InstallPrompt />
```

The InstallPrompt is a no-op when the dismissal is in localStorage or when the app is already installed.

### 9. `package.json` scripts

```json
{
  "seed:admin": "node scripts/seed-admin.mjs",
  "auth:reset-password": "node scripts/reset-password.mjs"
}
```

### 10. `tests/smoke-deploy.mjs` extension (~10 new checks)

- `public/manifest.json` exists + has `name`, `short_name`, `start_url`, `display`, `theme_color`, `icons[].src`
- `public/icon-192.png` + `public/icon-512.png` + `public/apple-touch-icon.png` exist
- `public/sw.js` exists
- `src/components/pwa/ServiceWorkerRegistrar.tsx` exists
- `src/components/pwa/InstallPrompt.tsx` exists
- `package.json` has `seed:admin` + `auth:reset-password` scripts
- `app/layout.tsx` references `/manifest.json` + the theme color
- `.env.production.example` lists `ADMIN_EMAIL` (commented or required)
- The seed-admin script's first 20 lines include the `findUnique` idempotency check (source-level wire)

---

## What I'm NOT doing in this cluster

- **Vault** — Safe + Aave + Spritz is v1.1. The page is in the sidebar but mom doesn't tap it. Hiding it is a v1.1 polish.
- **Email-based password reset** — Resend + domain + DKIM is 3h for one user. The CLI reset covers the use case.
- **Uptime monitoring** — out-of-cluster (xKryptic sets up UptimeRobot in the runbook, 5 min).
- **Sentry / cron alert webhook** — optional; documented in the runbook.
- **Privacy / terms page** — v1.1. The "I built this, only you have access" disclosure is a follow-up.
- **A real migration history** — `prisma migrate dev --name init` once locally against a fresh DB, commit the migration. One-time task; documented in the runbook.
- **7.15 sparkline** — paused, resumes after mom is live.

---

## Acceptance

- [ ] `public/manifest.json` + 3 icons + `sw.js` ship
- [ ] Service worker registers on first prod load; `InstallPrompt` shows on iOS Safari / Android Chrome
- [ ] `pnpm seed:admin` creates mom's account; idempotent; refuses weak passwords in prod
- [ ] `pnpm auth:reset-password <email>` resets + invalidates sessions
- [ ] `app/layout.tsx` wires the manifest + theme color + apple-touch + registrar + install prompt
- [ ] `tests/smoke-deploy.mjs` extended; all 65+ checks green
- [ ] `pnpm tsc` clean
- [ ] `pnpm smoke:all` green (no regressions in the 1,800+ checks)
- [ ] Single commit on top of `eb0843b` as Cluster 7.16
- [ ] `00-MOM-LAUNCH-RUNBOOK.md` written; xKryptic can complete the Vercel + Neon + GitHub work in <30 min from it
- [ ] HANDOVER + COORDINATION "Last update" reflects Cluster 7.16 + the launch posture
- [ ] Memory three-question test (any new lesson worth saving?)

---

## Estimated time

~3h focused:
- 30 min: PWA manifest + icons + SW + layout
- 30 min: seed-admin CLI + reset-password CLI
- 30 min: smoke-deploy extension + verification
- 30 min: mobile QA pass
- 30 min: spec + runbook + commit + handoff update
- ~30 min: ship smokes + final check
