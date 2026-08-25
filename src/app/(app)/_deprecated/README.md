# `_deprecated/` — historical page files

This directory holds the **old page files** that were moved here during
**Cluster 4.0** (the 3-chapter → 4-chapter + footer site-wide nav
restructure). They are **inert** — Next.js's App Router ignores any
`page.tsx` inside an underscore-prefixed directory, so the files here
do not become routes. They're preserved on disk as historical reference.

## Why these are here

The old 3-chapter structure was:

| Old chapter | Old items |
|---|---|
| `// Overview` | Dashboard, Period, Calendar, Insights, Settings |
| `// Plan` | Goals, Recurring, Emergency, Invest, Allocation |
| `// Money` | Envelopes, Transactions, Accounts, Subscriptions, Debts, Investments |

The 4-chapter restructure moved/merged/renamed:

- `/recurring` + `/subscriptions` → `/obligations?tab=bills|subs` (merged view)
- `/investments` → `/holdings` (rename; "Holdings" is positions, "Investments" is the goal)
- `/emergency` + `/invest` → `/goals?kind=emergency|invest` (now goal types)
- `/settings/habit-quiz` → `/learn/habit-quiz` (moved to the Learn chapter)

Six 308 permanent redirects in `next.config.ts` keep the old URLs
working as deep links. Old bookmarks, smoke scripts, and shared URLs
all resolve to the new canonical path.

## Files in this directory

| File | Old route | New route |
|---|---|---|
| `recurring/page.tsx` | `/recurring` | `/obligations?tab=bills` |
| `subscriptions/page.tsx` | `/subscriptions` | `/obligations?tab=subs` |
| `investments/page.tsx` | `/investments` | `/holdings` |
| `emergency/page.tsx` | `/emergency` | `/goals?kind=emergency` |
| `invest/page.tsx` | `/invest` | `/goals?kind=invest` |
| `settings/habit-quiz/page.tsx` | `/settings/habit-quiz` | `/learn/habit-quiz` |
| `settings/habit-quiz/HabitQuiz.tsx` | (component) | (moved to `learn/habit-quiz/`) |

## Why not just delete them?

The original Cluster 4.0 plan was to hard-delete the files. The dev
harness blocks `Remove-Item` (PowerShell delete) for safety — there's
no Trash tool available in this environment. The next-best solution
is to move them into a clearly-marked `_deprecated/` directory
(underscore prefix makes Next.js ignore the directory for routing).

These files will be hard-deleted in a future cluster when either:
1. A Trash tool becomes available in the harness, or
2. A maintainer runs `git rm` directly.

Until then, the redirect chain in `next.config.ts` makes them inert.
A `tests/smoke-deprecated.mjs` (42 checks) locks in:

- All 6 redirects return 308 with the right `Location` header.
- The old URLs return 308 (not 200 — confirms no file is being rendered).
- Following each redirect lands on a 200 page.
- The Sidebar (primary nav surface) has 0 entries pointing to old paths.
- All new canonical routes resolve to 200.

## Living side note

The `/recurring/new` form is **not** in this directory. It's a live
route: the "+ Add bill" button on `/obligations` points to it. The
form's "← All bills" back link points to `/obligations?tab=bills`
(Cluster 4.3 fix — previously it pointed to `/recurring`, which would
have 308-redirected; one fewer redirect hop is faster).

If a future cluster needs to also retire the `/recurring/new` form
(e.g. to build a new `envelopes/new-bill` form), the back-link and
the `+ Add bill` button in `/obligations` need to be updated in lockstep.

## Audit history

- **2026-08-25 (Cluster 4.0)** — files moved here from their original
  locations under `src/app/(app)/`. `next.config.ts` gains 6
  permanent (308) redirects.
- **2026-08-25 (Cluster 4.3)** — added this README. Audited all live
  hrefs in the source code and fixed 4 stale references:
  - `lib/opportunities.ts:94` — `href: "/subscriptions"` →
    `href: "/obligations?tab=subs"`
  - `app/actions/bills.ts` — `revalidatePath("/recurring")` →
    `revalidatePath("/obligations")` (covers both tabs)
  - `app/(app)/recurring/new/NewBillForm.tsx:244` — `href="/recurring"`
    → `href="/obligations?tab=bills"`
  - `components/dashboard/catalog.ts:67` — `href: "/recurring"` →
    `href: "/obligations?tab=bills"`
  - 2 comment-only updates in `app/(app)/envelopes/actions.ts` and
    `app/actions/bills.ts` for accuracy.

  Added `tests/smoke-deprecated.mjs` (42 checks) to lock in the
  redirect behavior end-to-end.

— `cluster 4.3` (xKryptic, 2026-08-25)
