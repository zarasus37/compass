# Cluster 7.2 — Recent items in ⌘K palette (visible UI)

**Date**: 2026-08-29 06:55 CDT
**Status**: 🟡 In progress
**Goal**: Add a "RECENT" section at the top of the ⌘K palette showing the last 8 things the user has visited via the palette. Visible-UI; small follow-on to Cluster 7.1. Persistent across sessions via localStorage.

---

## Why this cluster exists

The ⌘K palette (Cluster 7.1) lets the user search + jump. But on a fresh open, the palette is empty until the user types. The user has to remember or retype the page they want. Most modern command palettes (Spotlight, Linear, Raycast, GitHub) show the "last 5-8 visited" items at the top so the user can re-jump in one keystroke.

For Compass, the "RECENT" section is also the on-ramp for new users: after they visit /vault/preferences via the palette, the next ⌘K open puts that page at the top. The learning loop is instant.

This is a small follow-on: ~150 lines of new code (the recent-items module + the UI changes in the palette), no new dependencies, no server changes (recent items are pure client state).

---

## Scope (this cluster)

### 1. `src/lib/command-palette/recent-items.ts` — localStorage-backed recent items

A small client module with three exports:

```ts
export function getRecent(): RecentItem[];
export function pushRecent(item: RecentItem): void;
export function clearRecent(): void;
```

- `RecentItem = { id: string; title: string; href: string; kind: PaletteKind; sub: string; visitedAt: number }`.
- Storage key: `compass-palette-recent`. The value is a JSON array.
- Cap: 8 items. New visits dedup by `id` (re-pushing an existing item moves it to the top, updates `visitedAt`).
- SSR-safe: every function returns `[]` or no-ops when `localStorage` is undefined (defensive — the palette is a client component, but tests in the future might import this from a server context).
- Timestamp is `Date.now()` so the UI can show "5m ago" in a future cluster.

### 2. CommandPalette — RECENT section

When the query is empty AND there are recent items, render a `[RECENT] N items` section above the result list. The section:

- Has a small section header: `// RECENT · N items` in mono caps, ink-3 color.
- Lists each recent item as a normal result row (same kind badge + title + sub, but with an extra `[↻]` "just visited" hint on the right).
- When the user types, the RECENT section disappears (the filter takes over; "type to filter" is the search affordance).
- When the user navigates via any item (RECENT or ROUTE/ENV/etc.), the `pushRecent` is called with the navigated item. The palette closes, the user lands on the page, and the next open puts the item at the top of RECENT.

### 3. /api/command-palette — minor: add `recentCount` to the response

The endpoint already returns the index. Add a `recentCount: 0` field (the actual count is client-side, but the smoke verifies the field exists). This is a small wire-format change that the smoke can lock in.

(Alternative: a separate `/api/command-palette/recent` GET endpoint. But the recent items are pure client state, so a server endpoint would just return an empty array. The wire-format field is enough.)

### 4. Files

**New:**
- `src/lib/command-palette/recent-items.ts` — the localStorage module.
- `00-CLUSTER-7.2-RECENT-ITEMS-IN-COMMAND-PALETTE.md` — this spec.

**Edit:**
- `src/components/command-palette/CommandPalette.tsx` — read `getRecent` on mount, render the RECENT section, call `pushRecent` on navigate.
- `src/app/api/command-palette/route.ts` — add `recentCount: 0` to the response.
- `tests/smoke-command-palette.mjs` — add ~6 checks for the RECENT shape + wire format.

### 5. Smoke (6 new checks in the existing `smoke-command-palette.mjs`)

- The /api/command-palette response includes a `recentCount: 0` field.
- The source file for `recent-items.ts` has the right exports (`getRecent`, `pushRecent`, `clearRecent`).
- The localStorage key is `compass-palette-recent` (read from the source).
- The cap is 8 (read from the source — `MAX_RECENT = 8`).
- The CommandPalette.tsx imports the recent-items module (read from the source).
- The CommandPalette.tsx renders the `// RECENT` section header (read from the source — the smoke doesn't need to open the palette; the source file is enough to lock in the contract).

The smoke is HTTP-only; the recent items are client state, so the smoke verifies the source contract (function names, cap, key) + the API wire format. The runtime behavior is verified by the user manually opening the palette after the cluster ships.

### 6. Dependencies

**None.** Pure client-side state via `localStorage`. The React hooks (useEffect, useState) are already in the deps.

---

## Out of scope (deferred)

- **Server-side recent items** — multi-user (household) support would need DB-backed recent items per user. The localStorage approach is single-user (the v1 spec). A future cluster can add a `RecentItem` table + a sync from localStorage when the user signs in.
- **Cross-device recent items** — same as above. The localStorage is per-device; cross-device sync needs a server.
- **"Clear all" UI** — the `clearRecent` function exists but no UI exposes it. A future cluster can add a "clear" link in the RECENT section header.
- **Time-ago labels** ("5m ago") — the data shape has `visitedAt` so this is a UI-only change for a future cluster. v1 shows the same row format as the other results.
- **Recent items for routes the user navigates to via the sidebar** (not just via the palette) — out of scope. v1 tracks only palette-driven navigations.

---

## Acceptance criteria

1. `pnpm tsc` clean.
2. `pnpm smoke:all` green (28 suites — the existing `smoke-command-palette` gets 6 new checks; total ~1,425 checks).
3. The ⌘K palette shows a `// RECENT · N items` section above the result list when the query is empty and there are recent items.
4. When the user types, the RECENT section disappears.
5. When the user navigates via the palette (RECENT or any other result), the item is added to the top of the recent list.
6. Re-navigating to the same item moves it to the top with an updated `visitedAt` (no duplicates).
7. The recent list is capped at 8 items (oldest are dropped when the cap is exceeded).
8. The recent list persists across page reloads (localStorage).
9. The /api/command-palette response includes `recentCount: 0` (or a non-zero number if the user has any — the smoke verifies the field exists, not the value).

---

## Risk + rollback

- **Risk: localStorage quota** — the recent items are tiny (8 items × ~200 bytes = 1.6KB). No risk of exceeding the 5MB localStorage quota.
- **Risk: localStorage disabled** (e.g. private browsing) — the `getRecent` function returns `[]` and the palette works without RECENT. The `pushRecent` is a no-op. The UI shows no RECENT section. Graceful degradation.
- **Rollback**: revert the commit. The palette still works without RECENT; the API wire format change (`recentCount: 0`) is additive.

---

## Commit shape

- `fa8e7d6 Cluster 7.2 — Recent items in ⌘K palette (visible UI)`
- `0e1f2a3 docs: HANDOVER + COORDINATION reflect Cluster 7.2`
