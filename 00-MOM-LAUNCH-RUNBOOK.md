# Mom Launch — Runbook for xKryptic

**Date**: 2026-09-06
**Cluster**: 7.16 (mom-ready / v1 launch)
**Predecessor**: `eb0843b` (Cluster 7.14)
**Goal**: Get Compass to a public Vercel URL that mom can open, log into, and use as her day-to-day money surface — while you keep developing on feature branches.

This runbook is for the **external account work** only. The code changes (PWA manifest, seed-admin CLI, password reset CLI, smoke-deploy extension) are in Cluster 7.16 and ship as a single commit on top of `eb0843b`.

---

## TL;DR — 30 min from zero to mom's URL

1. Push the repo to GitHub (5 min)
2. Create a Neon Postgres (5 min)
3. Create a Vercel project, link the repo, set env vars (10 min)
4. Generate the secrets, paste into Vercel (2 min)
5. Set the build command, deploy (5 min, mostly waiting)
6. Run `pnpm seed:admin` against the prod URL (1 min)
7. Open the URL, log in as mom, send her the credentials (2 min)

After this, you develop on feature branches. Each push auto-creates a preview URL. Merge to `main` to ship a cluster to mom. Your local `pnpm dev` is unchanged.

---

## Step 1 — Push the repo to GitHub (5 min)

If the repo is not on GitHub yet:

```bash
# in the workspace root
git init  # only if not already a repo
git add -A
git commit -m "Cluster 7.16: mom-ready v1 launch (PWA + seed-admin + CLI password reset)"
git branch -M main
gh repo create compass --private --source=. --remote=origin --push
```

If you prefer the GitHub web UI: create a private repo at https://github.com/new, name it `compass`, then:

```bash
git remote add origin git@github.com:<your-username>/compass.git
git push -u origin main
```

**Make it private.** Mom's financial data + the deploy env vars are not public.

---

## Step 2 — Create the Neon Postgres (5 min)

