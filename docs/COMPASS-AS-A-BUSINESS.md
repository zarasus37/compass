> Business strategy/reference only. Product intent is ../00-VISION.md; implementation status and tasks are ../COORDINATION.md. Market estimates and proposals are not verified deployment facts.

# Compass — The Business Case

> What Compass is, why it could become a business, and what is still unbuilt.
>
> **Written**: 2026-10-06 · **Author**: for xKryptic · **Status**: pre-revenue product analysis
> **Evidence base**: measured directly from the repository at `C:\dev\compass` on 2026-10-06 (`00-VISION.md`, `00-DESIGN.md`, `COORDINATION.md`, `README.md`, `00-MOM-LAUNCH-RUNBOOK.md`, `prisma/schema.prisma`, `compass-landing/index.html`). Numbers are measured, not estimated. Everything commercial is an estimate and is labelled as one.

---

## 1. The one-paragraph version

Compass is a personal-finance application built around a single contrarian idea: **the pay period, not the calendar month, is the unit of truth.** Money arrives on a Friday and must last until the Friday after next, but every budgeting app organizes you around "May 2026." Compass instead treats each paycheck as an event that *executes a written plan* — automatically, with no confirmation modal — and writes a permanent, human-readable receipt for every automated decision. The AI layer explains and advises; a deterministic rules engine is the only thing allowed to touch the ledger. The product today is a single-user, production-deployed, unusually complete application with no bank connectivity, no billing, and one real user. **It is a pre-revenue product, not yet a business** — but the expensive, hard-to-copy part of the work (the period-first policy engine and the trust architecture) already exists, which is the opposite of the usual starting position.

---

## 2. The problem, stated precisely

Most personal-finance software fails at the same place: it **reports** instead of **carries**.

A spreadsheet knows what you spent. A budgeting app knows what you *assigned*. Neither knows that Friday's check has to last two weeks, that the car payment lands the same week as groceries, or that if the check is short by $150 the correct answer is to fund rent and buffer and *say so* — not to silently produce a red bar and let the user guess.

Three structural reasons:

1. **The month/check mismatch.** Households are paid in periods and billed in monthly cycles. Software organized around the calendar month systematically misrepresents cash reality, and users feel the discrepancy long before they can name it.
2. **The ongoing-labor trap.** Every incumbent requires the user to redo the work every cycle: categorize, assign, reconcile, rebalance. The user's attention — the scarcest input in the whole system — is the production cost. The Vision document states the diagnostic plainly: if the user still has to perform ongoing financial work after setup, the product is "still fundamentally a budgeting application."
3. **Trust in automation is unearned and unverified.** Automation without an explanation is indistinguishable from a bug. Nobody will hand a machine the authority to move their money until it can show its work.

Compass attacks all three: period as the organizing axis, plan-as-policy executed automatically, and an audit trail as a first-class product feature rather than a log file.

---

## 3. What the product actually is

### 3.1 The core loop

Everything in Compass exists to feed one pipeline:

```
Transaction → Account → Canonical Financial State
Financial State → Policy / Rules → Proposed Actions
Proposed Actions → Execution (atomic, idempotent) → Audit Record → Explanation to user
```

The Vision document's acceptance test is the one to remember: **"If the user disappeared after configuring Compass, would Compass still correctly carry out the financial plan?"** When that answer becomes yes — inside boundaries the user authorized — the product has crossed from budgeting app → financial planning and automation platform → personal financial operating system.

### 3.2 The five load-bearing decisions

| # | Decision | What it means commercially |
|---|---|---|
| **D11** | **Pay period is the unit of truth** | Not a feature. A data-model and category redefinition that competitors organized to avoid. See §7 (moat). |
| **D12** | **Plan-as-policy, auto-allocated, no confirm modal** | Removes the per-cycle friction that makes every other budgeting app decay into neglect. This is the product's actual reason to exist. |
| **D16** | **Envelopes enforce, not just display** | A budget that doesn't enforce is a wish list. Moves Compass from reporting to constraint. |
| **D4 + audit** | **L1 rules engine writes; the LLM advises** | The strongest differentiator in the whole design, and the cheapest to explain: *the AI never decides where your money goes.* It is also the correct liability posture. |
| **D5** | **No monthly payment required to use the app** | Tension with any subscription model — resolved deliberately in §8. |

