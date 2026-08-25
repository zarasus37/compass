/**
 * PlanMyNextCheck — the always-visible "what comes out of my next
 * check" panel (Cluster 1.8).
 *
 * The user said:
 *   "I get paid Friday. What needs to come out of this check,
 *    and how much can I safely spend?"
 *
 * This card is the live answer: the engine reads the bills list +
 * allocation plan + period dates, computes the 5-way breakdown, and
 * renders a stacked bar + safe-to-spend headline. The PaycheckSimulator
 * above is the action that runs the plan; this card is the preview
 * of what'll happen.
 *
 * 5-way split:
 *   Bills (recurring) | Spending (discretionary) | Debt | Savings | Unallocated
 *
 * The stacked bar visualizes the % split, with bill-shaped categories
 * (Bills, Debt, Savings) in planetary colors. The safe-to-spend
 * headline is the unallocated number — what she can actually spend
 * without touching the other categories.
 */

import * as React from "react";
import { formatMoney } from "@/lib/money";
import {
  billsDueInPeriod,
  paycheckBreakdown,
  type AllocationPlan,
  type Bill,
  type PlanetId,
} from "@/lib/store";

export interface PlanMyNextCheckProps {
  bills: Bill[];
  plan: AllocationPlan;
  envelopes: ReadonlyArray<{ id: string; planet: PlanetId }>;
  paycheckCents: number;
  periodStart: Date;
  periodEnd: Date;
  nextPayDate: Date;
}

