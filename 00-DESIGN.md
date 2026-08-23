# Compass — Design Spec

> Status: **v4.0 — Stage 2 (Creation) in progress. Visual design language locked (Alchemical / Celestial). Product reframe: pay-period as unit of truth.**
> Audience for this doc: xKryptic (you) and anyone helping build it.
> v1.0 of this doc (Stage 1, 2026-08-21) is the foundation; v4 addenda (this version) lock the product reframe, the alchemical/celestial visual language, the new sidebar structure, the planetary vessel mapping, and the auto-allocate-without-confirm rule. Build begins from this combined spec.

---

## Decisions Log (v4.0)

| # | Decision | Choice | Why |
|---|---|---|---|
| D1 | Primary user | xKryptic's mom, built to world-class standard | "For my mom, but must-have" |
| D2 | AI capability | Per-user tier (0/1/2/3), user picks | "Levels of choice based on what experience they want" |
| D3 | Layout | Modular widget system + drag-and-drop + saveable views, structural from day one | "User can make any layout changes based on their use case" |
| D4 | Routing in v1 | **L1 — planned routing with rules** (L0 tracking implicit, L2 future) | "L1, full intent behind every feature and spec" |
| D5 | AI provider | **Mavis internal primary + Ollama local fallback**, swappable via abstraction | "No monthly payment requirement to use the app" |
| D6 | App name | **Compass** | Clean, future-proof, fits guidance + data duality |
| D7 | Auth | **Email + password** (hashed), single-user, simple | "Simple login so info is saved and protected" |
| D8 | Design vibe (v1) | ~~Airtable-meets-treasury~~ → **Alchemical / Celestial (v4)** — cosmic dark canvas, gold leaf, planetary glyphs, illuminated typography. Locked by user approval 2026-08-22 from mockup `compass-mockup-v4.html`. | "still looking for something more new age" / "no real uniqe aspect" — v3 editorial was still too basic; the alchemical mandala unlocks a unique identity |
| D9 | Mobile | **PWA-ready, native deferred** (perfect desktop first, then mobile) | "Mobile definite option, after we perfect everything" |
| D10 | Stack | **Next.js monolith + plugin architecture + API routes for external integrations** | "Hybrid: monolith + API + spec plugins" |
| **D11** | **Unit of truth** | **Pay period** (the slice between two paychecks) — NOT month, NOT transaction. Period is the organizing axis; everything else hangs from it. | Forces the app to be a *lived* finance tool, not a *logged* one. The period is when money arrives and when it must serve. |
| **D12** | **Auto-allocate behavior** | **Auto-allocate on every paycheck transaction, no confirm modal.** Once the plan is set, the system runs it. User only stops auto-allocation by editing the plan or pausing. | Eliminates the friction that makes every other budgeting app fail. Plan-as-policy, not plan-as-intent. |
| **D13** | **Sidebar structure** | **Three chapters**, in this order: **Build a plan** (above Money) → **Money** → (Overview). Final v4 names: **Cosmos** (Overview) / **The Great Work** (Build a plan) / **Substance** (Money). | Reflects the product reframe: planning is upstream of money movement. |
| **D14** | **Vessel model** | **7 planetary vessels** (one per classical planet, classical alchemical metal). Sol=Rent, Luna=Groceries, Mercury=Utilities, Venus=Joy/Dining, Mars=Buffer, Jupiter=Growth, Saturn=Debt. Additional envelopes (subscriptions, custom) are sub-vessels. | The alchemical system is the design language. Each envelope is a vessel; each vessel has a planetary glyph, a metal, and a quality. Unifies concept + visual. |
| **D15** | **Alchemical vocabulary** (refined 2026-08-22) | **Visual only.** The alchemical/planetary system is colors, glyphs, and the mandala — NOT written copy. Every word in UI/copy/code is plain English. The mapping (Sol=Rent, Luna=Groceries, etc.) is the visual system reference, not the body text. v5 mockup locked. | Mom-grade readability is non-negotiable. Esoteric words in copy made the v4 mockup too hard for the target user; v5 strips them while keeping the design. |
| **D16** | **Enforcement** | **Envelopes enforce, not just display.** Balance = 100% = hard warning. Allocation rules actually move money between accounts/envelopes (L1, no Plaid). | A budget that doesn't enforce is just a wish list. |
| **D17** | **Pay schedule** | **Biweekly, every two weeks, is the canonical pay period for v1.** Anchored to a known first-paycheck date; the period is the slice `[paycheck N, paycheck N+1)`. The scheduler derives `PERIOD_START`, `PERIOD_END`, and `NEXT_PAY_DATE` from this. Variable-income and irregular cadences are opt-in for the user's second pay schedule (future, v2). | Matches the dominant US paycheck cadence; one period ≈ 14 days, fits the rhythm of recurring bills and the mom's "I get paid Friday" mental model. |
| **D18** | **Period close** | At the moment `TODAY > PERIOD_END`, the system writes a `PeriodClose` row that snapshots the closing balances, rolls any unallocated Buffer / over-limit envelope deltas into the next period, and writes an audit entry. The user never sees a "month-end rollover" — they see a period close. | "End-of-month rollover" was a previous framing; D11 already locks the period (not the month) as the unit of truth. D18 names the transition. |

