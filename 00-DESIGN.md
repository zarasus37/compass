# Compass — Design Spec (Stage 1)

> Status: **v1.0 — Stage 1 (Design) complete. Stage 2 (Creation) unblocked.**
> Audience for this doc: xKryptic (you) and anyone helping build it.
> Stage 2 begins from this spec; see Section 13 for the handoff.

---

## Brand

- **Name**: **Compass**
- **Tagline**: *Your money, guided.*
- **Rationale**: single-word, 2 syllables, brandable as both noun and verb ("compass your spending"). Domain-agnostic so the product can grow beyond pure budgeting. Plays well with the AI co-pilot framing (guidance, direction-finding in your money).
- **Design vibe**: Airtable-meets-treasury — dense, data-first, every column and section configurable.

---

## Decisions Log (v1.0)

| # | Decision | Choice | Why |
|---|---|---|---|
| D1 | Primary user | xKryptic's mom, built to world-class standard | "For my mom, but must-have" |
| D2 | AI capability | Per-user tier (0/1/2/3), user picks | "Levels of choice based on what experience they want" |
| D3 | Layout | Modular widget system + drag-and-drop + saveable views, structural from day one | "User can make any layout changes based on their use case" |
| D4 | Routing in v1 | **L1 — planned routing with rules** (L0 tracking implicit, L2 future) | "L1, full intent behind every feature and spec" |
| D5 | AI provider | **Mavis internal primary + Ollama local fallback**, swappable via abstraction | "No monthly payment requirement to use the app" |
| D6 | App name | **Compass** | Clean, future-proof, fits guidance + data duality |
| D7 | Auth | **Email + password** (hashed), single-user, simple | "Simple login so info is saved and protected" |
| D8 | Design vibe | **Airtable-meets-treasury** — dense, data-first, every column/section configurable, spreadsheet-like with full creative control | "Spreadsheet-y, full creative control and adjustments" |
| D9 | Mobile | **PWA-ready, native deferred** (perfect desktop first, then mobile) | "Mobile definite option, after we perfect everything" |
| D10 | Stack | **Next.js monolith + plugin architecture + API routes for external integrations** | "Hybrid: monolith + API + spec plugins" |

---

## 0. Vision (restated, to confirm we're aligned)

- **Built FOR** xKryptic's mom — a real person with real money.
- **Built TO** a world-class standard — anyone serious about budgeting should want this app. Not a "mom app." A real product that happens to be designed for someone who isn't technical.
- **AI is tiered, not binary** — per-user setting: Assistive → Co-pilot → Autonomous. Mom starts at Tier 0 (off) or Tier 1; you might run it at Tier 3. Same codebase, different feature gates.
- **Layout is user-configurable** — modular widget system, drag-and-drop, saveable views. Every user builds the dashboard that fits their life.
- **"Budget accountability"** — money flows through the app *conceptually* from day one (tracking + rules), and *literally* if the user opts into bank routing later. The app is a treasury, not just a spreadsheet.

---

## 1. Audience

**Primary user**: xKryptic's mom.
- Not technical.
- Needs clarity over cleverness.
- Privacy-sensitive (financial data — local-first by default).
- Real-world constraints: phone-first usage likely, occasional desktop, low tolerance for friction.

**Target bar**: A "must-have" personal finance app. The kind that, once you use it, you can't go back to a spreadsheet. Examples of the bar: Copilot Money, Monarch Money, YNAB, Copilot — but modern, AI-native, and modular.

**Secondary users** (future, not v1):
- Other family members (household view).
- Possibly public launch — architecture should not paint us into a corner.

---

## 2. Core Concepts (the vocabulary of the app)

| Concept | What it is | Example |
|---|---|---|
| **Account** | A place money lives. | Chase Checking, Amex, Cash on hand |
| **Envelope** | A bucket of *purpose* with a target balance. | Rent, Groceries, Vacation, Emergency |
| **Transaction** | Money in or out, tied to an account + (optional) envelope. | -$45.12 at HEB on 2026-08-15, from Groceries envelope |
| **Rule** | Automatic logic that creates or modifies transactions/alerts. | "Every paycheck, send $500 to Rent envelope" |
| **View** | A saved dashboard layout — a configuration of widgets. | "Daily glance", "Bill-paying mode", "Monthly review" |
| **Widget** | A modular UI block on the dashboard. | QuickAdd, AccountSummary, EnvelopeProgress, CashflowChart, AIChat |
| **AI Tier** | Per-user setting (0/1/2/3) gating AI feature surfaces. | Mom = 1, you = 3 |
| **Audit Log** | Every AI/automated action is recorded for review. | "Tier 3: auto-allocated $500 to Rent on 2026-08-15" |
| **Routing Level** | L0 (tracking) / L1 (planned) / L2 (actual ACH via Plaid). | Mom = L0 v1, future = L2 |

