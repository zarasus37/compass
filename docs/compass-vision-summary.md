# Compass Vision — Distilled Memory Notes

> Source of truth: `/workspace/memory/compass-vision.md` (copy of `00-VISION.md`)
> This is the **distilled essence** for fast recall. Read the full doc before scoping any non-trivial cluster.

---

## §0 THE LOAD-BEARING PRINCIPLE (NON-NEGOTIABLE)

**Don't let Compass become a collection of financial features. Every feature must feed the same financial state → policy → decision → execution loop.**

**Ultimate test**: *"If the user disappeared after configuring Compass, would Compass still correctly carry out the financial plan?"*

If yes (within authorized boundaries) → Compass crossed the line from **budgeting app** → **financial planning platform** → **personal financial operating system**.

**Tagline**: *"Your money, guided."*

**Core distinction**: "I made a financial plan" → "My financial plan actually gets carried out."

**Progression**:
```
Budgeting → Planning → Automation → Financial Policy → Financial Operating System → Decentralized/Vault Layer
```

**Important transition**: from displaying financial info → **acting on financial intent**.

---

## §1 PRODUCT DEFINITION

- **Category**: Financial planning and automation platform evolving toward personal financial operating system
- **User**: Establishes financial intentions, rules, priorities, constraints. Compass progressively takes responsibility for carrying those forward.
- **Currently**: Mom is the single user (D7 single-user design). Multi-user plan (7.32a/b/c) approved for future scaling.

---

## §2 FOUNDATION ALREADY IN PLACE (PRESERVE)

### Stack
- Next.js + React 19 + TypeScript 5.9 + Prisma 7
- Postgres-everywhere (Neon in prod)
- TanStack Query / Zustand
- Plugin architecture / API layer / AI provider abstraction
- Modular widget system / drag-and-drop / saved views

### Schema Concepts
- Accounts / Envelopes / Transactions / Pay periods / Allocation rules
- Bills / Goals / Audit logs / Routing levels / AI tiers
- **NEW (Cluster 7.36)**: `SetupState` model (wizard state machine)

### Load-Bearing Product Philosophy (6 decisions)
1. **Pay period is the unit of truth** — allocation happens around actual paycheck events
2. **Plans can become automated** — not just suggested
3. **Envelopes are intended to enforce financial boundaries** — not just visualize
4. **Financial actions should be auditable** — every autonomous action has a trace
5. **Interface should remain understandable** — complexity in system, simplicity on surface
6. **System should progress toward autonomous financial management** — that's the trajectory, not a side-feature

---

## §3 THE 25-PHASE ROADMAP (PRIORITIZED)

### PHASE 1 — Canonical Financial State (Cluster 7.36 ACTIVE)
**Objective**: One authoritative representation of current financial situation.

**State incorporates**:
- Account balances / available cash / pay-period position
- Current pay period / next paycheck
- Income received / income expected
- Envelope balances / envelope targets
- Bills / upcoming bills
- Goals / savings gaps / debt obligations
- Allocation rules / rule status / plan status
- Buffer / overages / previous allocations
- Pending actions / recent transactions

**Deliverable pattern**:
```
Transaction → Account → Financial State
Financial State → Rules → Proposed Actions
```

### PHASE 2 — Rules State-Aware
Rules understand context: "Put $300 into savings" vs "Put enough into savings to reach target, but don't violate current-period obligations or available-cash requirements."

### PHASE 3 — Rule Priority + Conflict Resolution
Multiple rules compete. Hierarchy (configurable, not hard-coded):
1. Required obligations
2. Essential living expenses
3. Safety / buffer
4. User-defined priorities
5. Growth / savings
6. Optional spending

**CRITICAL**: Compass should **NEVER** silently choose between competing policies. Deterministic conflict-resolution mechanism required.

### PHASE 4 — Dry-Run / Preview Engine
Before execution: "If this paycheck were processed right now, what would Compass do?"
Output: proposed execution plan. User must understand the result.