---

## Brand

- **Name**: **Compass**
- **Tagline (product level)**: *Your money, guided.*
- **Tagline (in-product, dashboard)**: *Your money, on a path.* (v6 — frames the product as a guide for life direction, not a budget tool)
- **Rationale**: single-word, 2 syllables, brandable as both noun and verb ("compass your spending"). Domain-agnostic so the product can grow beyond pure budgeting. Plays well with the AI co-pilot framing (guidance, direction-finding in your money).
- **Product framing (v6)**: Compass is **a guide to where your money is going — and where you want it to go**. Not "another budget app." It's the integration of financial data, life goals, and direction. The user is on a journey; Compass keeps them on the path.
- **Design vibe**: **Alchemical / Celestial** — cosmic dark canvas, gold leaf, planetary glyphs, illuminated typography. See **Section 0a. Visual Design Language** below. The v1 "Airtable-meets-treasury" direction was replaced by user approval 2026-08-22 from mockup `compass-mockup-v4.html`.

---

## 0. Vision (restated, to confirm we're aligned)

- **Built FOR** xKryptic's mom — a real person with real money.
- **Built TO** a world-class standard — anyone serious about budgeting should want this app. Not a "mom app." A real product that happens to be designed for someone who isn't technical.
- **AI is tiered, not binary** — per-user setting: Assistive → Co-pilot → Autonomous. Mom starts at Tier 0 (off) or Tier 1; you might run it at Tier 3. Same codebase, different feature gates.
- **Layout is user-configurable** — modular widget system, drag-and-drop, saveable views. Every user builds the dashboard that fits their life.
- **"Budget accountability"** — money flows through the app *conceptually* from day one (tracking + rules), and *literally* if the user opts into bank routing later. The app is a treasury, not just a spreadsheet.

---

## 0a. Visual Design Language (v4 — Alchemical / Celestial)

**Locked 2026-08-22 by user approval of mockup `compass-mockup-v4.html`.** This is the visual + conceptual language of the product. Every UI surface, every data display, every copy line should be answerable to this section.

### Foundations

- **Canvas**: cosmic dark mode. Deep midnight indigo backgrounds (`#06080f` void → `#0a0e1f` cosmos → `#1a2042` surface), with subtle nebula gradients (purple + teal) and a faint procedural starfield (`body::before`).
- **Leaf palette**: gold leaf is the primary accent.
  - `--gold: #d4af52` (primary leaf)
  - `--gold-glow: #f0d480` (highlight, hover)
  - `--gold-deep: #a8853a` (rule lines, secondary text)
  - `--gold-soft: #5a4824` (dimmed gold, borders)
- **Ink**: parchment text on dark.
  - `--ink: #ece6d3` (parchment on dark — primary text)
  - `--ink-2: #c4bda6` (secondary)
  - `--ink-3: #8b8770` (tertiary, captions)
  - `--ink-4: #5a5a55` (de-emphasized)
- **Planetary palette**: every planet has a unique metal. These are load-bearing throughout the app.
  - `Sol ☉` — gold `#f0c14a` — Sun-day — light, the body
  - `Luna ☽` — silver-blue `#b8c8e0` — Moon-day — the daily
  - `Mercury ☿` — quicksilver teal `#8ac0b8` — quick-silver — utilities, comms
  - `Venus ♀` — copper-rose `#d4a578` — copper — pleasure, beauty
  - `Mars ♂` — iron red `#c45a3a` — iron — defense, force
  - `Jupiter ♃` — tin purple `#9a7ac0` — tin — expansion, fortune
  - `Saturn ♄` — lead blue-gray `#a8b0c8` — lead — discipline, time
- **Status palette** (orthogonal to planetary):
  - `--ok: #6ab088` (jade, on track)
  - `--warn: #d4a050` (amber, near limit)
  - `--neg: #c45a3a` (iron, over / overflow)

### Typography

- **Display**: **Cinzel** — illuminated-manuscript display serif. Used for nav section labels, masthead tags, colophon. Wide letter-spacing, ALL CAPS, gold-deep color.
- **Big numbers**: **Italiana** — fine contemporary serif with a slight art-deco accent. Used for net worth, prima materia, vessel balances, and any "page anchor" number. Sets at 64–112px.
- **Body**: **Cormorant Garamond** — refined old-style serif. Used for headlines (H2, H3), pull-quotes, vessel names, body copy. Italic variant for de-emphasized words ("*this period.*", "*daily bread*").
- **Numerics**: **JetBrains Mono** — used for ALL numbers, units, percentages. Tabular figures (`font-feature-settings: "tnum" 1`). Always paired with a serif or display element nearby.
- **Decorative**: **Marcellus** — reserved for accent words in pull-quotes and colophon.
- **Tagline rule**: primary labels in plain English ("Vessels", "Period", "Accounts"). Alchemical vocabulary is *decoration*, not primary labeling — mom always knows what she's looking at.

