# Compass — Vision & Roadmap (source of truth)

**Date**: 2026-09-25
**Source**: `/workspace/attachments/de8639c4b248b548/vision.docx` (xkryptic, 2026-09-24)
**Audience**: Every agent working on Compass. Read this before scoping any cluster. It overrides narrow interpretations of feature requests.

---

## 0. The single most important principle

> **Don't let Compass become a collection of financial features. Make every feature feed the same financial state → policy → decision → execution loop.**

> **The ultimate test**: *"If the user disappeared after configuring Compass, would Compass still correctly carry out the financial plan?"*

If the answer becomes yes, within the boundaries the user authorized, Compass has crossed from "budgeting application" → "financial planning and automation platform" → "personal financial operating system."

---

## 1. Product Definition

**Category**: A financial planning and automation platform evolving toward a personal financial operating system.

**Tagline**: *"Your money, guided."*

**The user establishes financial intentions, rules, priorities, and constraints. Compass then progressively takes responsibility for carrying those decisions forward.**

**Central distinction**: "I made a financial plan" → "My financial plan actually gets carried out."

**Core progression**:
```
Budgeting → Planning → Automation → Financial Policy → Financial Operating System → Decentralized/Vault Layer
```

**Important transition**: from displaying financial information to **acting on financial intent**.

---

## 2. What Compass already has (foundation to preserve)

### Product architecture
- Next.js / React / TypeScript / Prisma
- SQLite (legacy) with PostgreSQL-ready architecture (now Neon in prod)
- TanStack Query / Zustand
- Plugin architecture / API layer / AI provider abstraction
- Modular widget system / drag-and-drop layouts / saved views

### Financial concepts (already in schema)
- Accounts / Envelopes / Transactions / Pay periods / Allocation rules
- Bills / Goals / Audit logs / Routing levels / AI tiers

### Product philosophy (load-bearing decisions)
1. **Pay period is the unit of truth** — allocation happens around actual paycheck events.
2. **Plans can become automated** — not just suggested.
3. **Envelopes are intended to enforce financial boundaries** — not just visualize.
4. **Financial actions should be auditable** — every autonomous action has a trace.
5. **Interface should remain understandable to a normal user** — complexity in system, simplicity on surface.
6. **System should progress toward autonomous financial management** — that's the trajectory, not a side-feature.

---

## 3. The 25-Phase Roadmap

### PHASE 1 — Establish the Canonical Financial State

**Objective**: One authoritative representation of the user's current financial situation. Compass should be able to answer "What is the user's financial state right now?"

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

**Deliverable**: Canonical financial-state layer that other systems consume. The pattern:

```
Transaction → Account → Financial State
Financial State → Rules → Proposed Actions
```

This becomes extremely important later.

---

### PHASE 2 — Make the Rules State-Aware

Rules shouldn't just mean: "When paycheck arrives, put X dollars into Y."

They should eventually understand context:
- "Put $300 into savings"
- vs. "Put enough into savings to reach the target, but don't violate the current-period obligations or available-cash requirements"

Rules eventually evaluate: current balance / target balance / available income / remaining pay-period obligations / previous allocations / upcoming bills / goal progress / account constraints / envelope limits / priority / rule status.

---

### PHASE 3 — Rule Priority and Conflict Resolution

Multiple rules will compete. Example:
```
Rent requires        $900
Groceries require    $250
Emergency savings    $300
Debt                 $400
User only has      $1,200
```

**Conceptual hierarchy** (configurable, not hard-coded as universal advice):
1. Required obligations
2. Essential living expenses
3. Safety / buffer
4. User-defined priorities
5. Growth / savings
6. Optional spending

**Critical principle**: Compass should NEVER silently choose between competing policies. Deterministic conflict-resolution mechanism required.

---

### PHASE 4 — Dry-Run / Preview Engine

Before execution, calculate: *"If this paycheck were processed right now, what would Compass do?"*

Output: a proposed execution plan. Example:
```
Paycheck received: $2,400
Rent                +$900
Groceries           +$250
Utilities           +$150
Buffer              +$200
Savings             +$300
Debt                +$400
Remaining           +$200
```

User must be able to understand the result. Especially important before increasing automation.

---

### PHASE 5 — Execute the Plan

```
Financial State → Rules → Proposed Actions → Execution
```

**Execution requirements**: deterministic / transactional / persistent / idempotent / auditable.

**Critical safeguard**: Running the same event twice should NOT allocate the paycheck twice.

---

### PHASE 6 — Hard Enforcement

If an envelope or financial constraint is supposed to be enforced, the system should actually enforce it.

Example: envelope limit = $500. Compass shouldn't just display "You've exceeded your $500 limit."

**Possible behaviors** (configurable):
- Hard block
- Warning
- Require override
- Automatically rebalance
- Move money from another eligible envelope
- Flag the violation

The exact behavior depends on user configuration and constraint type.

---

### PHASE 7 — Insufficient Funds Logic

When intended allocations exceed available resources:

```
Available: $1,000
Rent            $700
Utilities       $200
Groceries       $250
Shortfall:      $150
```

