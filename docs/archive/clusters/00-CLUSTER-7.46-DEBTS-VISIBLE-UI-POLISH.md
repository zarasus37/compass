# Cluster 7.46 — Debts visible UI polish (color tier + more detail)

**Status**: spec, ready to ship.
**Predecessor**: Cluster 7.45 (debts interactive list — snowball hybrid redesign).
**Author constraint**: xKryptic 2026-09-27 — "ok looks good but we need to add some color so it doesn't look like its all blending in together but use colors that will make the information stand out when your reviewing the details as well as provide more information that is more specific and clear to understand." Three asks: (1) color differentiation so cards stand apart; (2) colors that make information stand out when reviewing details; (3) more specific information that's clearer to understand.

## §0 principle check

> If the user disappeared after configuring Compass, would Compass still correctly carry out the financial plan?

Pre-7.46 every debt card on `/debts` rendered the same saturn-rimmed cosmos surface with a percentage donut — high-APR debts look identical to low-APR debts until mom clicks into the breakdown. Color-by-tier turns severity into something mom can see at a glance; the expanded panel adds the context (institution, days-to-due, total cost) so the math is grounded in real numbers. Visible UI: every card now communicates its risk profile before a click.

## §1 root cause

Cluster 7.45 used a single saturn accent across every debt card. The donut was the only differentiator (paid-down %), but that doesn't help mom distinguish a 33% APR credit card from a 6% student loan at a glance. The expanded panel had the data but the **labels were jargon-y** ("Monthly Interest", "Months at min", "Original", "Paid down") and didn't tie back to what the numbers actually mean for her wallet.

## §2 design

### §2.1 — APR tier system

A pure helper that buckets an APR into one of three semantic tiers + maps to a CSS variable. Reused across the card + the expanded panel.

```ts
type AprTier = "high" | "medium" | "low" | "none";
function aprTier(aprBps: number): AprTier {
  const pct = aprBps / 100;
  if (pct >= 20) return "high";      // red — urgent
  if (pct >= 10) return "medium";    // amber — watch
  if (pct > 0)   return "low";       // green — comfortable
  return "none";                     // 0% APR or paid-off
}
```

Color mapping: `high → var(--neg)`, `medium → var(--warn)`, `low → var(--ok)`, `none → var(--ink-3)`.

### §2.2 — card visual changes (DebtCard)

Each card gains:
- **Right-edge accent strip** (3px, full height, colored by APR tier). The left rail stays saturn (debt-family identity); the right rail signals the severity. Same saturn left + different right = cards stand apart without losing the debt-family look.
- **Donut stroke + center label** colored by APR tier instead of uniformly saturn. A 33% APR card's donut is `var(--neg)` red; a 6% APR card's donut is `var(--ok)` green.
- **APR text + due-day line** rendered with a small tier-colored pill (e.g., "33.00% APR · Due day 15" with the APR % in red).
- **Monthly interest hint** if computable (balanceCents > 0): a small mono string under the balance showing "~$X/mo interest" colored by tier. Previously invisible at-a-glance; now surfaced on every card.
- **Institution + last 4** if the debt links to an account: a small mono line below the APR line ("Chase Visa · ··1234"). Tells mom WHICH debt at a glance.

### §2.3 — expanded panel additions (DebtDetailExpand)

New stats grid cells:
- **Days until payment** — computed from `dueDay + TODAY`, formatted as "in 12 days" or "tomorrow" or "today". Replaces the meaningless "Due day 15" with a real countdown.
- **Institution + last 4** — from linked account.
- **Account type** — "Credit" / "Loan" / "Checking" with a small inline SVG icon.
- **Total cost at min** — sum of remaining balance + total interest if paid at minimum only. The "true cost" of the debt: $945 + $1,200 in interest = $2,145 to fully clear. Computed from `balanceCents + (monthlyInterest * monthsAtMin)`.
- **APR tier badge** — explicit pill ("HIGH APR", "MEDIUM APR", "LOW APR") with tier color. The tier is what drives every other tier-colored element; making it explicit removes ambiguity.

### §2.4 — clearer copy