### The Mandala (Compass dial — the central artifact)

The single most important visual element. Lives on the dashboard. SVG, ~460px square.

**Structure** (outer → inner):
1. **Outer ring (r=215)**: thin gold stroke, 50% opacity
2. **Latin text band (r=195)**: *VISITA INTERIORA TERRAE RECTIFICANDO INVENIES OCCULTUM LAPIDEM* running around the rim in Cinzel, 9.5pt, gold, letter-spacing 3.5
3. **Cardinal markers (4)**: small gold dots + letter labels (A/B/C/D) at N/E/S/W
4. **Planetary ring (r=170)**: dashed gold line connecting 7 planetary stations
5. **Planets (7)**: at 360°/7 ≈ 51.43° apart, starting Sol at top. Each in a colored circle with the planetary glyph + name + day-of-week
6. **Inner geometry (r=120 / r=100)**: thin gold rings; vesica piscis (two intersecting circles) representing the Sol/Luna duality
7. **Manus (hands)**: two small hand shapes from left and right, pointing inward, labeled IN/OUT (input/output, income/expense)
8. **Central compass (8-pointed star)**: 4 large cardinal points (gold) + 4 small diagonal points (gold-deep). The compass rose proper.
9. **Compass needle**: terracotta line pointing to today's planetary position (e.g. today = Saturday = Saturn, lower-left). The needle's *opposite* is a thin dashed line pointing to the next payday.
10. **Center hub**: dark circle with Cinzel "DAY" label + Italiana numeral + mono "of N" sublabel
11. **Moon (bottom)**: a crescent moon at the very bottom of the outer ring
12. **Earth (very bottom)**: a small ⊕ symbol below the moon

**Data binding**:
- The needle's position is computed from the current date in the active period
- Each planet station can be a clickable target for its associated vessel
- The 8-pointed star can be the source of nav transitions (click a point to "go to" that aspect)

### The 7 Planetary Vessels (locked mapping)

| # | Planet | Glyph | Day | Metal | Default vessel (v1) | Quality |
|---|---|---|---|---|---|---|
| 1 | Sol | ☉ | Sunday | Gold | **Rent** | the house, the body, the foundation |
| 2 | Luna | ☽ | Monday | Silver | **Groceries** | daily bread, the body's vessel |
| 3 | Mars | ♂ | Tuesday | Iron | **Buffer & Shield** | defense, the wall against surprise |
| 4 | Mercury | ☿ | Wednesday | Quicksilver | **Utilities** | light, water, the word made material |
| 5 | Jupiter | ♃ | Thursday | Tin | **Growth / Savings** | expansion, the long view |
| 6 | Venus | ♀ | Friday | Copper | **Dining & Joy** | pleasure, beauty, the gathering of kin |
| 7 | Saturn | ♄ | Saturday | Lead | **Debt Tribute** | discipline, the price of past time |

Additional vessels (subscriptions, custom envelopes) are *sub-vessels* — they can be assigned a planetary affiliation but aren't locked to one. A subscription may live under Mercury without claiming its own station.

### Alchemical vocabulary (D15, refined 2026-08-22)

**Locked principle**: the alchemical/planetary system is the **visual language** — colors, glyphs, the mandala, the sidebar 3-chapter structure. It is **NOT the written language**. Every word in the UI, copy, and code must be plain English so the mom-grade audience can read it without translation. Astrological/alchemical references in the *body copy* must be extremely subtle or absent.

**What stays (visual only — non-verbal cues)**:
- The 7 planetary glyphs (☉ ☽ ♂ ☿ ♃ ♀ ♄) used as iconography, color associations, and visual rhythm
- The cosmic dark canvas and gold leaf palette
- The Cinzel / Italiana / Cormorant typography
- The alchemical mandala on the dashboard (with its Latin inscription as a decorative ring — non-readable to a casual user, but visually anchoring)
- The day-of-week planetary glyph in the calendar header (☉ for Sunday, etc.) — these are subtle visual markers; the text labels are plain "Sun / Mon / Tue / Wed / Thu / Fri / Sat"
- The 3-chapter sidebar structure (Cosmos / The Great Work / Substance is now Overview / Plan / Money — see v5 mockup)