The system must determine:
- What gets funded
- What gets partially funded
- What gets deferred
- What gets flagged
- What gets rolled forward
- What gets recalculated

**Most important**: Never pretend the allocation succeeded when it didn't.

---

### PHASE 8 — Persistent Plan State

Plans need explicit states:
- **Draft** — user is designing the plan
- **Active** — plan is currently governing financial behavior
- **Paused** — plan remains saved but does not execute
- **Completed / Archived** — plan is no longer active
- **Needs Attention** — system encountered something preventing normal execution

Critical for automation lifecycle.

---

### PHASE 9 — Automatic Paycheck Processing

```
User gets paid
  ↓
Compass recognizes the paycheck
  ↓
Determines the applicable pay period
  ↓
Builds current financial state
  ↓
Evaluates active policies
  ↓
Calculates allocations
  ↓
Validates constraints
  ↓
Executes
  ↓
Updates balances
  ↓
Records audit trail
  ↓
Shows the user what happened
```

This is the core automation loop.

---

### PHASE 10 — Auditability

Every automated financial decision should have an explanation.

Not: "$300 was allocated."

Instead: "$300 was allocated to Emergency Savings because your active plan targets $1,000, your current balance was $700, and this paycheck left sufficient funds after required obligations."

User must be able to trace: What happened → Why → Which rule caused it → What state existed → What changed.

Essential for trust.

---

### PHASE 11 — Exception Handling

Automation cannot assume everything will always be normal. Compass needs to recognize:
- Unexpected paycheck
- Missing paycheck
- Unusually large paycheck
- Unusually small paycheck
- Duplicate transaction
- Reversed transaction
- Insufficient funds
- Unexpected bill
- Rule conflict
- Inactive account
- Invalid allocation
- Stale plan
- Target already satisfied
- Target exceeded

The system should respond intelligently rather than blindly execute.

---

### PHASE 12 — User Experience

The user should NOT need to understand the machinery underneath Compass. Complexity belongs in the system.

The interface should communicate:
1. What happened?
2. Why did it happen?
3. What's coming next?
4. Is anything wrong?
5. What does the user need to do?

That's it. The system can be extremely sophisticated underneath while remaining simple on the surface.

---

### PHASE 13 — Measure the Right Thing

**One particularly useful metric**: How much ongoing financial work does the user still have to perform after setup?

If the user has to:
- Manually categorize everything
- Manually allocate every paycheck
- Constantly rebalance
- Repeatedly calculate targets
- Manually check every bill
- Manually correct every plan

…then Compass is still fundamentally a budgeting application.

If the user establishes the system and Compass increasingly handles the work: that's when it becomes a financial operating system.

---

### PHASE 14 — AI Layer

**AI should ENHANCE the financial engine rather than REPLACE deterministic financial logic.**

AI can eventually help with:
- Categorization
- Explanations
- Anomaly detection
- Forecasting
- Natural-language queries
- Scenario analysis
- Recommendations
- Narrative reports
- Identifying patterns

**But**: Financial state and execution must remain deterministic. AI should NOT arbitrarily decide where money went.

This distinction is extremely important.

---

### PHASE 15 — Trust / Safety Architecture

Before autonomous behavior expands, establish:
- Audit logs
- Deterministic execution
- Idempotency
- Permissions
- Explicit plan states
- Rollback / reversal mechanisms where applicable
- Exception handling
- Transparent explanations
- User-configurable automation levels

The more autonomous Compass becomes, the more important this layer becomes.

---

### PHASE 16 — Budgeting Completion Gate

Before moving into the decentralized/vault expansion, establish a hard milestone:

**Compass Budgeting Engine Complete** — must demonstrate:

**Setup**:
```
User creates accounts
  ↓
Creates envelopes
  ↓
Defines pay schedule
  ↓
Defines financial goals
  ↓
Creates allocation policies
  ↓
Activates plan
```

**Paycheck**:
```
Paycheck enters
  ↓
Compass recognizes it
  ↓
Determines pay period
  ↓
Calculates financial state
  ↓
Evaluates rules
  ↓
Produces allocation plan
  ↓
Validates constraints
  ↓
Executes
  ↓
Updates balances
  ↓
Creates audit record
  ↓
Explains result
```

**Exception**:
```
Something changes
  ↓
Compass recognizes changed state
  ↓
Recalculates
  ↓
Handles conflict / shortfall
  ↓
Notifies user if intervention required
```

If that entire loop works, the budgeting foundation is genuinely doing something different from a conventional budgeting application.

---

### PHASE 17+ — Vault / Decentralized Layer

Only after the budgeting engine is solid. The vault should NOT be bolted onto an unfinished budgeting system.

```
Budgeting Engine
  ↓
Financial Policy Engine
  ↓
Personal Treasury
  ↓
Vault
  ↓
Decentralized Financial Infrastructure
```

The budgeting system becomes the user's **intent and policy layer**. The vault becomes part of the **execution / custody / financial infrastructure layer**. That separation is valuable.