The expanded panel's cell labels are rewritten to be more concrete:
- "Monthly interest" → "Monthly interest cost" (clearer that it's money out)
- "Months at min" → "Months to payoff at min"
- "Original" → "Started at" (more conversational)
- "Paid down" → "Progress to zero"

And the card-level stat gets a tier-colored badge treatment: "APR 33.00%" rendered in red so it's visible without clicking.

## §3 implementation

### B1 — `aprTier(aprBps)` helper (new)

**File**: `src/lib/debt-tier.ts` (new, small pure function — no DB, no React).

```ts
export type AprTier = "high" | "medium" | "low" | "none";
export function aprTier(aprBps: number): AprTier { ... }
export function aprTierColor(tier: AprTier): string { ... }   // → CSS var
export function aprTierLabel(tier: AprTier): string { ... }   // → "HIGH APR" etc.
```

Three small exports; no other dependencies.

### B2 — Update `<DebtCard>` (already a server component)

- Add `account?: Account | null` prop (look up by `debt.accountId` server-side).
- Render right-edge accent strip via tier color.
- Color donut stroke via tier color.
- Render APR pill with tier color + tier label.
- Render "~$X/mo interest" line colored by tier (compute `balanceCents * aprBps / 120000`).
- Render institution + last-4 line when account linked.

### B3 — Update `<DebtDetailExpand>` (client component)

- Import the helper from `@/lib/debt-tier`.
- Replace 8-cell stats grid with 12-cell grid: add Days-until-payment, Institution, Account type, Total cost at min, APR tier badge.
- Rewrite cell labels per §2.4.
- Color monthly interest cell + APR cell by tier.
- Compute days-until-payment from `dueDay + TODAY` on every render (client component, so this is fine).
- Compute total-cost-at-min via existing math.

### B4 — Update `<DebtListInteractive>` to pass account lookups

The card's `account?: Account | null` prop needs data. Either:
- (a) Fetch accounts on the server (in `/debts/page.tsx`) and pass a `debtId → Account` map down.
- (b) Use a server-rendered map at the page level.

Option (a) is simpler. `liveAccounts()` exists in `mock.ts`; we'll read it in `/debts/page.tsx` and pass a Map to `DebtListInteractive` → `<DebtCard>`.

### B5 — Update `/debts/page.tsx`

- Read `liveAccounts()` (defensive `.catch`).
- Build `accountsByDebtId: Map<string, Account>` from `debt.accountId → account`.
- Pass to `<DebtListInteractive>`.

### B6 — New smoke `tests/smoke-debts-tier.mjs`

Source-file checks verify:
- `src/lib/debt-tier.ts` exists + exports `aprTier`, `aprTierColor`, `aprTierLabel`.
- `aprTier(3000)` returns "high" (≥20%).
- `aprTier(1500)` returns "medium" (10-20%).
- `aprTier(500)` returns "low" (<10%).
- `aprTier(0)` returns "none".
- `DebtCard` imports `aprTierColor` and uses it for the right-edge accent strip.
- `DebtDetailExpand` imports `aprTier` and uses it on the Monthly Interest cell + APR cell.
- `/debts/page.tsx` reads `liveAccounts` and passes accounts-by-id map.
- Expanded panel stats grid is now 12 cells (was 8) — checks for "Days until payment", "Institution", "Account type", "Total cost at min", "APR tier".
- Cell labels rewritten: "Monthly interest cost", "Months to payoff at min", "Started at", "Progress to zero".

Server-needing check (SKIP-NO-SERVER): GET `/debts` as mom, assert no `[ERR]`, the cards render with colored accents, and the expanded panel (if testable via click) shows the new cells.

### B7 — Spec + docs

`00-CLUSTER-7.46-DEBTS-VISIBLE-UI-POLISH.md` (this spec). HANDOVER commit-chain header + new "Recent change" section. COORDINATION last update.

## Files

| File | Change |
|---|---|
| `src/lib/debt-tier.ts` (new) | `aprTier` helper + color/label mappings |
| `src/components/debts/DebtCard.tsx` | Right-edge accent, tier-colored donut, APR pill, institution line, monthly interest hint |
| `src/components/debts/DebtDetailExpand.tsx` | 12-cell stats grid, tier color on APR/interest, rewritten labels |
| `src/components/debts/DebtListInteractive.tsx` | Accept `accountsByDebtId` map, pass to `<DebtCard>` |
| `src/app/(app)/debts/page.tsx` | Read `liveAccounts`, build map, pass down |
| `tests/smoke-debts-tier.mjs` (new) | Source + server-needing checks |
| `package.json` | New smoke added to chain |
| `00-CLUSTER-7.46-DEBTS-VISIBLE-UI-POLISH.md` | This spec |
| `HANDOVER.md` | Commit-chain header + new "Recent change" section |
| `COORDINATION.md` | Last update line |

## Verification

- `pnpm tsc --noEmit` clean
- `pnpm smoke:debts-tier` passes
- Existing smokes (`smoke-debts-interactive`, etc.) still green — orthogonal
- Manual: high-APR card stands out in red, low-APR card in green, paid-off in ok-green; expanded panel shows 12 cells with institution + days + total cost

## Risks

- **Color saturation.** Red on every high-APR debt could feel alarming. We tune the threshold (≥20% = high) and use semantic colors from the existing design system (var(--neg), var(--warn), var(--ok)) so the palette stays consistent with the rest of the app.
- **Account lookup race.** If a debt's `accountId` doesn't match any current account, we render no institution line (graceful fall-through). No crashes.
- **Days-until-payment math edge cases.** If `dueDay` is past today's day-of-month, "next payment" is next month's `dueDay`. We use `nextDueDate` helper to compute correctly. Already used elsewhere; reuse.
- **Donut center label collision.** The donut center currently shows `[OK]` / `[WARN]` / `${pct}%`. With tier coloring, a high-APR card might show `${pct}%` in red AND have a `[WARN]` flag if applicable (overpaid). The two signals complement each other.
- **No schema change.** All fields used are already on the Debt + Account models.