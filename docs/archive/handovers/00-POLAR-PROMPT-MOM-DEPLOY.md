# Polar prompt — Vercel deploy for mom-launch (5 steps)

Hey — taking Compass from "verified-deploy-ready in sandbox" to "live at `compass-mom.vercel.app`, mom can log in, mom can install the PWA on her phone, mom can see her seeded financial data."

## What this is, in one paragraph

An operator-only workflow (no code changes, no agent session needed). Five steps, ~25 minutes end-to-end (most of which is waiting on Vercel + Neon). Every verification gate is automated (`smoke:deploy` is already at 145/0; the prod-env validator catches the standard misconfigs). The repo is at `github.com/zarasus37/compass`, last commit is `e2b7f8c`. No code changes are required — this is purely config + clicks.

## Constraints (don't deviate)

- **Single-user (D7).** Mom is the only user. No signup flow. `pnpm seed:admin` (run during the Vercel build command) creates her account with `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME`.
- **Vault is v1.1+ deferred.** Per user direction 2026-09-22, do NOT set `VAULT_*` or `SPRITZ_*` env vars. The `/vault` page will render an honest "vault env pending" banner. The validator used to refuse to boot without them; that was fixed in `e5dd483` (Cluster 7.29.1).
- **Don't email the password.** Text or call mom with the password separately. Email is the #1 attack vector for compromised accounts; the URL is fine to share via email because it's public anyway.
- **Free tier only.** Vercel Hobby (free) + Neon Free tier handles mom's single-user workload indefinitely.
- **`pnpm build` is the contract**, not `pnpm dev`. The prod build is verified; the dev server in this repo's sandbox has historically been flaky (Cluster 7.15.1) — irrelevant for Vercel since Vercel only runs the prod build.

## Pre-flight: the verifiable state

```bash
cd /path/to/compass
git log -1 --format='%h %s'   # expect: e2b7f8c docs(runbook): Step 7.5 — install Compass on mom's phone (PWA)
git status                     # expect: nothing to commit, working tree clean
git remote -v                  # expect: origin https://github.com/zarasus37/compass.git
node_modules/.bin/tsc --noEmit # expect: clean (no output)
node tests/smoke-deploy.mjs    # expect: 145 pass / 0 miss, ALL GREEN
node tests/smoke-prod-env.mjs  # expect: 9 pass / 0 miss, ALL GREEN
```

If any of the above fail, **stop** — the deploy contract isn't met. Surface what failed before pushing more changes.

---

## Step 1 — Push / confirm the repo (1 min)

The repo is on `github.com/zarasus37/compass`. The remote URL already has a GitHub PAT embedded. If you're starting from the sandbox clone:

```bash
git remote -v   # confirm: origin https://github.com/zarasus37/compass.git
git log -1 --format='%h'
# if origin is missing, set it:
git remote add origin https://<YOUR_PAT>@github.com/zarasus37/compass.git
```

If working tree is dirty:

```bash
git status              # see what's uncommitted
git add -A              # or cherry-pick specific files
git commit -m "wip: pre-deploy cleanup"
git push -u origin main
```

Verification: `git status` reports `nothing to commit, working tree clean`. `git log --oneline -3` shows the runbook Step 7.5 commit at the head.

---

## Step 2 — Provision a Neon Postgres (5 min)

Neon is the managed Postgres Vercel talks to. Free tier handles mom forever.