**What changed in v5 (word-level discipline)**:
- Sidebar chapters: **Cosmos / The Great Work / Substance** → **Overview / Plan / Money**
- Page names: **Almanac / Divination / Vessels / Chronicle** → **Calendar / Insights / Envelopes / Transactions**
- Period block: **The Great Work / Prima Materia / Distillation** → **This Period / Next Paycheck / Will be distributed**
- Vessel names: **Sol · Rent / Luna · Groceries / Mars · Buffer** → **Rent / Groceries / Buffer** (planetary glyph stays as the icon)
- Vessel subtitles: **"the house, the body, the foundation" / "daily bread" / "the wall against surprise"** → removed
- Vessel aspect lines: **"Luna in Taurus · Waxing" / "Mars · Trine" / "Mercury · Conjoining"** → removed (the bar + percent is enough)
- Transaction subtitles: **"Luna's vessel · daily bread" / "Saturn's vessel · tribute to the past"** → removed
- Transaction day headers: **"Today · Saturn's day" / "Yesterday · Venus's day"** → just **"Today · Aug 30" / "Yesterday · Aug 29"**
- Chart titles: **The Ouroboros** → **Allocation** / **The Trajectory · 12 Moons Hence** → **Net Worth Projection · 12 Months**
- Moon panel: **"Luna · The Moon's Counsel"** + the "act on intentions" poetic quote → just **"Moon / First Quarter"**
- Pull-quote under the net worth: **"The Great Work is the slow, patient transmutation..."** → removed entirely
- Period block subtitle: **"Each vessel is consecrated on arrival. The remainder is offered to the work, not to the day's appetite."** → **"When your paycheck arrives, money moves into your envelopes automatically. You don't need to confirm each time."**
- Colophon: **"Compass · An Alchemical Record / Solve et coagula. / MMXXV · IV · Q3"** → **"Compass / 2025 · Q3"**
- Hero eyebrow: **"Sol · Net Worth"** → **"Net Worth"**
- Hero aspect labels: **"Saturn's debt"** → **"remaining debt"**; **"6 moons"** → **"6 months"**

**Apply (mandatory for every UI surface)**:
- Section headers: H2 in plain English, optional italic gray word for time context ("*this period.*", "*Aug 22 – Sep 4.*")
- Card titles: plain English ("Allocation", "Net Worth Projection", "Next Paycheck", "Recent Transactions")
- Body copy: instructional, not poetic. Tell the user what happens and what to do. No literary metaphors.
- Vessel names: the standard name. The planetary glyph is visual.
- Envelope status: "Complete / Over limit / 90% / 5 days remain" — no "Luna in Taurus · Waxing"
- Day headers: just dates. "Today · Aug 30", "Yesterday · Aug 29", "Aug 27".
- The alchemical vocabulary table below is **deprecated** for the body. The mapping is preserved here as a reference for the visual system (which glyph + color goes with which envelope), not as copy.

**Preserved mapping (visual reference, not copy)**:

| Standard envelope | Glyph | Color | Default day |
|---|---|---|---|
| Rent | ☉ | Gold `#f0c14a` | Sunday |
| Groceries | ☽ | Silver-blue `#b8c8e0` | Monday |
| Buffer | ♂ | Iron `#c45a3a` | Tuesday |
| Utilities | ☿ | Teal `#8ac0b8` | Wednesday |
| Savings | ♃ | Purple `#9a7ac0` | Thursday |
| Dining & Joy | ♀ | Copper `#d4a578` | Friday |
| Debt | ♄ | Blue-gray `#a8b0c8` | Saturday |

### Sidebar structure (3 chapters, locked order)

The sidebar is a vertical typographic spine, not a list. Three chapters, each with a Cinzel section label flanked by gold rule-lines.

1. **Cosmos** (Overview) — *Dashboard · Period · Almanac · Divination*
2. **The Great Work** (Build a plan) — *Map out goals · Recurring bills · Emergency fund · Investment goal · Allocation plan* (with `✦ Auto` mark on Allocation plan)
3. **Substance** (Money) — *Vessels · Chronicle · Accounts · Subscriptions · Debts · Investments*

Order matters. Cosmos is the present. The Great Work is the upstream of intention. Substance is what flows from both.

### Section header idiom

Every section uses the same pattern:
- **Cinzel eyebrow** (10–11px, gold, ALL CAPS, wide letter-spacing) on a left-flush line, optionally with a thin gold rule trailing to the right edge
- **Italiana / Cormorant H2** (28–32px, ink) with an **italic Cormorant em-tag** for the time-context word ("*this period.*", "*period 4 of Q3.*", "*recent movements.*")
- **Cinzel meta** (10px, ink-3, ALL CAPS) on the right with `<b>highlight</b>` for emphasized numbers

### Calendar idiom (The Almanac)

