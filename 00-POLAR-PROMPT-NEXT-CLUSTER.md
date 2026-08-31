# Polar prompt — Compass next cluster

**What to do:** Open your Polar desktop app → its chat (the `polar-agent://` UI or wherever Composer lives) → paste the **POLAR PROMPT** below as a single message → wait for the answer → paste the response back to Mavis.

---

## POLAR PROMPT (paste this verbatim into Polar's chat)

```
You are advising on a personal-finance app called Compass, built for a non-technical user (xKryptic's mom). Stage 2 (creation) is mid-flight: 7.10 just shipped. The next cluster is open-ended — pick the single highest-value one to ship next, and justify briefly.

# Project snapshot
- Stack: Next.js 16 (App Router) + React 19 + TS strict + Tailwind v4 + Prisma 7 (Postgres) + Zod + shadcn/Base UI. Single-user (mom is the canonical seed), server-side sessions, argon2id.
- Postgres on localhost:5433 (Docker, NOT 5432 — Windows native PG18 owns 5432). `DATABASE_URL=postgresql://compass:compass@localhost:5433/compass_dev`.
- Design system: Sovereign Monad vessel (v6). Dark slate-purple canvas, neon purple accent, antique gold for "today/expected", system green for OK, vessel-over red for over-limit, vessel-watch orange for warnings. Sora for headings, JetBrains Mono for data. Terminal voice with `[OK]/[WARN]/[SIGIL]/[INDEXED]` markers. The 7 planetary vessels (Sol=Rent, Luna=Groceries, Mars=Buffer, Mercury=Utilities, Jupiter=Growth, Venus=Joy, Saturn=Debt) are preserved as semantic mapping.
- Quality bar is mom-grade. Type-safety end-to-end. Money math in integer cents.
- All 20 data-layer smokes + integration-vault 261 + smoke-deploy 102 = ~1,730 checks ALL GREEN. tsc clean.
- Dev server: not running in this fresh session — will need to start (Docker Desktop → `compass_dev_pg` container → `pnpm dev`).

# Just-shipped (7.10)
- Cron alert surface for audit log retention failures. New `vault.cron_prune_failure` action type, `src/lib/vault/audit-log-alerts.ts` (Sentry/PD/generic webhook auto-detect, 2s timeout, URL-masking), dev-only `/api/dev/cron-alerts` endpoint, optional `CRON_ALERT_WEBHOOK_URL` / `CRON_ALERT_PAGERDUTY_ROUTING_KEY` env. Pure infra; visible-UI payoff is "one more color in the audit page action-type column."

# Recent history (for context)
- 7.0–7.6 = audit log end-user surface, per-bill drill-down, SSE live updates, date range filter
- 7.7 = `?from=`/`?to=` URL contract on `/vault/audit`
- 7.8 = 90-day retention + 365-day year view
- 7.8.1 = nightly audit-log cron
- 7.8.2 = Vercel cron schedule (`vercel.json`)
- 7.9 = dimming test post-C7.8 fix
- 7.10 = above

# Candidate next clusters (from HANDOVER.md §"Next cluster" / §"What was NOT done")
A. Real-time live activity ticker in the sidebar (reuses the C7.6 SSE bus + hook)
B. Prod-env var naming consistency (`.env.production.example` uses `VAULT_SIGNER_KEY` but `safe-deploy.ts` reads `VAULT_SAFE_SIGNER_PRIVATE_KEY` — a prod deploy using the example as-is gets no signer). 30-min infra fix.
C. Real Spritz sandbox creds (sdk.spritz.finance signup → set `SPRITZ_INTEGRATION_KEY` + `SPRITZ_SANDBOX=true` → chain auto-flips to live). No code change.
D. Real mainnet deploy (Cluster 6.0.1 wired mainnet; the chain table, addresses, env block, prod check, API, smoke are all green — but no real mainnet deploy was ever performed).
E. Per-bill off-ramp provider override UI (data shape `ScheduledBill.providerPreference` exists; the picker in `/vault/preferences` is single user-level).
F. Refund / dispute flow.
G. Multi-sig / threshold changes.
H. Other chains (Optimism, Arbitrum, Polygon) — chain table is the clean place to add.
I. Real Monto adapter (Spritz already wired in 7.3; Monto is a stub — swap in `src/lib/vault/spritz-client.ts`).
J. Real fiat bank-account linking.
K. Dynamic Pool address resolution (`PoolAddressesProvider.getPool()` so Aave upgrades don't need a code change).
L. Prisma migration history (`prisma db push` → `prisma migrate dev` so health endpoint reports `migrationStatus: current` instead of `pushed`).
M. Per-bill off-ramp provider override UI.
N. Refund / dispute flow.

# Standing user preferences (apply when ranking)
- "Visible UI matters more than invisible architecture" — interleave visible-UI milestones with infra so the user can see progress; reserve pure-infra for off-cycle.
- "Quality > speed" — at natural breakpoints, ship a fresh-session handoff rather than let quality slip.
- "Visual-first" — default to a chart/strip/sparkline over a list of text rows; build the chart first; add a list only if exact values can't live in the chart.
- "Headline numbers need growth-oriented suggestions" — pair summary numbers with clickable suggestions that make them bigger/better.
- "Two-tier AI surface" — production-grade (Mavis) for onboarding/extraction; lighter (Ollama OK) for post-onboarding "ask me anything."
- "End-of-session: save + update everything" — commit + update COORDINATION.md + HANDOVER.md + memory at every session-end or natural breakpoint.

# What I want from you (Polar)
1. **Pick ONE cluster** from the list above (A through N — or propose a different one if the handoff missed a clear winner).
2. **One-paragraph rationale** — why this cluster, why now, what's the visible-UI payoff if any, what's the infra-vs-UI mix.
3. **Suggested spec skeleton** — 5–8 bullet outline of what the cluster ships (data model + UI surfaces + smoke + commit shape) so the fresh session can start with a written contract, not improvise.
4. **Risk callouts** — anything that could derail the cluster, in one or two lines.
5. **One alternative** — second-best pick + one-line reason, so I can choose between the two.

Be opinionated. If you'd push back on any of the standing preferences for this cluster, say so. Keep total response under ~600 words.
```

---

## How to relay back

Once Polar answers, paste the response (or your own summary if Polar's too long) back to Mavis in this chat. Mavis will:

1. **Synthesize** — your Polar recommendation + Mavis's own Compass-grounded judgment + the handoff context
2. **Write the cluster spec** at `00-CLUSTER-X.Y-NAME.md` in the workspace root
3. **Update HANDOVER.md** "Next cluster" section to the chosen cluster
4. **Update COORDINATION.md** "Last update" line
5. **Execute the cluster** — schema, code, smokes, commit, handoff doc

If Polar's answer is hard to paste, screenshot the chat and drop the image in. Mavis will OCR the relevant parts.