1. Open `https://console.neon.tech/sign-up`. **Sign in with GitHub** (fastest OAuth path; the user already has a GitHub account).
2. Create a new project:
   - **Project name**: `compass-mom` (or whatever you want, doesn't matter)
   - **Region**: `us-east-1 (Virginia)` — matches Vercel's default edge layer
   - **Postgres version**: 16 (or whatever Neon defaults to; the repo's Prisma schema targets PG 15+)
3. After project creation, open **Dashboard → Connection Details → Pooled connection**. Copy the connection string.
4. **Critical**: the URL MUST end with `?sslmode=require`. The prod-env validator (`src/lib/env/prod.ts`, step 1b) refuses to boot without it. If your snippet is missing it, append it manually:

```
postgresql://neondb_owner:<password>@ep-<name>-<id>.us-east-1.aws.neon.tech/compass?sslmode=require
```

5. **Don't** use the `direct` connection (non-pooled) for Vercel — pooled is what serverless functions need.

Save this string — you'll paste it into Vercel in Step 4 as `DATABASE_URL`.

---

## Step 3 — Connect Vercel to the repo (10 min)

Vercel hosts the Next.js app and runs the build pipeline.

1. Open `https://vercel.com/new`. Sign in via GitHub.
2. **Import Git Repository** → search for `zarasus37/compass` → click **Import**.
3. Configure the project (the import screen):
   - **Project Name**: `compass-mom` (becomes `compass-mom.vercel.app`)
   - **Framework Preset**: Next.js (auto-detected, leave it)
   - **Root Directory**: `./` (default)
   - **Build Command override** (CRITICAL): clear the auto-detected value and paste this exact line:
     ```
     pnpm prisma migrate deploy && pnpm seed:admin && pnpm build
     ```
     This runs `prisma migrate deploy` against `DATABASE_URL` (applies all pending migrations to Neon), then `seed:admin` (creates mom with the env-var credentials), then `next build` (compiles the Next.js prod bundle). Each step's failure surfaces clearly in the build log.
   - **Output Directory**: `.next` (default — leave it)
   - **Install Command**: `pnpm install` (default)
   - **Node Version**: 22.x (Vercel default is fine; if you want to pin, set it in the project settings → General → Node.js Version)
4. **Do NOT click Deploy yet.** Env vars come first.

---

## Step 4 — Paste the env vars (3 min)

Vercel project → **Settings → Environment Variables**. Add each var, scope **Production**:

| Key | Value | Notes |
|---|---|---|
| `DATABASE_URL` | (from Step 2) | MUST contain `?sslmode=require` |
| `MAVIS_API_BASE` | `https://api.minimax.io/v1` |  |
| `MAVIS_API_KEY` | (your Mavis account key) | **NOT** the leaked `sk-api-kkrA3L7…` dev key from `.env.local` — get a fresh prod key from your Mavis dashboard |
| `MAVIS_MODEL` | `MiniMax-M3` |  |
| `MAVIS_TOOL_FORMAT` | `openai` |  |
| `LLM_PROVIDER` | `mock` | smoke fallback path (separate from advisor) |
| `LLM_PROVIDER_ADVISOR` | `ollama` | or `mavis` if you want onboarding + advisor on the same model |
| `SESSION_SECRET` | (generate — see below) | 64 bytes hex |
| `ADMIN_EMAIL` | `mom@xkryptic.com` | change to mom's actual email |
| `ADMIN_NAME` | `Mom` |  |
| `ADMIN_PASSWORD` | (generate — see below) | 32 bytes base64url; given to mom verbally, NOT by email |

Generate the two secrets (run locally, paste into Vercel — never commit these):

```bash
# SESSION_SECRET — 64 bytes hex
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# ADMIN_PASSWORD — 32 bytes base64url (pronounceable, copy-paste friendly)
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

**Do NOT set these for mom-launch** (vault + Spritz are v1.1+, deferred):
- `VAULT_CHAIN_ID`, `VAULT_CHAIN_RPC_URL`, `VAULT_SAFE_SINGLETON_ADDRESS`, `VAULT_USDC_ADDRESS`, `VAULT_AAVE_POOL_ADDRESS`
- `VAULT_SIGNER_KEY`
- `SPRITZ_INTEGRATION_KEY`, `SPRITZ_SANDBOX`

If these stay unset, the app boots fine. The validator (`src/lib/env/prod.ts`) treats them as runtime-only, not boot-required (Cluster 7.29.1 fix). The `/vault` route returns an honest "vault env pending" banner.

**Optional — skip for v1**:
- `CRON_SECRET` — only if you set up an external scheduler. `vercel.json` already wires `audit-log-prune` (03:00) and `vault` (04:00) via Vercel Cron.
- `CRON_ALERT_WEBHOOK_URL` — only if you set up Sentry / PagerDuty.
- `RESEND_API_KEY` — only if you build email-based password reset (v1.1+).

Verify after pasting: Vercel shows 11 env vars in the Production scope, none of them with a placeholder or the literal `CHANGE_ME` string.

---

## Step 5 — Deploy & verify (10 min, mostly waiting)

1. Click **Deploy** in the Vercel import screen.
2. **Watch the build log** (Vercel shows it in the UI). Expected sequence:
   - `pnpm install` (≈30s)
   - `pnpm prisma migrate deploy` (≈5s — applies all pending migrations to your Neon DB; should print `3 migrations already applied` since the repo's `prisma/migrations/` directory is part of the deploy)
   - `pnpm seed:admin` (≈1s — creates mom with the env-var credentials; idempotent so re-deploys don't break)
   - `pnpm build` (≈90s — `prisma generate` is part of the script chain; Next.js compile + type-check)
3. When build goes green, Vercel assigns a URL — typically `https://compass-mom.vercel.app`. Click it.
4. Run the **smoke contract** (paste these into a terminal):

```bash
URL="https://compass-mom.vercel.app"

# 1. Health: must be ok, db.migrationStatus="current", env.ok=true
curl -s "$URL/api/health" | python3 -m json.tool

# 2. PWA manifest
curl -s "$URL/manifest.json" | python3 -c "import json,sys; m=json.load(sys.stdin); print('name:', m['name']); print('icons:', len(m['icons']))"

# 3. Service worker reachable
curl -sI "$URL/sw.js" | head -1
```

Expected: health says `status: "ok"`, manifest returns the compass name + ≥3 icons, sw.js returns `200 OK`.

5. **PWA install test** (on your own phone first):
   - **iPhone Safari**: open `$URL`, then Share → Add to Home Screen. Confirm icon installs and launches into a standalone window (no Safari chrome).
   - **Android Chrome**: open `$URL`. A small "Install Compass" chip appears at the bottom-right. Tap → confirm → icon lands in app drawer.
6. **Hand off to mom**: text or call her with the URL + password. **Never** email the password. Step 7 in the runbook (`00-MOM-LAUNCH-RUNBOOK.md`) covers the install script you'll walk her through.

---

## Verification gates

- [ ] **Step 1**: `git log -1` shows `e2b7f8c` or later. `git status` clean.
- [ ] **Step 2**: Neon project exists. `DATABASE_URL` ends with `?sslmode=require`.
- [ ] **Step 3**: Vercel project `compass-mom` linked. **Build Command** overridden to the full `pnpm prisma migrate deploy && pnpm seed:admin && pnpm build` line.
- [ ] **Step 4**: 11 env vars set in Production. No literal `CHANGE_ME`. `DATABASE_URL` has `sslmode=require`.
- [ ] **Step 5a**: Vercel build green (no red).
- [ ] **Step 5b**: `/api/health` returns `status: "ok"`, `db.ok: true`, `env.ok: true`.
- [ ] **Step 5c**: `/manifest.json` returns JSON with name + icons. `/sw.js` returns 200.
- [ ] **Step 5d**: PWA installs on your phone and launches into a standalone window.
- [ ] **Step 5e**: Mom can log in with the email + password you set.

---

## What if a gate fails

**Build fails on `prisma migrate deploy`**: usually `DATABASE_URL` wrong, DB unreachable, or SSL missing.
- Open Neon console → verify the project is awake (free-tier auto-suspends after 5 min idle — wake it before the build).
- Confirm the URL contains `?sslmode=require`.
- Confirm you used the **pooled** connection (host includes `-pooler` or is from the "Pooled connection" panel, not "Direct").

**Build fails on `seed:admin`**: usually `ADMIN_PASSWORD` too short (< 16 chars) or matches a weak pattern. `scripts/seed-admin.mjs` (the source of truth) refuses weak passwords. Generate a fresh one via the snippet.

**App boots but `/api/health` reports `db.ok: false`**: usually SSL or wrong DB URL. Re-check Step 2.

**PWA doesn't show "Add to Home Screen" on iOS**: you're in Chrome-on-iOS (Apple routes all iOS browsers through Safari, but the share sheet only surfaces "Add to Home Screen" if you start from Safari). Open in Safari.

**`/sw.js` returns 404**: this almost never happens; means the `public/sw.js` was not copied into the build. Re-deploy; if it persists, check `next.config.ts` for an override that excludes `public/`.

---

## Out of scope (do not do)

- Don't add `VAULT_*` env vars. Vault is v1.1+.
- Don't add a custom domain. `compass-mom.vercel.app` is sufficient for mom. Custom domains are Vercel project → Settings → Domains, do it after the first successful deploy.
- Don't switch framework preset. Next.js is correct.
- Don't move the Build Command into a separate script. The override is the contract.
- Don't use the **direct** Neon URL for `DATABASE_URL`. Serverless needs the pooled one.
- Don't run `pnpm dev` as the production server. Vercel only runs `next build` + `next start`.

---

## Reference

- Runbook (full): `00-MOM-LAUNCH-RUNBOOK.md` in repo. Steps 1–7.5 + Steps 6.5–6.10 verifications.
- Validator: `src/lib/env/prod.ts`. Reads the full set of REQUIRED + FORBIDDEN + FORBIDDEN_IN_PROD rules. Boot-blocker on misconfig.
- Seed: `scripts/seed-admin.mjs`. Idempotent. Refuses weak passwords in production.
- HANDOVER: `HANDOVER.md`. Session log, every cluster's commit chain, decision log, known limits.
- Validator audit smoke: `tests/smoke-prod-env.mjs` (9 boundary checks). Once Vercel is live you can run `node tests/smoke-prod-env.mjs` against prod env to re-confirm.
- PWA contract: `00-MOM-LAUNCH-RUNBOOK.md` Step 7.5 (`docs(runbook): Step 7.5` commit). iOS Safari Share Sheet path + Android Chrome auto-prompt path + "verify on your own phone" gate.

---

## Definition of done

Mom can open `https://compass-mom.vercel.app` on her phone, tap the home-screen icon (after PWA install), log in, and see her seeded dashboard. The `/vault` route shows an honest "vault env pending" banner. `/api/health` returns `status: "ok"`. The validator refuses any dev-stage misconfig if anyone tries to re-deploy with bad env.
