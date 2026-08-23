/**
 * SnapshotCard — the 3-cell strip (Net Worth / Next Paycheck / Period).
 *
 * Preserved as a card variant of the dashboard snapshot. The deep
 * numbers (full balance history, paycheck details, period walk)
 * live on /accounts, /period, and /recurring respectively.
 *
 * Component Oracle Terminal treatment: mono caps eyebrows with //
 * prefix, big numbers in JetBrains Mono with the per-cell accent
 * (cyan / gold / green), mono sub for the date text.
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
        border: "1px solid var(--line)",
        borderRadius: 3,
        overflow: "hidden",
      }}
    >
      <Cell
        label="net worth"
        value={formatMoney(data.netWorthCents)}
        sub={formatMoneySigned(data.periodDeltaCents) + " this period"}
        accent="cyan"
        topRight={`day ${data.day}/${data.totalDays}`}
      />
      <Cell
        label="next paycheck"
        value={formatMoney(data.nextPaycheckCents)}
        sub={`${formatRelativeDate(data.nextPayDate)} · ${formatPillDate(data.nextPayDate)}`}
        accent="gold"
        borderLeft
      />
      <Cell
        label="this period"
        value={`${data.day} / ${data.totalDays}`}
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
  topRight,
}: {
  label: string;
  value: string;
  sub: string;
  accent: "gold" | "ok" | "cyan";
  borderLeft?: boolean;
  topRight?: string;
}) {
  const valueColor =
    accent === "gold"
      ? "var(--gold)"
      : accent === "ok"
      ? "var(--ok)"
      : "var(--terminal-cyan)";
  return (
    <div
      style={{
        padding: "20px 22px",
        borderLeft: borderLeft ? "1px solid var(--line-soft)" : undefined,
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 9.5,
          fontWeight: 600,
          color: "var(--ink-3)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          marginBottom: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <span>
          <span style={{ color: "var(--ink-4)" }}>//</span> {label}
        </span>
        {topRight && (
          <span style={{ color: "var(--ink-4)" }}>{topRight}</span>
        )}
      </div>
      <div
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 26,
          lineHeight: 1,
          color: valueColor,
          fontFeatureSettings: '"tnum" 1, "zero" 1',
          fontWeight: 600,
          letterSpacing: "-0.01em",
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 11,
          color: "var(--ink-3)",
          marginTop: 8,
          letterSpacing: "0.04em",
        }}
      >
        {sub}
      </div>
    </div>
  );
}