---

## 4. Longer-Term Architecture

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

## 5. Backlog Ideas (keep visible, not necessarily immediate)

| Idea | What it does |
|---|---|
| **Financial state timeline** | See how financial state has evolved over time |
| **What-if engine** | "What happens if I increase savings target by $100/paycheck?" |
| **Financial simulation** | Project multiple pay periods forward |
| **Automatic rebalancing** | When circumstances change, Compass adapts the plan |
| **Goal intelligence** | Goals influence allocation decisions, not just display progress |
| **Adaptive policies** | Rules respond to changing circumstances while respecting user boundaries |
| **Financial health signals** | Multidimensional picture: liquidity / obligations / buffer / debt / goals / volatility / spending capacity |
| **Natural-language financial control** | "I need to save $5,000 by June without affecting rent or groceries" → proposed policy |
| **Explainable autonomy** | Every autonomous action remains understandable |

---

## 6. Execution Stages (A → I)

| Stage | Objective |
|---|---|
| **A** | Understand current implementation — inventory existing budgeting code, map Prisma models to workflows, map APIs to workflows, map UI to workflows, identify implemented/partial/missing |
| **B** | Financial State — define canonical financial state, implement state calculation, test against real scenarios |
| **C** | Policy Engine — connect allocation rules to financial state, conditions, priority, conflict resolution, insufficient-funds behavior |
| **D** | Execution — dry-run allocation, validate proposed actions, execute atomically, idempotent, update balances |
| **E** | Automation — plan states, paycheck detection/processing, auto-trigger policy evaluation, exception handling, audit events |
| **F** | UX — show what happened / why / what's coming / exceptions / keep complexity invisible |
| **G** | Validation — complete pay-period lifecycle, unusual income, insufficient funds, duplicate transactions, conflicting rules, paused plans, plan changes, period rollover, auditability |
| **H** | **Completion Gate** — run a complete zero-touch paycheck scenario; verify every state transition, every automated decision, the user understands everything that happened |
| **I** | Vault / Decentralized Expansion — only after H passes |

---

## 7. What this means for cluster scoping

**Before scoping any feature, ask**:
1. Does this feed the `state → policy → decision → execution` loop?
2. Is the data going through the canonical Financial State, or am I building a side-feature?
3. Is the AI enhancing the deterministic engine, or replacing it?
4. Would this work after the user disappeared? (or does it require ongoing user attention?)

**Red flags** (likely wrong cluster):
- Adding a UI surface that bypasses the canonical state
- Using the LLM to extract structured data from free-form text (fragile)
- Adding features without auditing capability
- Adding automation without exception handling
- Silent conflict resolution between rules
- Letting the LLM decide where money goes

**Green flags** (likely right cluster):
- Adds a column to Financial State or a new derived state
- Validates with a unit test that mimics a real pay period
- Has a deterministic default and a configurable override
- Generates an audit row
- Surfaces the result clearly to the user (per Phase 12 UX rules)

---

## 8. The cluster queue (current state, post-vision re-read)

**Active**: Cluster 7.36 — 5-step setup wizard at `/setup`. Aligns with Phase 1 (Canonical Financial State) and Stage A (Inventory + setup).

**Next (after 7.36)**:
- **7.37** — Real Plaid integration (Plaid production creds, Link UI, webhook handler, encrypted access-token storage). Fills pay-schedule step from real bank data.
- **7.38** — Policy Engine (Stage C). Rule priority, conflict resolution, insufficient-funds logic.
- **7.39** — Execution engine (Stage D). Dry-run preview, atomic allocation, idempotency.
- **7.40** — Automation (Stage E). Paycheck detection, auto-trigger, exception handling.
- **7.41** — UX for the engine (Stage F). "What happened / why / what's next" surfaces.
- **7.42** — Validation suite (Stage G). Edge-case tests.
- **7.43** — **Completion Gate** (Stage H). Zero-touch paycheck scenario.

**Deferred**: Vault / Decentralized (Stage I). Only after H passes.

**Already shipped (foundation)**:
- Cluster 7.28 — Sinking funds
- Cluster 7.29 — Spending trends card
- Cluster 7.30 — Mobile shell polish
- Cluster 7.31 — Compass Rose logo
- Cluster 7.32 — Auth refactor (multi-user ready, gated to single-user for mom v1)
- Cluster 7.33 — Onboarding stuck-detector + envelope-detail DB read
- Cluster 7.34 — Sign-out button + re-do onboarding card
- Cluster 7.35 — Onboarding extractor fixes + stuck-detector refinement

---

## 9. References

- Source document: `/workspace/attachments/de8639c4b248b548/vision.docx`
- Cluster specs: `/workspace/compass/00-CLUSTER-*.md`
- HANDOVER: `/workspace/compass/HANDOVER.md`
- Runbook (mom-launch): `/workspace/compass/00-MOM-LAUNCH-RUNBOOK.md`

**Whenever this document and a cluster spec disagree, this document wins.** Cluster specs are scoped within the vision. If a scope change is needed, update both.