### PHASE 5 — Execute the Plan
`Financial State → Rules → Proposed Actions → Execution`

Requirements: deterministic / transactional / persistent / idempotent / auditable.
**Critical safeguard**: Running the same event twice should NOT allocate the paycheck twice.

### PHASE 6 — Hard Enforcement
Envelopes shouldn't just display "you exceeded your limit." They should enforce it:
- Hard block / Warning / Require override / Auto-rebalance / Move from another envelope / Flag

### PHASE 7 — Insufficient Funds Logic
When allocations exceed resources, determine:
- What gets funded / partially funded / deferred / flagged / rolled forward / recalculated

**Most important**: **Never pretend the allocation succeeded when it didn't.**

### PHASE 8 — Persistent Plan State
- Draft / Active / Paused / Completed / Archived / Needs Attention

### PHASE 9 — Automatic Paycheck Processing (CORE LOOP)
```
User gets paid → Compass recognizes paycheck → Determines pay period →
Builds financial state → Evaluates active policies → Calculates allocations →
Validates constraints → Executes → Updates balances → Records audit trail →
Shows user what happened
```

### PHASE 10 — Auditability
Every automated decision has an explanation.
Not "$300 was allocated." Instead: "$300 was allocated to Emergency Savings because your active plan targets $1,000, your current balance was $700, and this paycheck left sufficient funds after required obligations."

User must be able to trace: What happened → Why → Which rule → What state existed → What changed.

### PHASE 11 — Exception Handling
Recognize: Unexpected paycheck / Missing paycheck / Unusually large/small paycheck / Duplicate transaction / Reversed transaction / Insufficient funds / Unexpected bill / Rule conflict / Inactive account / Invalid allocation / Stale plan / Target satisfied/exceeded.

### PHASE 12 — UX
User should NOT need to understand the machinery. Interface communicates:
1. What happened?
2. Why?
3. What's coming next?
4. Is anything wrong?
5. What does user need to do?

### PHASE 13 — Measure the Right Thing
**One metric**: How much ongoing financial work does user still have to perform after setup?
- If user has to manually categorize everything / allocate every paycheck / constantly rebalance → still a budgeting app
- If user establishes system and Compass increasingly handles work → financial operating system

### PHASE 14 — AI Layer
**AI should ENHANCE the financial engine rather than REPLACE deterministic logic.**

AI helps with: categorization / explanations / anomaly detection / forecasting / NL queries / scenario analysis / recommendations / narrative reports / pattern identification.

**But**: Financial state and execution remain deterministic. AI should NOT arbitrarily decide where money went.

### PHASE 15 — Trust / Safety Architecture (Before More Autonomy)
Audit logs / deterministic execution / idempotency / permissions / explicit plan states / rollback / exception handling / transparent explanations / user-configurable automation levels.

### PHASE 16 — Budgeting Completion Gate (HARD MILESTONE)
**Before moving into vault expansion, must demonstrate**:

**Setup**: accounts → envelopes → pay schedule → goals → allocation policies → activate plan
**Paycheck**: recognize → pay period → state → rules → plan → validate → execute → balances → audit → explain
**Exception**: change → recalculate → handle conflict/shortfall → notify

If that entire loop works → budgeting foundation is genuinely doing something different from a conventional app.

### PHASE 17+ — Vault / Decentralized Layer
Only after budgeting engine is solid. Don't bolt vault onto unfinished budgeting.

```
Budgeting Engine → Financial Policy Engine → Personal Treasury → Vault → DeFi Infrastructure
```

Budgeting = **intent/policy layer**. Vault = **execution/custody/financial infrastructure layer**. Separation is valuable.

---

## §4 LONGER-TERM ARCHITECTURE