export function PlanMyNextCheck({
  bills,
  plan,
  envelopes,
  paycheckCents,
  periodStart,
  periodEnd,
  nextPayDate,
}: PlanMyNextCheckProps) {
  const breakdown = paycheckBreakdown(
    paycheckCents,
    bills,
    plan,
    envelopes,
    periodStart,
    periodEnd,
  );

  const total = breakdown.paycheckCents;
  const segments = [
    { key: "bills",       label: "Bills",     cents: breakdown.billsCents,       color: "var(--mercury)" },
    { key: "spending",    label: "Spending",  cents: breakdown.spendingCents,    color: "var(--luna)"    },
    { key: "debt",        label: "Debt",      cents: breakdown.debtCents,        color: "var(--saturn)"  },
    { key: "savings",     label: "Savings",   cents: breakdown.savingsCents,     color: "var(--jupiter)" },
    { key: "unallocated", label: "Free",      cents: breakdown.unallocatedCents, color: "var(--ok)"      },
  ];

  // Filter out zero-value segments for the bar (but keep them in the legend)
  const visibleSegments = segments.filter((s) => s.cents > 0);

  // Compute %s for the legend
  const pctOf = (cents: number) => (total > 0 ? Math.round((cents / total) * 100) : 0);

  // Warnings
  const overByCents = breakdown.billsCents - paycheckCents;
  const billsDue = billsDueInPeriod(bills, periodStart, periodEnd);
  const unpaidCount = billsDue.filter((d) => !d.paidThisPeriod).length;
  const safeFloor = 5000; // < $50 safe-to-spend is a soft warning

  return (
    <section
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: 4,
        padding: "32px 36px 28px",
        marginBottom: 56,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 10.5,
            fontWeight: 600,
            color: "var(--gold)",
            letterSpacing: "0.28em",
            textTransform: "uppercase",
          }}
        >
          <span style={{ fontSize: 18, lineHeight: 1 }}>◇</span>
          Plan my next check
        </div>
        <span
          style={{
            fontFamily: "var(--font-sora)",
            fontSize: 13,
                        color: "var(--ink-3)",
          }}
        >
          Live preview · the next paycheck, already split
        </span>
      </div>

      {/* Headline numbers */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 32,
          alignItems: "end",
          marginBottom: 24,
          paddingBottom: 24,
          borderBottom: "1px solid var(--line-soft)",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 9.5,
              color: "var(--ink-3)",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            Paycheck
          </div>
          <div
            style={{
              fontFamily: "var(--font-sora)",
              fontSize: 40,
              lineHeight: 1,
              color: "var(--ink)",
              fontFeatureSettings: '"tnum" 1',
            }}
          >
            {formatMoney(breakdown.paycheckCents)}
          </div>
        </div>
        <div>
          <div
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 9.5,
              color: "var(--ink-3)",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            Safe to spend
          </div>
          <div
            style={{
              fontFamily: "var(--font-sora)",
              fontSize: 40,
              lineHeight: 1,
              color:
                breakdown.unallocatedCents === 0
                  ? "var(--neg)"
                  : breakdown.unallocatedCents < safeFloor
                  ? "var(--warn)"
                  : "var(--ok)",
              fontFeatureSettings: '"tnum" 1',
              textShadow:
                breakdown.unallocatedCents >= safeFloor
                  ? "0 0 18px rgba(106, 176, 136, 0.35)"
                  : "none",
            }}
          >
            {formatMoney(breakdown.unallocatedCents)}
          </div>
        </div>
        <div>
          <div
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 9.5,
              color: "var(--ink-3)",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            Bills due before next payday
          </div>
          <div
            style={{
              fontFamily: "var(--font-sora)",
              fontSize: 40,
              lineHeight: 1,
              color: breakdown.billsExceedPaycheck ? "var(--neg)" : "var(--ink)",
              fontFeatureSettings: '"tnum" 1',
            }}
          >
            {formatMoney(breakdown.billsCents)}
          </div>
        </div>
      </div>

      {/* Warnings (only when needed) */}
      {breakdown.billsExceedPaycheck && (
        <div
          style={{
            background:
              "linear-gradient(90deg, rgba(196, 90, 58, 0.18) 0%, transparent 100%)",
            border: "1px solid var(--neg)",
            borderRadius: 2,
            padding: "12px 16px",
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span style={{ color: "var(--neg)", fontSize: 18 }}>!</span>
          <span
            style={{
              fontFamily: "var(--font-sora)",
              fontSize: 15,
              color: "var(--ink)",
            }}
          >
            Bills exceed the paycheck by{" "}
            <b style={{ color: "var(--neg)", fontWeight: 600 }}>
              {formatMoney(overByCents)}
            </b>
            . Pull from the buffer or extend the timeline.
          </span>
        </div>
      )}
      {!breakdown.billsExceedPaycheck && breakdown.unallocatedCents < safeFloor && breakdown.unallocatedCents > 0 && (
        <div
          style={{
            background:
              "linear-gradient(90deg, rgba(212, 160, 80, 0.18) 0%, transparent 100%)",
            border: "1px solid var(--warn)",
            borderRadius: 2,
            padding: "12px 16px",
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span style={{ color: "var(--warn)", fontSize: 18 }}>!</span>
          <span
            style={{
              fontFamily: "var(--font-sora)",
              fontSize: 15,
              color: "var(--ink)",
            }}
          >
            Safe to spend is below $50. Tight week — consider pausing non-essentials.
          </span>
        </div>
      )}

      {/* Stacked bar */}
      <div
        aria-hidden
        style={{
          display: "flex",
          width: "100%",
          height: 22,
          background: "var(--cosmos)",
          border: "1px solid var(--line-soft)",
          borderRadius: 3,
          overflow: "hidden",
          marginBottom: 14,
        }}
      >
        {visibleSegments.map((s) => (
          <div
            key={s.key}
            style={{
              width: `${(s.cents / total) * 100}%`,
              background: s.color,
              boxShadow: s.cents > 0 ? `0 0 8px ${s.color}` : "none",
              transition: "width 200ms ease",
            }}
            title={`${s.label}: ${formatMoney(s.cents)} (${pctOf(s.cents)}%)`}
          />
        ))}
      </div>

      {/* Legend */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 20,
          marginBottom: 4,
        }}
      >
        {segments.map((s) => (
          <div
            key={s.key}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span
              aria-hidden
              style={{
                display: "inline-block",
                width: 10,
                height: 10,
                background: s.color,
                borderRadius: 2,
                boxShadow: s.cents > 0 ? `0 0 4px ${s.color}` : "none",
                opacity: s.cents > 0 ? 1 : 0.4,
              }}
            />
            <span
              style={{
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 10,
                color: s.cents > 0 ? "var(--ink-2)" : "var(--ink-4)",
                letterSpacing: "0.22em",
                textTransform: "uppercase",
              }}
            >
              {s.label}
            </span>
            <span
              style={{
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 12,
                color: s.cents > 0 ? "var(--ink)" : "var(--ink-4)",
                fontFeatureSettings: '"tnum" 1',
              }}
            >
              {formatMoney(s.cents)} · {pctOf(s.cents)}%
            </span>
          </div>
        ))}
      </div>

      {/* Unpaid-bill nudge */}
      {unpaidCount > 0 && (
        <p
          style={{
            fontFamily: "var(--font-sora)",
            fontSize: 13,
            color: "var(--ink-3)",
                        marginTop: 16,
            marginBottom: 0,
          }}
        >
          {unpaidCount} bill{unpaidCount === 1 ? "" : "s"} still unpaid for this period —{" "}
          <a
            href="/obligations?tab=bills"
            style={{ color: "var(--gold)", textDecoration: "none", fontWeight: 600 }}
          >
            mark them in Obligations →
          </a>
        </p>
      )}
    </section>
  );
}