1. Sign up at https://neon.tech (free tier, GitHub login)
2. Create a new project: name `compass-mom`, region closest to your mom (US East / US West — pick the one that minimizes her latency)
3. Copy the **pooled** connection string (it'll look like `postgresql://<user>:<password>@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require`)
4. Save it. You'll paste it into Vercel in step 4.

**Do NOT use the direct connection string.** Neon's pooled string is what works with Vercel serverless. The direct string can be used for migrations from your local machine.

---

## Step 3 — Create the Vercel project (10 min)

1. Sign up at https://vercel.com (free tier, GitHub login)
2. **Add New Project** → import your `compass` repo
3. **Framework Preset**: Next.js (auto-detected)
4. **Root Directory**: `./` (the repo root)
5. **Build Command**: override to `pnpm prisma migrate deploy && pnpm seed:admin && pnpm build`
   - This runs migrations first (creates tables on the fresh Neon DB), then seeds mom's account, then builds Next.js.
6. **Output Directory**: leave default (`.next`)
7. **Install Command**: `pnpm install` (default)
8. **Environment Variables**: see Step 4

Don't deploy yet. Set the env vars first.

---

## Step 4 — Generate + paste the secrets (2 min)

Vercel project → Settings → Environment Variables. Add these (set them for **Production**; Vercel will offer to copy to Preview/Development after):

### Required — paste in order

| Key | Value | Notes |
|---|---|---|
| `NODE_ENV` | `production` | Vercel sets this automatically; explicit is safer |
| `DATABASE_URL` | (Neon pooled string from Step 2) | with `?sslmode=require` |
| `SESSION_SECRET` | (generate below) | 64-byte hex |
| `CRON_SECRET` | (generate below) | 32-byte hex |
| `MAVIS_API_KEY` | (your Mavis key) | Ask Mavis for the prod key, or use the one you have |
| `MAVIS_API_BASE` | `https://api.minimax.io/v1` | |
| `MAVIS_MODEL` | `MiniMax-M3` | |
| `MAVIS_TOOL_FORMAT` | `openai` | |
| `LLM_PROVIDER` | `mock` | for the smoke fallback path |
| `LLM_PROVIDER_ADVISOR` | `ollama` | or `mavis` if you want the same model as onboarding |
| `ADMIN_EMAIL` | `mom@example.com` | **change to mom's real email** |
| `ADMIN_NAME` | `Mom` | **change to her preferred name** |
| `ADMIN_PASSWORD` | (generate below) | 32-byte random; you give this to mom verbally, not by email |

### Generate the secrets

In a terminal:

```bash
# SESSION_SECRET (64 bytes hex)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# CRON_SECRET (32 bytes hex)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# ADMIN_PASSWORD (32 bytes hex; or any strong password you can read aloud)
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

### NOT required for v1 (vault is v1.1)

- `VAULT_CHAIN_ID`, `VAULT_CHAIN_RPC_URL`, `VAULT_SAFE_SINGLETON_ADDRESS`, `VAULT_USDC_ADDRESS`, `VAULT_AAVE_POOL_ADDRESS` — leave unset
- `VAULT_SIGNER_KEY` — leave unset
- `SPRITZ_INTEGRATION_KEY`, `SPRITZ_SANDBOX` — leave unset

The `src/lib/env/prod.ts` validator is fine with these being absent as long as you don't try to deploy a Safe.

### Optional but recommended

- `RESEND_API_KEY` — only if you build email-based password reset in v1.1. Skip for now.
- `CRON_ALERT_WEBHOOK_URL` — only if you set up Sentry. Skip for now.

---

## Step 5 — Deploy (5 min, mostly waiting)

Click **Deploy**. Vercel will:
1. Clone the repo
2. Run `pnpm install`
3. Run the build command you set: `pnpm prisma migrate deploy && pnpm seed:admin && pnpm build`
   - The `prisma migrate deploy` runs against `DATABASE_URL` and creates all tables
   - The `pnpm seed:admin` reads `ADMIN_EMAIL` + `ADMIN_NAME` + `ADMIN_PASSWORD` from the Vercel env and creates mom's user row
   - The `pnpm build` builds Next.js
4. Promote to production

If anything fails, check the build log. Most common failure: `DATABASE_URL` is wrong (typo, missing `?sslmode=require`, used the direct string instead of pooled).

After deploy, Vercel gives you a URL like `compass-mom.vercel.app`. **Open it.** You should see the login page.

**Optional custom domain**: Vercel project → Settings → Domains → add `compass.xkryptic.com` or whatever. Free with Vercel, automatic HTTPS.

---

## Step 6 — Verify (1 min)

From your local machine (or any browser):

```bash
# Health check — should return 200 with all 4 subsystems green
curl https://compass-mom.vercel.app/api/health | jq

# Manifest check — should return the PWA manifest
curl https://compass-mom.vercel.app/manifest.json | jq

# Service worker — should return the JS
curl https://compass-mom.vercel.app/sw.js | head
```

If `/api/health` returns 503 with `db.ok: false`, the `DATABASE_URL` is wrong or the migrations didn't run.

If everything is green, log in with mom's email + the `ADMIN_PASSWORD` you set in Vercel. You should land on the dashboard with empty data (envelopes, goals, bills — all empty until she runs through onboarding or you seed them).

### Step 6.5 — Populate mom's demo data (1 min)

Mom will land on a populated dashboard if you seed her demo data once. **Do this before sending her the URL** so she sees a real app on first open, not empty states.

Two options:

**A) Reset-to-seed via the UI (recommended)**:
1. After logging in as mom, click the gear icon (top-right) → **Settings**.
2. Scroll to the **Danger zone** section.
3. Click **Reset to seed data**. Confirm the modal.
4. You'll land back on the dashboard — it now shows 7 envelopes (Rent, Groceries, etc.), 6 canonical bills, 4 goals (Emergency + Invest), the allocation plan, and her financial identity.

**B) Hit the API directly** (if the UI button is hidden / you're scripting):
```bash
# After logging in once in the browser, the cookie is in your devtools.
# Export the session cookie then POST:
curl -X POST https://compass-mom.vercel.app/api/reset-seed \
  -H "Cookie: compass_session=<paste from devtools>"
```

The reset is idempotent — re-running replaces the seed rows (canonical 7 envelopes, 6 bills, 4 goals) with the same data. Any user-created rows in those tables are preserved (the reset only touches rows tagged `source="seed"`).

---

## Step 7 — Send mom the URL (2 min)

Two options:

**A) Text her the URL + a one-time password reveal** (most secure):
- SMS: "Your Compass app is live at https://compass-mom.vercel.app — I'll call you in 2 min with your password"
- Voice call: read the `ADMIN_PASSWORD` slowly, twice
- Tell her: "Open it on your phone. It'll say 'Add to Home Screen' — tap that. Then it's an app, not a website."

**B) Write it down** (for non-tech moms):
- A sticky note with the URL + password
- Mail it or hand-deliver
- Less secure but simpler

**Don't email the password.** Email is the #1 way accounts get compromised; the URL is fine (it's public anyway) but the password should go through a separate channel.

### Step 7.5 — Install Compass on mom's phone (1 min, one-time)

Compass is a PWA (Progressive Web App), not a native app. There is no App Store / Play Store entry — mom installs it from the browser, and it runs as a standalone app with its own icon, no browser chrome. Two paths, depending on her phone.

**On iPhone (Safari — most likely for mom)**:
1. Open `https://compass-mom.vercel.app` in **Safari** (not Chrome; iOS routes Chrome through Safari anyway, but starting in Safari is cleanest).
2. Log in once with her email + password so the install prompt's autofill / saved-password story works.
3. Tap the **Share** button (square with an arrow pointing up, bottom of the screen).
4. Scroll the share menu down, tap **Add to Home Screen**.
5. The icon is the compass glyph against `#060A12` background — confirm name is `Compass`, tap **Add**.
6. Home screen now shows `Compass`. Tap it → app opens in standalone window. No Safari URL bar, no "<back" button. Looks and feels like a native app.

**On Android (Chrome)**:
1. Open the URL in Chrome.
2. A small "Install Compass" chip appears at the bottom-right of the screen — tap it.
3. Confirm. The icon lands in her app drawer and home screen.

**Subsequent launches**: tap the home-screen icon → jumps straight to `/login` (session cookie persists for the session lifetime; she'll log in once per device unless she ticks "remember me" once that's wired — currently no remember-me, so it's "session cookie, log in once a day" on her phone, which is fine).

**Why this matters**: a PWA installed on a phone shows up in iOS Spotlight and Android app drawers. To mom it IS the app — no need to explain "go to the website in the browser" each time.

### Verify the install works in your own browser first

Before sending mom the URL:
1. Open `https://compass-mom.vercel.app` on your own phone (same path as Step 7.5).
2. Confirm the icon installs.
3. Confirm the standalone window loads `/dashboard` (or `/login` if she hasn't logged in yet).
4. If the share sheet doesn't show "Add to Home Screen", the manifest didn't wire up — check `curl https://compass-mom.vercel.app/manifest.json | jq` returns the manifest, and `curl -I https://compass-mom.vercel.app/sw.js` returns 200 with `content-type: application/javascript`.

This is the final test before handoff to mom. If your own phone installs and launches cleanly, mom's will too.

---

### Step 6.6 — Confirm the retention health banner (5 sec)

Mom can see "your data is being looked after" on the same settings page once she logs in. Cluster 7.19 added a `DATA · RETENTION` banner at the bottom of `/settings` (above the Danger zone) with three cells:

- **Retention window** — 90 days (live horizon, rolling)
- **Last prune** — when the audit-log retention cron last aggregated her older events into daily rollups. Renders `never` until the first nightly cron fires, then flips to `today`/`yesterday`/`N days ago`.
- **Vault scheduler** — when her vault auto-pay scheduler last ran + its status (SUCCESS / NO_BILLS / SKIPPED / ERROR).

If mom opens /settings and sees `[WARN] PENDING` on either cell, that's expected for the first ~24h after deploy (no real cron has run yet). The next nightly cron converts both to `[OK] HEALTHY` automatically. No operator action needed.

This is a read-only surface — there's no toggle here, no button to click. The banner just answers the "is Compass running scheduled work for me?" question in plain English so mom doesn't need to ask.

---

### Step 6.7 — Confirm the cash flow forecast card (5 sec)

Mom can see "what's my balance next month?" on her dashboard. Cluster 7.26 added a `// cash flow · 60d` card to `/dashboard` (and a compact 60-day chip to `/insights`) above the must-have tools strip. It shows:

- **Now vs N-day balance headline** — e.g. "$8,421 now / $8,747 in 60 days"
- **A line chart** of the projected balance over the next 60 days, with gold dots on pay-day and amber dots on bill-day
- **A buffer reference line** (gold dashed) at the sum of bills in the next 30 days
- **A "tight day" callout** when the projection dips below the buffer — "Tight day on Oct 23 (15d away, projected -$X)" — so mom can plan ahead
- **A pill** at the top: `[OK] HEALTHY`, `[WARN] TIGHT DAYS AHEAD`, or `[PENDING] ...`

Pending states render honestly (no fake projection):
- `[PENDING] NO PAY SCHEDULE` — mom hasn't added her pay schedule to `/accounts` yet. CTA links to `/accounts`.
- `[PENDING] NO ACCOUNT` — no checking account in `/accounts`. CTA links to `/accounts`.
- `[OK] NO BILLS TO PROJECT` — paychecks project cleanly but mom has no bills yet. CTA links to `/obligations?tab=bills`.

The card reads the same `PaySchedule` and `Bill` data mom already entered elsewhere, so there are no new fields to fill out — just verify she sees the card and the pill is one of the three states above.

---

### Step 6.8 — Confirm the quick-add transaction popover (5 sec)

Mom can log a transaction without navigating away from her current page. Cluster 7.27 added a `+` button to the right side of `TopAppBar` (between `Search` and the engine pill). Clicking it opens a small popover with three fields: amount (auto-focused), envelope dropdown, payee (optional).

To verify:
1. Log in as mom and look at the right side of the top bar.
2. Click the `+` button. The popover should drop down with the amount field ready for input.
3. Type `-5.42` (negative for a spend), pick an envelope, leave the payee blank (it'll default to "Quick log"), and press `Log`.
4. The popover should close, a brief `−$5.42 → {Envelope}` flash should appear under the `+` for ~2.5 seconds, and the dashboard's cash-flow card should re-render with the new bill (verify by scrolling to the cash-flow card and seeing the same transaction in the per-paycheck detail list).

If mom has no envelopes, the `+` becomes a plain link to `/envelopes` — no fake submit. If she clicks `Log` with an empty or zero amount, an inline error pill appears and the popover stays open.

The "Full form →" link routes to `/transactions/new` for the rare case where mom wants more fields (date picker, autopay, etc.). Both the popover and the full form write to the same `Transaction` table with `source="quick-add"` vs `source="user"` so future analytics can distinguish them.

---

### Step 6.9 — Confirm the sinking funds surface (10 sec)

Mom can save for known-but-irregular expenses inside an envelope. Cluster 7.28 added a "Sinking funds" section to each envelope's detail page (`/envelopes/[id]`) and inline sink labels under each envelope row on `/envelopes`. The first time mom visits `/envelopes`, 5 canonical sinks get seeded automatically (one per seedable envelope: `Groceries → Holiday food`, `Utilities → Annual subscription`, `Dining & Joy → Birthday gifts`, `Buffer → Annual deductible`, `Savings → Property tax`).

To verify:
1. Log in as mom and visit `/envelopes`. Each envelope row should show its sinks inline (Groceries, Utilities, Dining & Joy, Buffer, Savings all have 1 sink each; Rent and Debt have none — intentional, those aren't sinking-fund candidates).
2. Click into any seeded envelope (e.g. `/envelopes/<groceries-id>`). The new "Sinking funds" section should appear between the Cadence chart and the Activity section, listing the seeded sink(s) with target + cadence + monthly fill (`$300 / annual · $25/mo to fund by November`).
3. Try the inline "Add a sink" form at the bottom of that section: enter a name (`Emergency tires`), a target (`$600`), and pick a cadence (e.g. `annual`). Submit. The new row should appear in the list immediately. Use the "Delete" button on the row to remove it.

The math: a $300 annual sink needs `$25/mo` to fully fund by year-end. A $600 quarterly sink needs `$200/mo`. The UI shows this so mom has actionable guidance without doing the arithmetic.

If mom has zero envelopes, the seed has nothing to attach to (each sink needs an envelope). Add an envelope first via `/envelopes/new`.

### Step 6.10 — Confirm the spending trends card (10 sec)

The "Top expenses · last 30 days" card on `/insights` answers "where did my money go?" Cluster 7.29 added this card between the cash flow forecast (Step 6.7) and the 12-month Net Trajectory chart.

To verify:
1. Log in as mom and visit `/insights`.
2. Scroll past the allocation donut, the trajectory chart, and the 60-day cash flow card. The new card is the next section down.
3. The card has two ranked columns:
   - **By envelope** (left) — top 5 envelopes by spend, with planet color dots and per-row `amount · percent of total`.
   - **By payee** (right) — top 10 merchants by spend, with `transaction count · amount · percent of total`.
4. The header shows the window: `Today minus 29d → Today`, plus a total spent line (`−$X across N transactions`).
5. If mom hasn't logged any expenses in the last 30 days, the card renders the honest message **"No expenses logged in the last 30 days. Use the + button in the top bar, or visit /transactions to add one."** (with the + button highlighted in accent color). This is the expected first-run state.

The card reads directly from the `Transaction` table; every transaction mom logs (via `/transactions/new`, the TopAppBar `+` popover, or the Vault bills scheduler) appears here within a page refresh. The numbers are real — no fabricated totals.

If `pnpm smoke` is green, the card is wired correctly: 11 checks in `tests/smoke-spending-trends.mjs`.

This is the **final cluster of Tier 2**. With Step 6.7 (cash flow forecast), Step 6.8 (quick-add), Step 6.9 (sinking funds), and Step 6.10 (spending trends) all live, mom has the full `/insights` page: where money goes (past 30d ranking), where money is going (60d forecast), and where mom wants it to go (allocation donut + 12-month trajectory). Plus she can log a tx without leaving whatever page she's on.

---

## Step 8 — Set up the dev workflow (5 min)

Your local work is unchanged. To develop a new cluster:

```bash
git checkout -b 7.17-some-cluster
# ... do the work, commit, push
git push origin 7.17-some-cluster
# Vercel auto-creates a preview URL like https://compass-git-7-17-some-cluster-<user>.vercel.app
# Test in the preview URL. When you're ready to ship to mom:
git checkout main
git merge 7.17-some-cluster
git push origin main
# Vercel auto-deploys to https://compass-mom.vercel.app
```

The preview URL is xKryptic-only (Vercel default for non-main branches is "only people with the link can view," but it's still a public URL — don't put real data in it).

---

## Optional follow-ups (5-30 min each)

### Uptime monitoring (5 min, recommended)

1. Sign up at https://uptimerobot.com (free tier, 50 monitors)
2. Add a monitor: HTTPS, `https://compass-mom.vercel.app/api/health`, interval 5 min
3. Alert contacts: your email + SMS
4. Free tier = 50 monitors, 5-min interval, email + SMS alerts. Plenty.

If you want richer alerting: Sentry (free tier) for cron failures, set `CRON_ALERT_WEBHOOK_URL` in Vercel to the Sentry webhook URL.

### Branch protection on main (5 min, recommended)

GitHub repo → Settings → Branches → Add rule:
- Branch name pattern: `main`
- ☑ Require pull request before merging
- ☑ Require approvals: 1 (you reviewing your own PR is the gate)
- ☑ Require status checks: `tsc + smoke` (from `.github/workflows/ci.yml`)

This makes you click "merge" instead of `git push origin main`, which is a tiny ceremony but keeps you from accidentally shipping a broken cluster to mom.

### One-time migration history (10 min, recommended)

The dev DB is using `prisma db push` (no migration files). For prod, you want real migrations so future schema changes are diffs against a known state.

On your local machine:

```bash
# create a fresh DB (or use a temporary Neon branch)
DATABASE_URL="postgresql://..." pnpm prisma migrate dev --name init
git add prisma/migrations
git commit -m "chore: initial migration (the schema-as-snapshotted-by-db-push)"
git push origin main
# Vercel auto-runs `prisma migrate deploy` on the next build
```

This is a one-time task. After that, every schema change is a new migration file.

---

## Recovery / "mom can't log in" path

If mom forgets her password, calls you, you reset it from the command line:

```bash
# from the workspace root, against the prod DB
DATABASE_URL="<Neon pooled string>" pnpm auth:reset-password mom@example.com
# prompts: New password: ********
```

This:
1. Hashes the new password
2. Updates the user row
3. Invalidates all of mom's existing sessions (force re-login on every device)
4. Returns the user id so you can confirm

You give her the new password verbally. She logs in again. Total time: 2 min.

If mom is locked out AND you can't reach the terminal: Vercel has a one-click "open shell" for running scripts. Or you can do it from your local machine with the Neon connection string. Or you can use Neon's web SQL editor to manually update the `passwordHash` column (don't — the hash is argon2id, you can't compute it from a plaintext).

---

## When to ship a cluster to mom

You don't have to ship every cluster. Suggested cadence:

- **Ship when mom benefits** — 7.15 sparkline, 7.17 (whatever's next) might be internal quality-of-life, not user-facing
- **Ship visible-UI improvements** — anything mom would notice (new chart, new page, new tone in the design system)
- **Don't ship infra-only** — migrations, env var renames, internal refactors. Hold for a batch.

Recommended: ship once a month, or whenever there's a meaningful mom-visible change. Mom's URL stays stable, your dev velocity stays high.

---

## Cost summary (free tier, should be $0/month)

| Service | Tier | Cost |
|---|---|---|
| GitHub | Private repo | Free |
| Neon | Free (0.5 GB) | Free |
| Vercel | Hobby (100 GB-month bandwidth, serverless functions) | Free |
| UptimeRobot | Free (50 monitors) | Free |
| Mavis API | Pay-per-token | ~$1-5/month for mom's usage |
| Resend | Free (100 emails/day) | Free (only if you add email-based password reset) |

A one-user finance app is well within every free tier. Upgrade only if mom is doing thousands of AI categorizations a month.

---

## What this runbook is NOT

- Not a Vercel tutorial. If you get stuck on a Vercel step, the Vercel docs are good.
- Not a Neon tutorial. Same.
- Not a Git tutorial. Same.
- Not a 24/7 on-call playbook. Mom's app is not a business; you can fix things during business hours.

The runbook is the **mom-specific compass-launch sequence** — the minimum viable setup to get a working URL in your mom's hands.