- Day-of-week header is a Cinzel label with the **planetary glyph above it** (☉ Sun, ☽ Mon, ♂ Tue, ☿ Wed, ♃ Thu, ♀ Fri, ♄ Sat)
- Cell is square (`aspect-ratio: 1`), dark `cosmos` background, thin gold-soft border
- **Payday cells**: gold border + gold-glow text + amount caption. Subtle radial gold glow.
- **Goal target cells**: purple (Jupiter) border + Jupiter-glow text. Radial purple glow.
- **Today cell**: lunar silver border + Luna-glow text.
- Day glyph (planetary symbol of that date) appears small above the date numeral.

### Transaction row idiom (The Chronicle)

- 4-column grid: planetary glyph in a circle (vessel affiliation) · name + italic sub · Cinzel vessel tag · mono amount (gold for income, ink for expense, ink-3 for auto/muted)
- Days are grouped under a "day header" with the day's planetary name (e.g. "Today · Saturn's day · ☽ First Quarter")
- A small lunar phase indicator can sit in the day header for celestial context

### Color-coded fill idiom

- Progress bars: status color (`ok` jade / `warn` amber / `neg` iron) with a subtle outer glow
- Over-limit envelopes (≥100%): the bar uses the `neg` color with a diagonal hatch overlay (`repeating-linear-gradient`) — visible signal that the vessel is *overfull*, not just full
- Donut arcs (Ouroboros): each arc uses the planet's metal color, not a generic palette
- The Trajectory line: a horizontal starfield backdrop, the line in a gold→gold-glow gradient, today as a vertical dashed line + gold dot, targets as outlined circles

### Iconography

- Sidebar nav items: small (16–18px) planetary/alchemical glyphs in the slot, color-shifts to gold on active
- Action buttons: Cinzel ALL CAPS with wide letter-spacing. Primary is gold-filled (`.btn`), ghost is line-bordered (`.btn.ghost`).
- The Compass wordmark: 17–19px Cinzel, letter-spacing 0.18em, ALL CAPS, ink
- The Compass-rose logo: a custom 8-pointed star SVG in gold, 38px, drop-shadow gold glow

### What this language is NOT

- NOT skeuomorphic — surfaces are flat dark, not "old book" textures
- NOT inaccessible — all text meets WCAG AA contrast against the dark canvas (parchment on midnight passes 7.4:1)
- NOT a theme — the alchemical system is structural, not toggleable. Users do not get a "light mode."
- NOT mom-confusing — primary labels (Vessels, Period, Accounts) are always plain English. The alchemical words are *additional* surface detail, never the *only* way to find a thing.

---

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
| **L1 Planned routing** | User defines rules. App shows what *would* happen. **v1: runs automatically on every paycheck transaction (D12 — no confirm modal).** User only stops auto-allocation by editing the plan or pausing. | Medium | ✅ **Yes — first-class feature in v1, auto-mode** |
| **L2 Actual routing** | App connects to bank(s) via Plaid, ACH-initiated transfers per rules. | High (compliance, OAuth, vendor) | ❌ Future |

**Key design decision**: the data model is **the same** across L0/L1/L2. Only the "execute" step differs. So L0/L1 ship first; L2 is a future feature without schema migration.

**Auto-allocate contract (D12)**: once an Allocation Plan is armed, every paycheck transaction *triggers* the distillation immediately and silently. The audit log records the action. The user sees a post-hoc summary in The Great Work card, not a confirmation modal. Plan is policy, not intent. The only ways to stop it: edit the plan, pause the plan, or delete a rule.

### Concrete flow (L1, auto-allocate)

```
1. User sets up Allocation Plan once: "Income: 40% → Sol (Rent), 20% → Luna (Groceries),
   18% → Jupiter (Growth), 8% → Mercury (Utilities), 6% → Mars (Buffer),
   4% → Venus (Joy), 4% → Saturn (Debt)" — arms the plan with one tap.

2. Paycheck arrives (e.g. +$2,400 from Chase Checking, tagged "Income", dated Aug 28)
   → Allocation engine fires automatically on insert (no UI prompt)
   → Seven ledger transfers created: +$960 to Sol, +$480 to Luna, +$432 to Jupiter, ...
   → Each vessel's balance updates
   → AuditLog entry: "L1 auto-distill: $2,400 → 7 vessels, 2026-08-28 09:14 PT"

3. User opens The Great Work card on dashboard — sees the post-hoc breakdown,
   not a confirmation. "Prima Materia $2,400 · distilled into 7 vessels."

4. To stop: open Allocation plan → edit percentages OR flip the plan to "Paused" OR
   delete a rule. The change takes effect on the *next* paycheck, not retroactively.
```

**No-confirm rationale**: every other budgeting app dies because it requires a click on payday. The user is tired, distracted, or just doesn't open the app. Auto-allocate is the product. The plan is the policy; the paycheck is the trigger; the audit log is the receipt.

---

## 5b. Allocation Strategies (the "how" of splitting income)