```
                    COMPASS
                       │
             ┌─────────┴─────────┐
             │                   │
        User Intent          Financial Data
             │                   │
             └─────────┬─────────┘
                       │
              Financial State
                       │
                       ▼
             Policy / Rules Engine
                       │
                       ▼
              Decision / Planning
                       │
                       ▼
                 Execution
                       │
          ┌────────────┴────────────┐
          │                         │
     Traditional                 Vault
     Financial                   / DeFi
     Accounts                    Layer
          │                         │
          └────────────┬────────────┘
                       │
                       ▼
                 Treasury
                       │
                       ▼
               Autonomous Finance
```

---

## §5 BACKLOG IDEAS

- Financial state timeline (evolution over time)
- What-if engine ("increase savings by $100/paycheck?")
- Financial simulation (multi-period projections)
- Automatic rebalancing (adapt to circumstance changes)
- Goal intelligence (goals influence allocations)
- Adaptive policies (rules respond to change)
- Financial health signals (liquidity/obligations/buffer/debt/goals/volatility/spending capacity)
- Natural-language financial control ("save $5k by June without affecting rent/groceries")
- Explainable autonomy

---

## §6 EXECUTION STAGES (A → I)

| Stage | Objective |
|---|---|
| **A** | Inventory existing budgeting code — map Prisma models to workflows, map APIs to workflows, map UI to workflows |
| **B** | **Financial State** — define canonical state, implement calculation, test against real scenarios |
| **C** | **Policy Engine** — connect allocation rules to financial state, conditions, priority, conflict resolution, insufficient-funds |
| **D** | **Execution** — dry-run allocation, validate proposed actions, execute atomically, idempotent, update balances |
| **E** | **Automation** — plan states, paycheck detection/processing, auto-trigger policy, exception handling, audit events |
| **F** | **UX** — show what happened / why / what's coming / exceptions / keep complexity invisible |
| **G** | **Validation** — complete pay-period lifecycle, unusual income, insufficient funds, duplicate tx, conflicting rules, paused plans, plan changes, period rollover, auditability |
| **H** | **Completion Gate** — zero-touch paycheck scenario; verify every state transition, every automated decision, user understands everything that happened |
| **I** | Vault / Decentralized — only after H passes |

---

## §7 CLUSTER SCOPING CHECKLIST

**Before scoping any feature, ask**:
1. Does this feed the `state → policy → decision → execution` loop?
2. Is data going through the canonical Financial State, or am I building a side-feature?
3. Is AI enhancing the deterministic engine, or replacing it?
4. Would this work after the user disappeared? (or requires ongoing user attention?)

**Red flags** (likely wrong cluster):
- ❌ UI surface that bypasses canonical state
- ❌ LLM extracting structured data from free-form text (fragile — Cluster 7.35 fix)
- ❌ Features without auditing capability
- ❌ Automation without exception handling
- ❌ Silent conflict resolution between rules
- ❌ Letting LLM decide where money goes

**Green flags** (likely right cluster):
- ✅ Adds a column to Financial State or new derived state
- ✅ Validates with a unit test that mimics a real pay period
- ✅ Has deterministic default and configurable override
- ✅ Generates an audit row
- ✅ Surfaces result clearly to user (per Phase 12 UX)

---

## §8 THE CLUSTER QUEUE (Current State)

**Active**: 7.36 — 5-step setup wizard at `/setup` (Phase 1 + Stage A)
**Next**:
- 7.37 — Real Plaid (fills pay-schedule step from real bank data)
- 7.38 — Policy Engine (Stage C)
- 7.39 — Execution Engine (Stage D)
- 7.40 — Automation (Stage E)
- 7.41 — UX for engine (Stage F)
- 7.42 — Validation suite (Stage G)
- 7.43 — **Completion Gate** (Stage H) — **zero-touch paycheck scenario**

**Deferred**: Vault/Decentralized (Stage I) — only after H passes.