---

## 3. Feature Surface (organized by AI tier)

### Foundation — always on, no AI required

- **Accounts**: CRUD, balance, manual reconciliation, CSV import.
- **Envelopes**: CRUD, target balance, refill cadence, color/icon, sort order.
- **Transactions**: manual entry, bulk import (CSV), filters, search, edit, delete.
- **Dashboard**: modular widgets, saveable views, drag-and-drop layout editor.
- **Reports**: spend by envelope, by time, by account. Charts.
- **Recurring detection**: "this $14.99 looks like Netflix — make it a rule?"
- **Allocation rules**: distribute income across envelopes by percentage/fixed amount.
- **Data import/export**: CSV in, JSON out. Full data ownership.
- **Privacy**: local-first possible, encrypted at rest.

### Tier 1 — AI-Assistive (gated by ai_tier >= 1)

- **"Ask your money"** — natural-language Q&A over your data ("how much did I spend on coffee last quarter?").
- **"Categorize for me"** — single-click AI categorization on an untagged transaction.
- **Smart search** — natural-language filters ("groceries in march over $50").
- **Email/receipts OCR import** (opt-in) — forward receipts, app extracts amount/merchant/date.

### Tier 2 — AI Co-pilot (gated by ai_tier >= 2)

- **Anomaly alerts** — "you spent 40% more on dining this week vs. your average."
- **Cashflow forecast** — "at this rate, you'll be short $300 by month-end."
- **Subscription audit** — "you have 3 streaming subs; 1 hasn't been used in 60 days."
- **What-if scenarios** — "if I buy this $1,200 laptop, what's left for vacation?"
- **Monthly narrative report** — "here's what happened in your money this month."

### Tier 3 — AI Autonomous (gated by ai_tier >= 3)

- **Auto-allocate incoming money** per rules — no human click needed.
- **Auto-rebalance envelopes** when targets drift.
- **Surface tax-deductible spend** at year-end.
- **Pre-draft routine transfers** — user confirms with one click.
- **Proactive nudges** — "you usually refill gas on the 5th, want to make that a rule?"
- **Audit log** is mandatory at this tier.

---

## 4. Layout Customization (the always-on requirement)

This is **structural**, not a feature — it's how the app is built from day one.

### Building blocks

- **Widget registry** — every dashboard element is a registered widget with a stable ID, default config, and React component. Examples: `QuickAdd`, `AccountSummary`, `EnvelopeProgress`, `RecentTransactions`, `CashflowChart`, `AIInsights`, `AIChat`, `UpcomingBills`, `NetWorth`, `GoalTracker`, `SubscriptionWatch`.
- **Slot system** — each page has named slots (`header`, `main-left`, `main-right`, `sidebar`, `footer`). Widgets go in slots.
- **Drag-and-drop** — user drops widgets into slots, reorders, removes. dnd-kit or similar.
- **Widget config** — each widget has its own settings panel (which envelope, which time range, which account, etc.). Persisted per view.
- **Saved views** — multiple named layouts per page, switchable. E.g.:
  - `Daily glance` — QuickAdd + NetWorth + UpcomingBills + RecentTransactions
  - `Monthly review` — CashflowChart + EnvelopeProgress (all) + AIInsights
  - `Bill-paying mode` — UpcomingBills (full) + AccountSummary + AIChat
- **Per-page layouts** — dashboard is the main one, but `/transactions`, `/insights`, etc. also use the same slot system so power users can customize everything.
- **Mobile responsive** — layouts adapt to mobile/tablet, but user can configure a separate mobile layout if they want.
- **Defaults** — new users get a curated starter view (`Daily glance`). Fully replaceable.

### Why this matters

Mom's view is different from your view. Same app, different surfaces. The widget system is what makes that possible without forking the UI.

---

## 5. Treasury / Routing ("budget accountability")

This is the third pillar of the vision. **L1 is in v1, full intent behind every feature and spec.**