The plan is a *strategy* + a *number*. v1 ships with four built-in strategies; the user picks one when they arm their plan, then customizes the percentages/vessels. Each strategy produces a different default distribution of the 7 planetary vessels.

### Built-in strategies (v1)

| # | Strategy | Default split (vessels, % of income) | Mental model | Best for |
|---|---|---|---|---|
| 1 | **Envelope (Compass default)** | Sol 40% / Luna 20% / Mercury 8% / Venus 4% / Mars 6% / Jupiter 18% / Saturn 4% | "Give every dollar a job before the month begins." | Most users, especially mom. The default Compass way. |
| 2 | **Zero-based** | Forces 100% allocation by requiring a "Misc" catch-all vessel (Mercury, capped at 5–10%) | "Income − allocated = 0. No dollar unaccounted for." | Power users who want zero slack. |
| 3 | **50 / 30 / 20** | Needs 50% / Wants 30% / Savings 20% — mapped to planetary vessels (Sol+Luna+Mercury = Needs; Venus+Mars = Wants; Jupiter+Saturn = Savings) | "Half for needs, a third for wants, a fifth for the future." | New users who want a recognizable starting point. |
| 4 | **Pay-yourself-first** | Jupiter first (15–25% into Growth), then distribute the rest normally | "Savings comes off the top, before anything else." | Aggressive savers paying down debt or building emergency fund. |

### Strategy data shape

Each strategy is a **named preset** in code: `{ id, displayName, summary, defaultDistribution: { vessel, pct }[] }`. The user can:
- Pick a strategy → see its defaults
- Customize any vessel's percentage (the strategy is a starting point, not a constraint)
- Save as their active plan
- Switch strategies at any time (the change applies to the *next* paycheck)

### UI idiom

- **Allocation plan page** = a single page with the strategy picker (4 cards in a 2×2 grid) + a donut (Ouroboros) of the active distribution + per-vessel sliders for customization + a single `✦ Arm auto-distillation` CTA
- Each strategy card shows: alchemical icon, strategy name, the default distribution in tiny mono, a one-line summary
- "Auto-distillation armed" pill appears in the sidebar (next to Allocation plan) and on the dashboard's The Great Work card

### Why strategies, not just percentages

Strategies give the user a *story* for their plan. "I'm doing 50/30/20" is shareable. "I'm doing 27% / 14% / 11% / ..." is a homework assignment. The alchemical system is a *style* of money thinking; strategies are how you adopt that style.

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

### `/` Dashboard — **The Guiding Flow (v6)**, not a data dump

The main page is **not** the data view. It's a **guiding flow** that orients the user, frames the product, surfaces goals, and invites exploration of the deep pages. v6 mockup is the canonical reference.

The page reads top-to-bottom as a narrative:

1. **Welcome** — "Good evening, Mom." + product lede ("Compass is your guide to where your money is going — and where you want it to go. Every paycheck, every envelope, every goal, on a path.") + period pill
2. **Mandala hero** — The alchemical compass at 540px (the visual centerpiece) + "Where you are · where you're going" eyebrow + "You are *N* days into this period." headline with plain-language explanation of the mandala + 3-cell snapshot (Net Worth, Next Paycheck, This Period)
3. **Your Direction** (goals) — 3 goal cards (Emergency Fund, Debt Free, Visit Family) with progress bars, amounts, target dates. Section header: "Your Direction, *where your money is heading.*"
4. **Explore Compass** — 6 cards (This Period, Envelopes, Allocation Plan, Calendar, Debts, Transactions) with a 1-2 sentence explanation of what each page does, and an "OPEN →" CTA. Section header: "Explore Compass, *each area fully explained.*"
5. **Your next step** — A single CTA card pointing to the most relevant action (e.g. "Two envelopes are over limit — see what happened. → Open Envelopes")
6. **Colophon** — Compass / *Your money, on a path.* / 2025 · Q3

The dashboard's job is to **orient and invite exploration**, not to display data. The data lives in the deep pages.

### Sidebar (3 chapters, locked order — D13)

The sidebar is a vertical typographic spine with three chapters. Each chapter has a Cinzel label flanked by gold rule-lines. Within each chapter, items use the planetary/alchemical glyphs as nav icons.

**1. Overview** — *present tense, the dashboard family*
- `/` — **Dashboard** (the guiding flow)
- `/period` — **Period** — current period detail, allocation breakdown, closing-balance walk
- `/calendar` — **Calendar** — calendar with paydays + goal targets + moon phases
- `/insights` — **Insights** — charts, projection, spend breakdowns

**2. Plan** — *upstream of money movement, life direction*
- `/goals` — **Goals** — vision, timeframes, target amounts
- `/recurring` — **Recurring bills** — scheduled transactions
- `/emergency` — **Emergency fund** — single-goal tracker for the safety net
- `/invest` — **Investment goal** — long-horizon growth plan
- `/allocation` — **Allocation plan** — strategy picker + donut + sliders + arm auto-distillation