### 3.3 The trust architecture (the underrated asset)

For a product that wants to move money autonomously, these are not over-engineering; they *are* the product:

- **Deterministic execution** — the same paycheck event processed twice must not allocate twice. Backed in code by a unique constraint on `(userId, periodKey, paycheckCents)`.
- **Idempotency + transactional writes** — no partial allocations, no half-applied plans.
- **Audit log with rollups** — every automated action records amount, source, the rule that fired, and when. The user-facing explanation is not a string written by a model; it is derived from the ledger.
- **Explicit plan states** — Draft / Active / Paused / Needs Attention / Completed.
- **Exception handling before autonomy expands** — duplicate paycheck, short paycheck, missing paycheck, short-funds, rule conflict.
- **Never pretend an allocation succeeded when it didn't** (shortfall logic). If money wasn't there, the system must say which parts were funded, deferred, or rolled forward.

---

## 4. What exists today (measured 2026-10-06)

| Metric | Value |
|---|---|
| Commits | **320**, from 2026-08-21 to 2026-10-06 (≈6 weeks) |
| Source | **~77,000 lines** of TypeScript/TSX across **353 files** |
| Test suite | **76 smoke scripts, ~24,900 lines** |
| Data model | **37 Prisma models** |
| Specs | **51 shipped cluster specs** archived under `docs/archive/clusters/` |
| Deployment | Live in production (Vercel + Neon Postgres) |

**Shipped capabilities:** multi-account ledger · envelopes with sinking funds and enforced targets · transactions persisted to Postgres · bills with scheduling and history · debts with payoff simulation, per-debt sparklines, utilization and interest-wasted views · goals with trajectory projection · biweekly pay schedule with automatic period roll-forward · allocation plan + prioritized rules · paycheck run with double-allocation guard · cron-driven automatic paycheck processing · audit log with daily rollups and retention pruning · **on-chain vault (Safe multisig → Aave v3) with a hardcoded transaction allowlist, spend caps, and a single signing choke point** · AI-assisted onboarding extraction · multi-step setup wizard · drag-and-drop widget dashboard with saved views · command palette · PWA manifest · client error capture table · DB-backed login throttling · cron routes that fail closed · production env validation · live activity ticker · command-palette quick-add.

**Security posture is above the norm for a solo project:** argon2 password hashing, DB-backed rate limiting that survives serverless cold starts, constant-time cron token comparison, fail-closed cron routes, EOA-owns-every-Safe with a three-transaction allowlist and per-recipient pinning, `$10,000` default spend caps in code, and a sandbox flag that is hard-failed on Vercel production.

---

## 5. What is NOT built — the honest inventory

This section is the most important part of the document. A business plan that skips it is marketing.