### Three levels — user picks

| Level | What it does | Complexity | v1? |
|---|---|---|---|
| **L0 Tracking-only** | App records transactions. No money actually moves through the app. | Low | ✅ Yes (implicit, foundation) |
| **L1 Planned routing** | User defines rules. App shows what *would* happen. User executes manually. | Medium | ✅ **Yes — first-class feature in v1** |
| **L2 Actual routing** | App connects to bank(s) via Plaid, ACH-initiated transfers per rules. | High (compliance, OAuth, vendor) | ❌ Future |

**Key design decision**: the data model is **the same** across L0/L1/L2. Only the "execute" step differs. So L0/L1 ship first; L2 is a future feature without schema migration.

### Concrete flow (L1)

```
Income arrives → user creates "Income" transaction
  → Allocation Rule: "Income: 40% → Rent, 20% → Groceries, 30% → Savings, 10% → Fun"
  → App shows: "Allocate $2,000 from Chase Checking to: Rent $800, Groceries $400, Savings $600, Fun $200"
  → User confirms → envelope balances update, audit log entry written
  → Each envelope has a destination_account_id → "send $800 to Landlord ACH" (L2 later, same data structure)
```

### Rule types (L1 in v1)

- **Allocation rules** — distribute income across envelopes (percentage, fixed amount, or hybrid).
- **Recurring rules** — auto-create transactions on a schedule (Netflix $14.99 / month).
- **Alert rules** — "notify me if Dining exceeds $X this week" / "warn me if any envelope drops below $Y".
- **Routing rules** (L2, future) — actually move money between accounts.

### Rules engine design (full v1 intent)

- **DSL-light**: rules are structured JSON in `Rule.config`, not free-text. The UI builds them.
- **Deterministic + auditable**: every rule run produces a proposed change + diff. User approves or rejects. Audit log entry.
- **Dry-run mode**: any rule can be "preview"ed to see what it *would* do across historical data.
- **Conflict resolution**: if two rules touch the same envelope/transaction, the UI shows the conflict, not silent overwrite.
- **Testable**: each rule has a "test with last 90 days" button.

---

## 5a. Plugin Architecture

Per the "hybrid monolith" stack decision (D10). The core app stays simple; the plugin layer handles swappable parts.

### Plugin types (registry-driven)

- **AI providers** — Mavis internal, Ollama, (future: OpenAI, Anthropic). One interface; many implementations.
- **Import formats** — CSV (v1), OFX/QIF (future). Plugin defines parser + column mapping UI.
- **Widget plugins** — custom widgets for the dashboard. Manifest declares widget id, schema, default config.
- **Routing integrations** (future L2) — Plaid, etc. Plugin defines auth + transfer primitives.
- **Notification channels** (future) — email, push, SMS. Plugin defines sender.

### Plugin contract (sketch)

```ts
interface AIProviderPlugin {
  id: string;                 // "mavis-internal", "ollama-local"
  displayName: string;
  capabilities: ("chat" | "categorize" | "embed" | "stream")[];
  complete(prompt: string, opts?: CompleteOpts): Promise<Completion>;
  // ... typed per capability
}
```

A plugin registry loads from a config file. Switching providers = swap the config, not a code change. The app code only knows the interface.

### Why this matters

- Mom's app never depends on a single vendor.
- We can ship with Mavis internal, and any user can opt into Ollama for fully local.
- New import formats (QIF, OFX, PDF statements) become plugins, not rewrites.

---

## 6. Data Model (high level)

