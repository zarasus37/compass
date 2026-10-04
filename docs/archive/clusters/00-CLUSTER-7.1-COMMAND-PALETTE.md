# Cluster 7.1 — ⌘K Command Palette (visible UI)

**Date**: 2026-08-29 05:20 CDT
**Status**: 🟡 In progress
**Goal**: Ship a global search-and-jump drawer. The user can hit `⌘K` (or `Ctrl+K` on Windows/Linux) to open a centered palette, type to filter across the 16+ routes + envelopes + goals + debts + bills + accounts, and hit `Enter` to jump. Visible-UI; no engine, no DB schema, no new dependencies.

---

## Why this cluster exists

The app has 36 routes spread across 4 chapters + a footer. The sidebar covers them, but finding a specific envelope / goal / debt / bill / account requires either knowing the URL or scrolling the relevant page's list. A global ⌘K palette makes the whole app addressable in 2 keystrokes. Per xKryptic's standing preferences:
- **Visible UI matters more than invisible architecture** — this is the highest-leverage visible-UI feature left.
- **Visual-first UI for data display** — the palette IS a data-display surface (the search index).
- **Terminal voice** — the palette should match the rest of the app (Sora body, JetBrains Mono labels, vessel-accent, `[OK]` / `[WARN]` markers).
- **Headline numbers need growth-oriented suggestions** — the footer of the palette shows the result count + a "[?] Help" hint.

The component is small (a single client component + an open API for the search index), the keyboard interaction is well-trodden (Spotlight, Linear, Raycast, GitHub all use the same pattern), and the discoverability is automatic because we add a `[⌘K] Search` button to the top bar.

---

## Scope (this cluster)

### 1. `<CommandPalette />` — the modal drawer (client component)

Centered overlay, terminal-voice styled. Sections, top to bottom:

1. **Backdrop** — `rgba(6, 10, 18, 0.85)` over the full viewport. Click-outside closes.
2. **Modal** — 640px max-width, vessel-dark bg, vessel-border, 4px square corners, vessel-neon-glow on the search input focus.
3. **Header / search input** — large auto-focused input, mono caps placeholder `[?] Search routes, envelopes, goals, debts, bills, accounts…`. vessel-accent border on focus, vessel-surface bg.
4. **Results list** — scrollable, max-height 60vh. Each row:
   - **Kind badge** (left) — mono caps: `[ROUTE]`, `[ENV]`, `[GOAL]`, `[DEBT]`, `[BILL]`, `[ACC]` (vessel-accent border).
   - **Title** — primary label (the page title, envelope name, etc.).
   - **Sub-text** (right) — secondary line (e.g. "vessel: jupiter", "goal: emergency", "balance: $84,210").
   - **Active state** — vessel-accent-soft bg, vessel-accent left rail.
5. **Empty state** — `[—] No matches. Try a different query.` (mono caps, ink-3).
6. **Footer** — mono caps status line: `// N results` + keyboard hint `[↑] navigate · [↵] open · [esc] close`.

Keyboard behavior:
- `⌘K` / `Ctrl+K` — open (works anywhere, including from inside form inputs).
- `Escape` — close.
- `↑` / `↓` — move active row up / down (wraps at top/bottom).
- `Enter` — navigate to the active row's href (uses `router.push`).
- `Tab` — trapped inside the palette (focus cycles within the modal).

Accessibility:
- `role="dialog"`, `aria-modal="true"`, `aria-label="Command palette"`.
- The active row has `aria-selected="true"`.
- The input is `aria-activedescendant` linked to the active row.
- `prefers-reduced-motion` disables the open/close transition (200ms fade + 4px translateY).
- Body scroll is locked while the palette is open.

### 2. `<CommandPaletteProvider />` — the open/close state + global keyboard

Wraps the palette in a small React context. Exposes `useCommandPalette()` for any component to call `open()` or `close()`. The provider owns:
- The `isOpen` state.
- The global `keydown` listener for `⌘K` / `Ctrl+K` (toggles open).
- The `useEffect` to lock body scroll when open.
- The `useEffect` to focus the search input on open.

The provider is mounted in the `(app)` layout. It's a client component, but the layout stays a server component (the children are passed through; the provider is a single client component).

### 3. Search index — server-side `getSearchIndex()`

A pure server function that returns the search index for the current user. Two halves:

**Static (routes)** — defined in a single source of truth (`src/lib/command-palette/routes.ts`):
- 16 pages with `{ href, title, chapter, kind: "ROUTE", sub: "..." }`.
- The chapter comes from the sidebar labels (`// Overview` / `// Ledger` / `// Aims` / `// Learn` / `// System`).
- The sub is a one-line terminal-voice description of the page.

**Dynamic (DB items)** — read from Prisma:
- Envelopes (id, name, planet, currentCents) → `{ href: "/envelopes/{id}", title: name, kind: "ENV", sub: "vessel: {planet} · ${currentCents/100}" }`.
- Goals (id, name, targetAmount, currentAmount) → `{ href: "/goals/{id}", title: name, kind: "GOAL", sub: "{currentAmount/100} / {targetAmount/100}" }`.
- Debts (id, name, currentBalance) → `{ href: "/debts", title: name, kind: "DEBT", sub: "balance: {currentBalance/100}" }`.
- Bills (id, name, amountCents) → `{ href: "/obligations", title: name, kind: "BILL", sub: "due: {amountCents/100}" }`.
- Accounts (id, name, type) → `{ href: "/accounts", title: name, kind: "ACC", sub: "type: {type}" }`.