| Gap | Detail | Commercial severity |
|---|---|---|
| **No bank connectivity** | The Plaid page is a **mock sandbox**: no `plaid` dependency exists in `package.json`; the institution list is hardcoded; OAuth is simulated; the form calls a no-op server action. **All financial data today is manual entry.** | 🔴 **Critical.** Manual-entry budgeting apps have weak retention by construction — and the entire D12 thesis (the plan runs itself) cannot be observed by a user until real transactions arrive. |
| **No multi-tenant correctness** | `PayPeriod` still has **no `userId`**; period roll-forward is therefore single-user. | 🔴 **Critical.** Must be fixed before a paying stranger signs up. |
| **No billing** | No Stripe, no plans, no trial, no paywall, no feature gating by tier. | 🔴 Critical for monetization, trivial to build. |
| **Canonical financial state incomplete** | Phase 1 of the 25-phase Vision roadmap is not finished; the layer other systems consume does not yet exist as one authoritative representation. | 🟠 High — it is the spine of the 25-phase plan. |
| **Dry-run preview engine** | Phase 4 (preview before execute) is not shipped. Users cannot yet see "if this paycheck landed now, here's exactly what I would do." | 🟠 High — this is the trust surface that makes automation sellable. |
| **Onboarding tuned to one person** | AI extraction works, but it was shaped around a single user's answers. | 🟠 High for conversion. |
| **Variable-income mode** | Listed (mom's feature #8), not built. Blocks the entire freelancer/gig segment. | 🟡 Medium — segment-gating, not core-gating. |
| **No funnel or retention instrumentation** | No product analytics, no cohort view, no onboarding-completion tracking. | 🟡 Medium — you cannot optimize a funnel you cannot see. |
| **Vault not generally available** | Built, but gated behind `VAULT_ENABLED`, and requires a self-custody wallet. Usable by a technically capable minority only. | 🟡 Low as a revenue line, meaningful as an option. |
| **Ops maturity** | A sister deployment (`compass-mom`) is currently unhealthy for reasons unrelated to app logic — a rejected env var is failing deploys, and a rotated-away AI key is producing 401s. | 🟠 Medium — it is a reminder that this is one person operating production infrastructure solo. |

**Net:** the product is feature-deep and commercially shallow. The engineering is ahead of the go-to-market by roughly a full stage.

---

## 6. Who it's for

Ranked by fit with what already exists:

1. **Fixed-income, biweekly-paycheck households** — the primary archetype. The exact person the app was built for. Underserved, because the whole category optimizes for salary + subscription stacks while these households live paycheck-to-paycheck across a *pay cycle* that the month-centric UI misrepresents.
2. **Households carrying card debt alongside fixed bills** — the payoff simulator, utilization view, and interest-wasted view are already built for exactly this person.
3. **Households, not individuals** — dining, buffer, and debt are shared decisions. A single-user billing model under-serves reality.
4. **Freelancers and gig workers** — high fit on the pain, currently blocked on unbuilt variable-income mode. A distinct product, not a settings toggle.
5. **Financial coaches and debt counselors (B2B2C)** — multi-client, per-seat, white-labeled reports. Highest ARPU and lowest churn; requires the multi-tenant work above.
6. **Credit unions, employers, community organizations** — long-horizon distribution, white-label.

**Anti-segment, stated honestly:** high-earning optimizing investors. They want portfolio analytics, tax-loss harvesting, and brokerage integrations. Compass would bore them, and their expectations would corrupt the product. The period-first, mom-grade design is the *constraint that produces the differentiation*; it is not a limitation to apologize for.

---

## 7. Market and competition

**Category**: personal finance / budgeting, with an ambition to become financial automation.

| Competitor | Their strength | The gap Compass contests |
|---|---|---|
| **YNAB** | Envelope method + zero-based budgeting + the strongest community in the category | Closest competitor. But YNAB is a *method the user executes* — the assignment still happens every paycheck, by hand. Plan-as-policy closes that gap. |
| **Monarch Money / Copilot Money** | Beautiful subscription aggregation, effortless setup, cheap | Aggregators, not operators. They answer "what is this?" and refuse to answer "so what should happen?" |
| **Rocket Money** | Bill negotiation at scale, lead-gen monetization | Monetizes by selling the user's data to providers. Compass monetizes by executing the user's own plan. |
| **Bank apps / neobanks** | Connectivity, free | Fintech churns features. Also, most of these optimize for *deposit capture*, not the user's plan. |
| **Spreadsheets + Notion** | Total control, zero lock-in, the true incumbent | Requires the exact ongoing labor the product is designed to eliminate. |

**The honest competitive read.** "More automation than YNAB" was a real gap and competitors have partially closed it. The defensible claim is narrower and stronger:

> Most apps **display** a budget. Compass **executes** a written financial policy on a pay-period schedule, produces an immutable receipt for every decision, and can hold the money itself — on-chain — to that policy.

That is a three-part claim (execution, audit, custody) and competitors have none of the three in combination.

**Market shape reality:** B2C finance is a difficult business — low ARPU ($40–100/yr), high churn, CAC sensitivity, and a trust bar that is a feature rather than a marketing asset. Any plan that assumes mass-market YNAB-scale distribution on one founder's bandwidth will not survive contact with reality. Plan for a strong niche, and treat mass distribution as an outcome rather than a strategy.

---

## 8. Business model

### 8.1 The D5 tension, stated plainly

D5 locked "no monthly payment requirement to use the app." That is a real product value (and it is *why* the Ollama local-AI fallback exists). It is also incompatible with a hard paywall. Resolution:

**The core promise stays free forever.** Manual entry, pay-period view, the full deterministic engine, and local AI cost users nothing and require no card. **Paid unlocks connectivity and autonomy** — bank sync, automatic paycheck detection, forecasting, multi-household, advisor, vault. This is honest to D5 (the user is never blocked from managing their money) and commercially sane (the cost-bearing features are the paid ones).

### 8.2 Options, with a recommendation

| Model | Shape | Verdict |
|---|---|---|
| **A. Freemium subscription** | Free manual core; paid $5–9/mo or ~$60/yr for sync + automation + forecasting | ✅ **Start here.** Aligns paid value with real costs. |
| **B. Household plan** | $12–15/mo for a shared household (dining, buffer, debt are shared decisions) | ✅ Strong expansion revenue; requires real multi-user support, which is required anyway. |
| **C. Lifetime license** | $99–149 one-time | ✅ Genuinely well-matched to this audience — "own your data, no subscription" is *the* sentiment in the privacy-conscious money-app niche, and with local-AI inference there is near-zero marginal AI cost to defend it. Excellent early-cash generator. |
| **D. B2B2C advisors / coaches** | $30–50/seat/mo, multi-client, white-labeled reports | ⏳ **The best long-term business in this list.** Highest ARPU, lowest churn, distribution through a trusted human. Blocked on multi-tenant work. |
| **E. Vault yield take-rate** | Small share of Aave yield on opt-in vault balances | ⏳ Defer. Already built; tiny revenue; keep as a reason the signer infrastructure exists. |

**Recommendation: A + C hybrid first, D as the destination.** Sell a free core, offer a lifetime license for the privacy-minded and an annual plan for the automation-minded, then build the advisor product once multi-tenancy is real. Advisor distribution is how a solo founder acquires users without a marketing budget.

### 8.3 Unit economics — assumptions, not facts

Labeled as assumptions because no real user data exists yet:

- **AI cost per active user/month: very low, structurally.** Because the AI advises and never writes, the number of model calls per paycheck is bounded (a handful: categorization, explanation, forecasting), rather than growing with transaction volume. A local Ollama path can drive it to near zero. Competitors whose AI runs on every interaction carry a structurally higher COGS floor. **This is an under-marketed advantage.**
- **Infra per active user: low.** Single Next.js monolith, serverless Postgres (Neon), cron-driven rather than always-on workers.
- **CAC: the binding constraint, as always.** No paid-acquisition plan is recommended. Channel-fit content plus advisor distribution.
- **Payback: favorable if retention is real.** The entire thesis is that automation prevents the neglect-churn that kills this category. That thesis is **unproven** and is the single most important thing to validate.

---

## 9. Moat — scored honestly

| Asset | Strength | Why |
|---|---|---|
| **Deterministic policy engine + audit ledger** | 🟢 **Strong** | This is the hard, unglamorous core. Competitors can add "auto-allocate" in a sprint; they cannot add a correct conflict-resolution model, shortfall logic, idempotency, and a human-readable explanation of every automated decision in the same change. |
| **Period-first data model** | 🟢 **Strong** | Retro-fitting pay-period authority into a category-architected competitor is a re-architecture, not a feature. It changes what a "budget" even is. |
| **Vault + intent layer combined** | 🟡 **Latent, high** | A user whose money is genuinely held to their plan by on-chain policy has an enormous switching cost. This is the strongest possible lock-in in the category — and it excludes the great majority of users. An upsell, not a wedge. |
| **Pay-period behavioral history** | 🟡 **Moderate, compounding** | Long-run data on how a household actually fails a period is genuinely scarce and would later power coaching, credit products, or benchmarking. Valuable only at scale. |
| **UI/design quality** | 🟡 **Moderate** | Real and visible, and cheap to copy in appearance. Defensible only as brand. |
| **Network effect** | 🔴 **None** | Be explicit about this. There is no user-to-user value. |

---

## 10. Go-to-market

### 10.1 The strategy that has already been run

The development history *is* the go-to-market strategy, and it is the right one:

> **Build for one real person → ship to her → fix what reality breaks → repeat.**

This has been executed for six weeks (320 commits, one production deployment, one real user with real money). It is the cheapest and highest-fidelity product research available, and it is already proven. Most funded startups never get this. The discipline now required is **not losing it** — resisting the pull to build for hypothetical users while the real one is still telling you what breaks.

### 10.2 The wedge

**"The first money app your paycheck doesn't outrun."**

The "mom-grade clarity / world-class depth" constraint is not a limitation to disclose — it *is* the marketing differentiation. Every incumbent is optimized for the financially fluent. Almost none are optimized for someone who wants to know, in plain language, on the afternoon her check clears, whether she is going to be okay. That is a positioning no amount of funding easily displaces, because it requires *not* becoming more sophisticated.

### 10.3 Channels, ranked by expected return per unit of founder time

1. **Pay-period literacy content** — almost nobody teaches this, and it maps exactly to the product. Medium-to-high intent audience.
2. **Debt payoff + "interest wasted" calculators as lead magnets** — already built. Strong SEO, high pain, natural product bridge.
3. **The symptom community** — people asking "why am I always broke a few days before payday" are, definitionally, this app's user. That recurring question is the demand signal to hunt.
4. **Advisors / credit counselors** — B2B2C distribution through a trusted human, and a revenue line at 5–10× B2C ARPU.
5. **A public no-signup demo** — the repo already made this call correctly: demos belong on the marketing side, real accounts start empty.
6. **Paid acquisition** — not recommended. Insufficient ARPU, insufficient runway.

**Sequence:** 10 design partners → paid waitlist → public beta. Not the reverse.

---

## 11. What to build next — in business order, not feature order

The Vision roadmap is organized by capability. A business needs a different ordering — by *what unblocks revenue*:

| # | Build | Why it comes first |
|---|---|---|
| **1** | **Real bank connectivity (Plaid, read-only, sync-only)** | Without it, Compass is a manual-entry app, and manual-entry apps don't retain. This also makes D12 — the whole thesis — observable by the user for the first time. Start read-only: no write-back, no initiated transfers, lowest regulatory and operational surface. |
| **2** | **Multi-tenant correctness** (`userId` on `PayPeriod` + isolation tests) | A single hard prerequisite before a paying stranger exists. Data-leak risk between users is existential for a finance product's trust. |
| **3** | **Billing** (Stripe, plans, trial, feature gating) | Shortest path from free tool to business. Trivial relative to 1 and 2, and it converts existing usage into revenue. |
| **4** | **Onboarding that survives a stranger** | The current flow was shaped around one person's answers. Measure completion rate on real signups. |
| **5** | **Canonical state + dry-run preview** | The trust surface: "here is exactly what would happen, and why." This is what converts an afraid user into an autonomous user. |
| **6** | **Funnel + retention instrumentation** | Cannot optimize what cannot be measured. |
| 7+ | Variable income · household plan · advisor dashboard · vault GA | Ordered by segment value, per §6. |

---

## 12. Risks, ranked, with mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| **No bank connectivity** delays the entire thesis | 🔴 | Build it first (above). Until then, the app's value is manually observable, not automatic. |
| **Cross-tenant data exposure** (no `userId` on `PayPeriod`) | 🔴 | Fix before external signups; add isolation tests to CI as the gate. |
| **Regulatory line into "financial advice"** | 🔴 | The architecture already helps enormously: the system executes *the user's own written plan* and never recommends. Keep all copy descriptive ("your plan does X"), never prescriptive ("you should"). No third-party managed portfolios in v1. |
| **Custody/liability if the vault is ever default-on** | 🟠 | Keep it strictly opt-in, allowlisted, capped, and reversible. Current design is correct — do not relax it for growth. |
| **Trust collapse from one bad automated action** | 🟠 | Dry-run preview before execution; idempotency; explicit "needs attention" state; the audit receipt as a first-class surface. |
| **Churn from ongoing user labor** | 🟠 | The core thesis. Mitigated *only* by real auto-allocation — which is why item 1 is first. |
| **Founder bandwidth** | 🟠 | 320 commits in six weeks is unsustainable indefinitely. Brutal scope; ship the monetization path (1–3) before the vault, the what-if engine, or the aesthetic extensions. |
| **A competitor ships "auto-allocate"** | 🟡 | Compete on execution + audit + custody as a *combination*, per §7. |
| **Security incident** | 🟡 | Posture is already strong. Keep failing closed, keep secrets out of logs, keep the allowlist tight. |
| **Privacy/regulatory burden of financial data at scale** | 🟡 | Read-only connectivity, minimal data retention, explicit user-facing data policy. |

---

## 13. Verdict

**As a product:** unusually strong for one author. Production-deployed, security-hardened, architecturally opinionated in exactly the places that matter, with a documented design discipline that most venture-backed teams don't have. The period-first reframe and the deterministic-engine-plus-audit architecture are genuinely good ideas, correctly executed.

**As a business:** it is not yet one. There is no revenue, no bank connectivity, no multi-tenancy, no billing, and one user. A green test suite is not product progress and should not be reported as such.

**The strategic read that matters:** the expensive, high-friction, high-defensibility part of this business is already built — the period-authoritative data model, the deterministic policy engine, the conflict/shortfall logic, the audit ledger, and the custody layer. The remaining work is mostly *go-to-market-shaped*, not invention-shaped. That is an unusually favorable position from which to start a business, and it is the opposite of the usual "we have an idea and 14 months of building ahead of us."

**The single most valuable next action is not a feature. It is the first paying stranger.** Real money from someone who isn't you converts this from the best hobby project in the category into a business, and it will reveal which of the items in §5 actually matter.

**A realistic ceiling, stated honestly:** executed well, this becomes a genuine niche business — a respected, well-built product serving a defined segment, likely low-to-mid five figures in monthly revenue, with the vault and the advisor path as the upside options. Competing head-on with YNAB or Monarch for the mass market is not a plan that works with one founder, and pretending otherwise would be the fastest way to kill something unusually good.

---

## Appendix A — Glossary

**Vessel / Envelope** — a bucket of money with a purpose and a target balance. Compass enforces the boundary rather than only displaying it (D16). **Plan-as-policy** — a written allocation policy the system executes without asking each cycle (D12). **L1** — the deterministic, rule-based routing level; the only component permitted to write to the ledger. **L2** — live bank routing with real transfers (future). **Canonical financial state** — one authoritative representation of "where the user stands right now," consumed by every other system (Vision Phase 1). **Pay period** — the slice between two paychecks; the unit of truth (D11). **Vault** — the user's own Safe multisig on-chain, funds supervised toward Aave v3, strictly allowlisted. **Plan states** — Draft / Active / Paused / Needs Attention / Completed.

## Appendix B — Sources

`C:\dev\compass\00-VISION.md` (25-phase roadmap, acceptance test, AI boundary, health metric) · `00-DESIGN.md` (decisions D1–D18, brand, visual language, vessel mapping) · `COORDINATION.md` (stage status, build order, defects, decisions log) · `README.md` (stack, scripts, security model) · `00-MOM-LAUNCH-RUNBOOK.md` (production deployment model) · `prisma/schema.prisma` (37 models) · `compass-landing/index.html` (public positioning) — all read 2026-10-06.