```
User
  - id, name, email, password_hash (or auth_method)
  - ai_tier: 0|1|2|3            (per-user setting)
  - routing_level: 0|1|2        (per-user setting)
  - default_view_id: uuid
  - settings: json              (theme, currency, locale, etc.)
  - created_at, updated_at

Account
  - id, user_id, name, type (checking|savings|credit|cash|other), current_balance
  - institution, mask (last 4), routing_enabled (L2 feature flag)
  - is_archived: bool
  - sort_order

Envelope
  - id, user_id, name, target_balance, refill_cadence (weekly|biweekly|monthly|none)
  - current_balance (computed or cached)
  - destination_account_id (optional — where money from this envelope goes in L1/L2)
  - color, icon, sort_order, is_archived

Transaction
  - id, user_id, account_id, envelope_id (nullable)
  - amount (signed: +income, -expense)
  - date, payee, notes
  - source: manual|csv|recurring|ai_suggested|routing
  - ai_metadata: json           ({ suggested_envelope, confidence, ... })
  - recurring_rule_id (if generated by recurring detection)
  - cleared: bool               (for reconciliation)

Rule
  - id, user_id, type (recurring|allocation|alert|routing)
  - config: json                (type-specific)
  - enabled: bool
  - last_run_at, last_result

View (saved layout)
  - id, user_id, name
  - page: string                (which page this view is for: 'dashboard', 'transactions', ...)
  - config: json                (slot → [{ widget_id, widget_config, order }])
  - is_default: bool
  - is_mobile_specific: bool

Widget (registry, not stored in DB — code-defined)
  - id, component, default_config, schema, allowed_pages, min_size

AuditLog
  - id, user_id, action_type, payload, ai_tier_at_time, created_at
  - for L2 actions and Tier 3 autonomous actions

ImportBatch
  - id, user_id, file_name, source, status, transaction_count, error_log
```

---

## 7. Pages & Routes

| Route | Purpose | Notes |
|---|---|---|
| `/` | Dashboard | Default view, customizable |
| `/transactions` | All transactions, filters, bulk actions | Per-row AI actions at Tier 1+ |
| `/accounts` | Accounts management | |
| `/envelopes` | Envelopes + refill status | |
| `/rules` | All rules (recurring, allocation, alerts) | |
| `/insights` | AI insights (gated by ai_tier) | Tier 2+ shows full content |
| `/reports` | Charts and reports | |
| `/settings` | User settings, AI tier, layout defaults, import/export | |
| `/chat` | AI chat | Also available as floating widget |
| `/login` (or `/`) | Auth | Single-user can be PIN/password/biometric on mobile |

---

## 8. Tech Stack (Hybrid Monolith — locked)

A **Next.js monolith** as the core, with a **plugin architecture** for swappable parts, and **dedicated API routes** for external integrations.

### Core app

- **Next.js 16** (App Router) + **React 19** + **TypeScript 5.7+**
- **Tailwind v4** + **shadcn/ui** + **Radix UI** primitives
- **Prisma** ORM + **SQLite** (file-based, perfect for single-user + future Postgres migration)
- **TanStack Query** for client cache
- **Zustand** for client state (active view, draft transactions, widget config overrides)
- **dnd-kit** for drag-and-drop layout
- **Recharts** (or **Tremor**) for charts
- **Single deploy** (Vercel or self-host), fastest iteration

### Plugin layer (see Section 5a)

- AI provider plugins (Mavis internal, Ollama, future OpenAI/Anthropic)
- Import format plugins (CSV v1, OFX/QIF future)
- Widget plugins (custom dashboard widgets)
- Routing integration plugins (future L2)
- Notification channel plugins (future)

### API routes (for external integrations)

- `/api/*` for: Plaid webhooks (future L2), CSV import/export endpoints, public auth callbacks
- Server actions for internal mutations (type-safe, no API surface needed)
- Streaming endpoints for AI responses (server-sent events for chat, insights)

### Auth

- **Email + password** (single-user, simple). Hashed with argon2id or bcrypt.
- Future: magic link, biometric (when mobile lands), OAuth for household multi-user.
- No third-party auth dependency in v1 — keeps the app self-contained.

---

## 9. Implementation Order (Stage 2 preview)

This is the *intended* order, not a contract. We'll confirm before starting.

1. **Scaffold** — Next.js 16, Tailwind v4, shadcn, Prisma, SQLite, TanStack Query, dnd-kit, Recharts, plugin registry skeleton.
2. **Auth** — email + password (argon2id), single-user, session-based. No third-party deps.
3. **Core data model + migrations** — User, Account, Envelope, Transaction, Rule, View, AuditLog, ImportBatch.
4. **Plugin registry** — AI provider, import format, widget plugin interfaces. Wire up Mavis internal + Ollama adapters (load via config).
5. **Manual transaction entry** + accounts + envelopes CRUD.
6. **Dashboard with 3 starter widgets** — NetWorth, RecentTransactions, QuickAdd. No drag-drop yet.
7. **Layout customization system** — widget registry, slot system, drag-drop, save views. **This is the structural piece — gets its own milestone.**
8. **CSV import** + recurring detection.
9. **Allocation rules engine** (L1 routing) — DSL-light, dry-run mode, audit log.
10. **AI Tier 1** — chat, smart categorize, natural-language search.
11. **AI Tier 2** — insights, anomaly, forecast, what-if, monthly narrative.
12. **AI Tier 3** — autonomous actions + audit log.
13. **Reports & charts** (deeper than the dashboard widgets).
14. **Mobile PWA polish** — install prompt, offline-first basics.
15. **Plaid integration (L2 routing)** — future.
16. **Hardening, error handling, tests** — Stage 3 prep.