The dynamic reads run in the layout (the same place the engine level + pay period are read). The `getSearchIndex` function takes the `userId` and returns `{ routes: StaticItem[], items: DynamicItem[] }`. The palette fetches this on open (or the layout passes it down as a prop — see #4).

### 4. Wiring — the `(app)` layout

The layout becomes a server component that:
1. Reads the search index (static + dynamic) alongside the engine level + pay period.
2. Renders the `<CommandPaletteProvider searchIndex={index}>` next to the TopAppBar.
3. Adds a `[⌘K] Search` button to the TopAppBar's right column (next to the settings cog). Clicking it calls `useCommandPalette().open()`.

### 5. Files

**New:**
- `src/components/command-palette/CommandPalette.tsx` — the modal drawer (client component, 350+ lines).
- `src/components/command-palette/CommandPaletteProvider.tsx` — the open/close state + global keyboard.
- `src/components/command-palette/SearchInput.tsx` — the search input (split out for testability).
- `src/components/command-palette/ResultsList.tsx` — the result rows + active state.
- `src/lib/command-palette/routes.ts` — the static route index.
- `src/lib/command-palette/search-index.ts` — `getSearchIndex(userId)` server function.
- `src/lib/command-palette/types.ts` — `PaletteItem`, `StaticItem`, `DynamicItem` types.
- `src/lib/command-palette/match.ts` — the pure search-matcher (case-insensitive substring + word-boundary boost).
- `tests/smoke-command-palette.mjs` — the new smoke (~30 checks).
- `00-CLUSTER-7.1-COMMAND-PALETTE.md` — this spec.

**Edit:**
- `src/app/(app)/layout.tsx` — add the provider + the search-index read.
- `src/components/shell/TopAppBar.tsx` — add the `[⌘K] Search` button.
- `package.json` — add the new smoke to the `smoke` script.

### 6. Dependencies

**None.** Pure React + the existing Next.js + the existing CSS tokens. `useEffect`, `useRef`, `useState`, `useRouter`, `useContext` are all already in the deps.

### 7. Smoke (`tests/smoke-command-palette.mjs`)

~30 checks. Verifies:
- The `CommandPaletteProvider` mounts in the (app) layout (the `[⌘K] Search` button is in the rendered HTML of any signed-in page).
- The button has the right `aria-label`, `data-testid="topbar-search-button"`.
- The static route index has the right items (16 routes, all 4 chapters represented).
- `/api/command-palette/search?q=period` returns the period page + envelope/goal/bill items matching "period".
- The match function ranks prefix matches before substring matches before fuzzy matches.
- The `⌘K` shortcut opens the palette (the JS keydown handler exists; we test via a unit smoke that imports the match function directly).
- The `Escape` key handler exists.
- The active row's `data-testid` is `palette-item-active` when navigated to.
- The `[—] No matches` empty state renders for impossible queries.
- The keyboard hint footer renders.
- The route hrefs are correct (the palette navigates, doesn't 404).

The smoke imports `match` from `src/lib/command-palette/match.ts` directly for the matching-priority tests; the rest is HTTP smoke against the dev server.

---

## Out of scope (deferred)

- **Command execution** — "Create a new envelope" / "Mark this bill paid" type commands. The palette is currently nav-only. The hook (`useCommandPalette().run("createEnvelope")`) is in the provider API for future extension, but no commands ship in v1.
- **Recent items** — the "last 5 things you visited" section at the top. Useful but separate cluster.
- **Cmd+/ shortcut** — alternate shortcut for the same action. We ship ⌘K + Ctrl+K; that's enough.
- **Fuzzy matching** — the v1 matcher is case-insensitive substring + word-boundary boost. A future cluster can swap in a fuzzy matcher (fuse.js, etc.) for typo-tolerance. The match function is pure and testable, so the swap is a 1-file change.
- **Theme picker** — the palette is on vessel tokens. A future "light mode" picker would propagate to the palette; the swap is in the parent.
- **Onboarding tour** — the discoverability hint is the `[⌘K] Search` button in the top bar. A full onboarding tour is a future cluster.

---

## Acceptance criteria

1. `pnpm tsc` clean.
2. `pnpm smoke:all` green (28 suites — one new `smoke-command-palette`, +30 checks).
3. ⌘K (or Ctrl+K) anywhere on a signed-in page opens the palette.
4. Typing in the search input filters the list in real time.
5. ↑ / ↓ navigates the active row.
6. Enter navigates to the active row's href.
7. Escape closes the palette.
8. The palette searches 16 routes + envelopes + goals + debts + bills + accounts.
9. The `[⌘K] Search` button is in the top bar of every signed-in page.
10. The palette is on vessel tokens (vessel-dark bg, vessel-accent border, vessel-accent active state).
11. `prefers-reduced-motion` disables the open/close animation.
12. Body scroll is locked while the palette is open.

---

## Risk + rollback

- **Risk: keyboard shortcut conflicts with the browser's address bar** — `⌘K` on Mac focuses the address bar's search. The `preventDefault()` on the keydown handler avoids this. We do the same on Windows with `Ctrl+K`. Tested in the smoke.
- **Risk: focus trap blocks users with screen readers** — the trap is implemented with `aria-hidden` on background elements and `tabindex` cycling. The `Esc` key always closes; the smoke verifies the close.
- **Risk: a long search index slows down the open** — the index is a flat array of ~50 items (16 routes + ~30 dynamic). Filtering is O(n) per keystroke. No lag.
- **Rollback**: revert the commit. The provider is additive; the layout change is a single import. The smoke fails on the missing testid; no other smoke regresses.

---

## Commit shape

- `9f8e7d6 Cluster 7.1 — ⌘K command palette (visible UI)`
- `0e9f8a7 docs: HANDOVER + COORDINATION reflect Cluster 7.1`