**Already shipped (foundation)**:
- 7.28 Sinking funds / 7.29 Spending trends / 7.30 Mobile shell polish / 7.31 Compass Rose logo
- 7.32 Auth refactor (multi-user ready, gated single-user for mom v1)
- 7.33 Onboarding stuck-detector + envelope-detail DB read
- 7.34 Sign-out button + re-do onboarding card
- 7.35 Onboarding extractor fixes + stuck-detector refinement

---

## §9 REFERENCES

- Source: `/workspace/attachments/de8639c4b248b548/vision.docx`
- Cluster specs: `/workspace/compass/00-CLUSTER-*.md`
- HANDOVER: `/workspace/compass/HANDOVER.md`
- Runbook: `/workspace/compass/00-MOM-LAUNCH-RUNBOOK.md`

**When this document and a cluster spec disagree, this document wins.** Cluster specs are scoped within the vision. Update both if scope changes.

---

## §10 KEY DECISIONS ALREADY MADE (FROM CLUSTERS 7.1-7.36)

1. **Vault deferred** (per 2026-09-22 user direction) — focus on budgeting engine first
2. **Single-user design (D7)** — mom is the only user. Multi-user plan (7.32a/b/c) approved for future scaling
3. **Form-first setup wizard (Cluster 7.36 pivot)** — replace LLM-extracted-from-natural-prose with deterministic form fields. LLM only for interpretation (explanations, recommendations, anomaly detection, NL queries).
4. **Plaid real (not sandbox) for v1** — Compass is a real product. Production creds in Vercel env. Sandbox fallback for local dev.
5. **Setup wizard state machine**: `SetupState.activatedAt` OR `FinancialIdentity.completedAt` (gate accepts either, per Cluster 7.36)
6. **AI provider abstraction** — `LLM_PROVIDER=mock` for smokes; `LLM_PROVIDER_ADVISOR=mock` for advisor smokes. Real Mavis/Cloudflare in prod.
7. **Server-action form hydration is fragile in React 19 + Next 16** — Playwright clicks on server-action forms after multi-step navigation can drop the `$ACTION_ID` hidden input. Workaround: hard reload before clicking, or call actions via direct POST with Next-Action header.

---

## §11 ANTI-PATTERNS FROM PRE-VISION HISTORY (TO AVOID)

- Cluster 7.33/7.35: LLM extractor fragility — natural phrasing variants broke the chat onboarding. → **Don't use LLM for mechanical data extraction.**
- Cluster 7.30: client-side prefetch of dashboard route seeds bills via `liveBillsFromDb` even when onboarding incomplete (because `requireCompletedOnboarding` bypasses under `COMPASS_SANDBOX=1`). Not a bug per se but worth knowing.
- Cluster 7.35 dual approach: (1) widen mock-LLM extractors + partial-income state; (2) refine stuck-detector with `MIN_TURNS_BEFORE_DETECT=2`, `lastQuestionRepeated`, `postNudgeRegression`. Both layers matter.

---

## §12 WHAT THE VISION MEANS FOR EVERY CLUSTER

| Vision principle | Cluster implementation |
|---|---|
| Canonical Financial State | Cluster 7.36 wizard captures accounts/envelopes/pay-schedule/goals into Prisma |
| Rules state-aware | Cluster 7.38+ builds Policy Engine |
| Auditability | Every server action that mutates state must write audit row |
| Idempotent execution | Server actions must check before write (e.g. `markStepCompleted` checks current state) |
| UX simplicity | Wizard is 5 clear steps, not free-form chat |
| Deterministic > LLM | Form fields for structure, LLM for interpretation |
| Pay period is unit of truth | Future execution engine keys on pay-period events |

---

**MEMORY STATUS**: ✅ Vision read, distilled, stored. Both `/workspace/memory/compass-vision.md` (full copy) and `/workspace/memory/compass-vision-summary.md` (distilled). Every future cluster scope should re-read §7 checklist and §0 principle before committing.