---

## 10. Decisions (resolved)

All 7 design questions answered — see **Decisions Log** at top of doc (D1–D10).

| Original Q | Status | See |
|---|---|---|
| Routing level for v1 | ✅ L1 (full intent) | D4 + Section 5 |
| AI provider | ✅ Mavis internal + Ollama fallback, swappable | D5 + Section 5a |
| App name | ⏳ TBD (asked below) | D6 |
| Auth model | ✅ Email + password (hashed) | D7 + Section 8 |
| Design vibe | ✅ Airtable-meets-treasury (spreadsheet-y, full creative control) | D8 |
| Mobile | ✅ PWA-ready, native deferred | D9 |
| Stack | ✅ Hybrid: Next.js monolith + plugins + API routes | D10 + Sections 5a, 8 |

---

## 11. What I'm NOT doing yet (Stage 1 is design only)

- ❌ No code yet. No `package.json`, no `prisma init`, no `npx shadcn add`.
- ❌ No deployment target picked.
- ❌ No LLM calls made.
- ❌ No vendor signups (Plaid, Stripe, etc.) — that's L2 territory and future.

---

## 12. Acceptance criteria for moving to Stage 2 (creation)

All gates green as of v1.0:

- [x] Vision restatement agreed. (Section 0)
- [x] Core concepts agreed. (Section 2)
- [x] Feature surface by tier agreed. (Section 3)
- [x] Layout customization model agreed. (Section 4)
- [x] Routing model agreed; v1 routing = **L1**. (Section 5)
- [x] Data model agreed. (Section 6)
- [x] Page/route structure agreed. (Section 7)
- [x] Stack picked: **Hybrid monolith**. (Section 8 + 5a)
- [x] All open questions answered. (Section 10)
- [x] Implementation order approved. (Section 9)
- [x] **Name picked: Compass.** (D6)

**Status: Stage 1 (Design) is COMPLETE. Stage 2 (Creation) is unblocked.**

---

## 13. Stage 2 — Starting Point

When Stage 2 begins, the build order (per Section 9) starts with:

1. **Scaffold** — Next.js 16, Tailwind v4, shadcn, Prisma + SQLite, TanStack Query, dnd-kit, Recharts, plugin registry skeleton.
2. **Auth** — email + password (argon2id), single-user, session-based.
3. **Core data model + migrations** — User, Account, Envelope, Transaction, Rule, View, AuditLog, ImportBatch.
4. **Plugin registry** — AI provider, import format, widget plugin interfaces. Mavis internal + Ollama adapters via config.
5. **Manual transaction entry** + accounts + envelopes CRUD.
6. **Dashboard with 3 starter widgets** (no drag-drop yet).
7. **Layout customization system** — widget registry, slot system, drag-drop, save views. *Structural milestone.*
8. **CSV import** + recurring detection.
9. **Allocation rules engine** (L1 routing).
10. **AI Tier 1** — chat, smart categorize, natural-language search.
11. **AI Tier 2** — insights, anomaly, forecast, what-if, monthly narrative.
12. **AI Tier 3** — autonomous actions + audit log.
13. **Reports & charts**.
14. **Mobile PWA polish**.
15. **Plaid (L2 routing)** — future.
16. **Hardening + tests** — Stage 3 prep.

### Recommended handoff

For a build of this scope, a **fresh session** should pick up Stage 2 with this design doc as the contract. The fresh session loads with the locked spec and starts at the scaffold step — no re-litigation of decisions. See the `app-builder` skill's coordination workflow for stage handoff conventions.

### Naming the project files

In code, the project should be referenced as **`compass`**:
- `package.json` name: `compass`
- Database file: `compass.db`
- Default route paths: `/`, `/transactions`, `/accounts`, `/envelopes`, `/rules`, `/insights`, `/reports`, `/settings`, `/chat`
- Logo/wordmark: **Compass** with the compass-rose mark (TBD; can be designed in Stage 2 once brand direction is set)

