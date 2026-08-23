/**
 * SnapshotCard — the 3-cell strip (Net Worth / Next Paycheck / Period).
 *
 * Preserved as a card variant of the dashboard snapshot. The deep
 * numbers (full balance history, paycheck details, period walk)
 * live on /accounts, /period, and /recurring respectively.
 */

import * as React from "react";
import { formatMoney, formatMoneySigned } from "@/lib/money";
import { formatPillDate, formatRelativeDate, formatPeriodRange } from "@/lib/format";

export interface SnapshotCardData {
  netWorthCents: number;
  periodDeltaCents: number;
  nextPaycheckCents: number;
  nextPayDate: Date;
  periodStart: Date;
  periodEnd: Date;
  day: number;
  totalDays: number;
}

export function SnapshotCard({ data }: { data: SnapshotCardData }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: 0,
        background: "var(--cosmos-2)",
        border: "1px solid var(--line-soft)",
        borderRadius: 3,
        overflow: "hidden",
      }}
    >
      <Cell
        label={`Net Worth · Day ${data.day} of ${data.totalDays}`}
        value={formatMoney(data.netWorthCents)}
        sub={formatMoneySigned(data.periodDeltaCents) + " this period"}
        accent="ink"
      />
      <Cell
        label="Next Paycheck"
        value={formatMoney(data.nextPaycheckCents)}
        sub={`${formatRelativeDate(data.nextPayDate)} · ${formatPillDate(data.nextPayDate)}`}
        accent="gold"
        borderLeft
      />
      <Cell
        label="This Period"
        value={`${data.day} of ${data.totalDays}`}
        sub={formatPeriodRange(data.periodStart, data.periodEnd)}
        accent="ok"
        borderLeft
      />
    </div>
  );
}

function Cell({
  label,
  value,
  sub,
  accent,
  borderLeft,
}: {
  label: string;
  value: string;
  sub: string;
  accent: "gold" | "ok" | "ink";
  borderLeft?: boolean;
}) {
  const valueColor =
    accent === "gold" ? "var(--gold)" : accent === "ok" ? "var(--ok)" : "var(--ink)";
  return (
    <div
      style={{
        padding: "20px 22px",
        borderLeft: borderLeft ? "1px solid var(--line-soft)" : undefined,
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-cinzel), serif",
          fontSize: 9.5,
          color: "var(--ink-3)",
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-italiana), var(--font-cinzel), serif",
          fontSize: 26,
          lineHeight: 1,
          color: valueColor,
          fontFeatureSettings: '"tnum" 1',
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 11,
          color: "var(--ink-3)",
          marginTop: 6,
        }}
      >
        {sub}
      </div>
    </div>
  );
}
