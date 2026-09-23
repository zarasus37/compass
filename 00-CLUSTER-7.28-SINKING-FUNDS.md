# Cluster 7.28 — Sinking Funds

**Status (2026-09-23): IN PROGRESS.** Spec on disk; awaiting code + smoke + audit.

## Goal

Sub-allocations inside an envelope: `Groceries` has a `$200/wk` base
+ a `$300 "Holiday food"` sink that fills `$25/mo`. Lets mom save
for known-but-irregular expenses (insurance, annual subscriptions,
holiday gifts) without juggling separate envelopes or spreadsheets.

A "sink" is the standard budgeting term for money you set aside for
a known-but-irregular expense. YNAB popularized it; Mint copied it.
Compass gets it now.

## Why now

- Tier 2 (user direction, 2026-09-22): sinking funds, quick-add,
  spending trends. Quick-add shipped in 7.27. Sinking funds next.
- Pairs naturally with the cash-flow card (7.26): mom can now model
  "set aside $25/mo for holiday food" and the cash flow projection
  sees the per-envelope target (sinks are sub-allocations, not new
  top-level targets).
- The hard work is just a new table + lazy seed + UI. The math is
  trivial (`monthlyFill = target × 12/cadence_months`).

## What ships

### 1. New Prisma model: `EnvelopeSink`

```prisma
model EnvelopeSink {
  id          String   @id @default(cuid())
  envelopeId  String
  userId      String
  name        String   // "Holiday food", "Insurance (quarterly)"
  targetCents Int      // total amount to save
  cadence     String   // "weekly" | "monthly" | "quarterly" | "annual"
  source      String   @default("user") // "user" | "seed"
  sortOrder   Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  envelope    Envelope @relation(fields: [envelopeId], references: [id], onDelete: Cascade)
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([envelopeId])
  @@index([userId])
}
```

One new table. Foreign-key cascade on envelope/user delete (sinks
don't outlive their envelope).

### 2. Migration

`prisma/migrations/20260923000000_add_envelope_sinks/migration.sql`:
`CREATE TABLE "EnvelopeSink"` with the indexes above and the FK to
`Envelope`. Idempotent on re-apply (the cluster 7.17 init migration
was a single non-idempotent migration; this one follows Prisma's
naming convention).

### 3. Lazy seed: `ensureUserSinksSeeded(userId)`

On first read for a user, seed 1-2 example sinks per envelope based
on the envelope's planet/category:

| Envelope (canonical)        | Sink 1                | Sink 2 (optional) |
|-----------------------------|----------------------|--------------------|
| Groceries                   | Holiday food         | —                  |
| Utilities                   | Annual subscription  | —                  |
| Auto                        | Insurance (quarterly)| Registration       |
| Buffer (savings)            | Annual property tax  | —                  |
| Joy                         | Birthday gifts       | Holiday gifts      |
| Health                      | Dental (annual)      | —                  |
| Debt                        | — (none, debt isn't sinking) | —        |

Skip the seed if the user already has any `EnvelopeSink` rows
(idempotent). All seeded rows have `source="seed"` so the user can
distinguish them from manual entries (same pattern as the bill seed).

### 4. UI on `/envelopes`

Each envelope row gets a `// sinks` sub-section showing the sink
names with `target / cadence` annotation. Example:

```
Groceries              ████████░░ 80%   $642 / $800
  // sinks
  · Holiday food       $300 / annual
  · Coffee fund        $50 / monthly
```

### 5. UI on `/envelopes/[id]`

A new "Sinking funds" section between the envelope bar and the
transaction history. Shows all sinks with:
- name, target, cadence, monthly-fill (computed)
- delete button (per-sink)
- "Add a sink" inline form (name + target + cadence)

### 6. Server actions: `addSink`, `deleteSink`

`src/app/actions/sinks.ts`:
- `addSink(prev, formData)`: validates name + target + cadence, writes
  the row, revalidates `/envelopes` and `/envelopes/[id]`.
- `deleteSink(prev, formData)`: deletes the row by id (form-hidden),
  revalidates the same paths.

### 7. Smoke

`tests/smoke-sinking-funds.mjs` (~12 checks):
- After lazy seed: at least 1 sink row per "seedable" envelope
- DOM on `/envelopes`: each envelope row shows its sinks
- DOM on `/envelopes/[id]`: "Add a sink" form renders + sinks listed
- Server action: add a new sink via POST → row appears in DB
- Server action: delete a sink via POST → row gone from DB
- Math invariant: `monthlyFillCents` computed correctly per cadence

## Out of scope (deferred)

- **Fill progress bars** (current vs target fill). Pure visualization,
  not part of the budget math. Could be a Tier 4 polish cluster.
- **Edit sink modal** (rename / change target). Delete + re-add is
  enough for v1. Edit comes if mom asks for it.
- **Auto-allocate from paycheck** (link sinks to AllocationPlan rules).
  Today AllocationPlan.rules → envelopeId (1 level); making it
  envelopeId+sinkId would require schema changes to AllocationRule.
  Defer.
- **Sync with bills** (some sinks ARE bills — e.g. Insurance
  Sinking Fund + Insurance Bill). Auto-detect overlap is a v1.1
  problem.

## Schema change. No env change. No middleware change.

Adding a new table is the only schema change. No env vars. No
middleware. No new API routes (server actions handle add/delete).

## Verification

- `pnpm tsc`: clean
- `pnpm smoke` (data layer, +smoke-sinking-funds): ~1,010 → ~1,022
- `tests/integration-vault.mjs`: 345 / 0 miss (unchanged)
- `tests/smoke-deploy.mjs`: 145 / 0 miss (unchanged)
- `smoke:ui` (13 stages): 432 / 0 miss

## Files expected to change

Added:
- `prisma/migrations/20260923000000_add_envelope_sinks/migration.sql`
- `src/lib/seed-sinks.ts` (~150 LOC: lazy seed + SINK_SEED table)
- `src/app/actions/sinks.ts` (~80 LOC: addSink + deleteSink)
- `src/components/envelopes/AddSinkForm.tsx` (~120 LOC: inline form)
- `src/components/envelopes/SinkList.tsx` (~80 LOC: list + delete buttons)
- `tests/smoke-sinking-funds.mjs` (~200 LOC: 12 checks)

Modified:
- `prisma/schema.prisma` (add EnvelopeSink model + relations)
- `src/app/(app)/envelopes/page.tsx` (render sinks inline)
- `src/app/(app)/envelopes/[id]/page.tsx` (full sinks section)
- `package.json` (`smoke` chain extended)
- `HANDOVER.md` (Cluster 7.28 audit + commit-chain refresh)
- `00-MOM-LAUNCH-RUNBOOK.md` (Step 6.9 — mom-visible sinking funds)