**3. Money** — *what flows from planning, the substance*
- `/envelopes` — **Envelopes** — all envelopes with planetary affiliation, balances, days-left
- `/transactions` — **Transactions** — all transactions, grouped by day, filters, search
- `/accounts` — **Accounts** — connected accounts (mock in v1), balances, manual reconcile
- `/subscriptions` — **Subscriptions** — recurring line-items, usage tracking, kill list
- `/debts` — **Debts** — debt-by-debt, interest, payoff strategies (avalanche/snowball)
- `/investments` — **Investments** — long-horizon positions, contributions, performance

### Articulated deep pages (v6 principle)

Every deep page must be **fully articulated** — it explains what the user is seeing, not just displays data. The pattern for each deep page:

- A **page title** (Italiana, 28–32px) that says what the page is for in plain language
- An **explanation block** (1-2 short paragraphs) telling the user what this area means in the larger Compass story
- The **data** (rich, with all the numbers, tables, charts relevant to this area)
- An **insight** or **next step** at the bottom

Example (Envelopes page, in v6 framing):
- Title: "Envelopes" + italic "each with a purpose."
- Explain: "An envelope is a small budget for one part of your life. Seven come with Compass; you can add more. Set a target for each. When the paycheck arrives, money moves in automatically. When you spend, the balance drops. When it hits 100%, Compass warns you. When it goes over, the bar shows it in iron red."
- Data: 7 envelopes with balances, targets, days-left, recent activity per envelope
- Insight: "Groceries is at 153%. The last 3 weeks of H-E-B transactions averaged $190 — your target of $400 may be set too low. Adjust it, or keep an eye on it for the next period."

This pattern is applied to every deep page. The product is about *integration and building life direction* — each page helps the user see that story for one slice of their money.

### Route table (canonical names, v1)

| Route | Purpose | Notes |
|---|---|---|
| `/` | **Guiding flow** (v6) — orient, surface goals, invite exploration | NOT a data dump. v6 mockup. |
| `/period` | Current period detail | Articulated page with explanation block + data |
| `/calendar` | Calendar view | Paydays, goal targets, moon phases |
| `/insights` | Charts and projections | Trajectory, spend breakdowns |
| `/goals` | Goals registry | Map out goals |
| `/recurring` | Recurring bills | Scheduled transactions |
| `/emergency` | Emergency fund | Single-goal tracker |
| `/invest` | Investment goal | Long-horizon plan |
| `/allocation` | Allocation plan | Strategy + arm auto-distillation |
| `/envelopes` | Envelopes + refill status | 7 planetary default + custom |
| `/transactions` | All transactions | Per-row AI actions at Tier 1+ |
| `/accounts` | Accounts management | Mock in v1 |
| `/subscriptions` | Subscriptions | Recurring detection + audit |
| `/debts` | Debts | Payoff strategies |
| `/investments` | Investments | Long-horizon |
| `/settings` | User settings | AI tier, layout defaults, import/export |
| `/chat` | AI chat | Also available as floating widget |
| `/login` or `/welcome` | Auth | Single-user |

---

## 8. Tech Stack (Hybrid Monolith — locked)

A **Next.js monolith** as the core, with a **plugin architecture** for swappable parts, and **dedicated API routes** for external integrations.

### Core app

- **Next.js 16** (App Router) + **React 19** + **TypeScript 5.7+** (strict, `noUncheckedIndexedAccess`)
- **Tailwind v4** + **shadcn/ui** (Base UI preset — see Section 0a for the alchemical design system)
- **Prisma 7** ORM + **SQLite** via `@prisma/adapter-better-sqlite3` (file-based, perfect for single-user + future Postgres migration)
- **TanStack Query 5** for client cache
- **Zustand 5** for client state (active view, draft transactions, widget config overrides)
- **dnd-kit** for drag-and-drop layout
- **Recharts 3** (or **Tremor**) for charts
- **Zod 4** for schema validation
- **Single deploy** (Vercel or self-host), fastest iteration

### Design system (locked — see Section 0a for full spec)

- **CSS variables** in `globals.css` for the cosmic canvas + gold leaf + planetary palette
- **Font loading** via `next/font/google`: Cinzel, Italiana, Cormorant Garamond, Marcellus, JetBrains Mono
- **Alchemical components** in `src/components/alchemy/`: Mandala, VesselGlyph, PlanetaryDayHeader, Ouroboros, Trajectory, ChronicleRow
- **shadcn Base UI preset** for primitives (Button, Input, Select, Dialog, etc.) — composed via `className={cn(buttonVariants({variant, size}))}` on native elements (no `asChild` prop on Base UI's Button)
- **Money in integer cents** throughout. Prisma `Int` columns. Display via `formatMoney(cents)` helper. JSON payloads (allocations, custom config) use `String` + `lib/json.ts` parse/stringify (Prisma 7 + SQLite reject `JSONB`)

### Plugin layer (see Section 5a)

- AI provider plugins (Mavis internal, Ollama, future OpenAI/Anthropic)
- Import format plugins (CSV v1, OFX/QIF future)
- Widget plugins (custom dashboard widgets)
- Routing integration plugins (future L2)

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

## 9. Implementation Order (Stage 2 — "Pay Period 1.0" cluster)

The v1.0 ordering is replaced by the v4 cluster order, which delivers the alchemical/celestial dashboard end-to-end before any drag-drop, AI tier work, or layout customization. Quality > speed (xKryptic preference, 2026-08-20). The "Pay Period 1.0" cluster is the first big milestone; later clusters add debt strategy UI, subscriptions tracker, drag-drop, AI tiers, Plaid.

### Cluster 0 (complete): Scaffold + Auth
- ✅ Scaffold (Next.js 16, React 19, TS strict, Tailwind v4, shadcn Base UI, Prisma 7 + SQLite, TanStack Query, Zustand, dnd-kit, Recharts, Zod 4, plugin registry)
- ✅ Lock Base UI decision
- ✅ Auth (argon2id, server-side sessions, `/welcome`+`/login` flow, route protection)
- ✅ Three mockups reviewed (v1, v2, v3 editorial, v4 alchemical — v4 LOCKED)

### Cluster 1: "Pay Period 1.0" (next)

This is the visible-UI milestone. Deliver the alchemical dashboard end-to-end with mock data, then layer in the structural pieces.

1. **Alchemical design system** — `globals.css` with cosmic canvas + gold leaf + planetary palette, Cinzel/Italiana/Cormorant/JetBrains Mono via `next/font/google`, `lib/money.ts` cents helper, `lib/format.ts` for date/period math, alchemical components in `src/components/alchemy/` (Mandala, VesselGlyph, PlanetaryDayHeader, Ouroboros, Trajectory, ChronicleRow).
2. **Data model** — `User`, `Account`, `Envelope` (with `planet` field), `Transaction`, `PaySchedule`, `AllocationPlan`, `AllocationRule` (with `strategyId` linking to a strategy preset), `AuditLog`. Add fields for `is_armed` on plans, `plan_version` for safe migrations, `prima_materia` flag on income transactions.
3. **Onboarding flow** — pay schedule (weekly/biweekly/semi-monthly/monthly + next date) → seed 7 default vessels with planetary affiliations → arm first Allocation Plan (Envelope strategy default) → land on dashboard.
4. **Sidebar nav** — 3-chapter typographic spine (Cosmos / The Great Work / Substance) with all 16 v4 routes wired.
5. **Dashboard** — Mandala (live, day-of-period + planetary needle), Sol net worth, The Great Work card (Prima Materia + distillation summary), vessels list, Trajectory strip, Chronicle preview.
6. **Period page** — full period detail, allocation breakdown, closing balance walk.
7. **Almanac** — month grid with planetary day-of-week headers, payday / goal target / today cells, moon phase panel.
8. **Divination** — Ouroboros (allocation donut in planetary colors), Trajectory (projection with starfield).
9. **Vessels (envelopes)** — list of all vessels with planetary glyphs, aspect lines, balance/target/spent/days-left, 100% hard warning (D16).
10. **Chronicle** — transactions grouped by planetary day, filters by vessel, search, day-group lunar phase.
11. **Allocation plan** — 4-strategy picker (Envelope / Zero-based / 50-30-20 / Pay-yourself-first), Ouroboros preview, per-vessel sliders, `✦ Arm auto-distillation` CTA.
12. **Auto-allocate engine** — on every paycheck transaction, run the active plan, create ledger transfers, write audit log. **No confirm modal** (D12).
13. **Build-a-plan sub-pages** — Goals, Recurring bills, Emergency fund, Investment goal.
14. **Accounts (mock)** — "Connect account" flow with mock institutions, no real Plaid.
15. **Subscriptions / Debts / Investments** — list pages with planetary affiliation, basic CRUD.

### Cluster 2 (after Cluster 1)
- Real Plaid sandbox (L2 routing) — deferred until Cluster 1 is fully working with mock data
- AI Tier 1 — chat, smart categorize, natural-language search
- AI Tier 2 — insights, anomaly, forecast, what-if, monthly narrative
- AI Tier 3 — autonomous actions + audit log deepening

### Cluster 3 (after Cluster 2)
- Layout customization system — widget registry, slot system, drag-drop, save views (the structural piece from v1.0 ordering)
- CSV import + recurring detection
- Mobile PWA polish

### Cluster 4 (future)
- L2 actual bank routing (Plaid + ACH)
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

