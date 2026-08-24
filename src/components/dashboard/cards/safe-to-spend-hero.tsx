/**
 * SafeToSpendHero — the daily-telemetry anchor.
 *
 * Lifted ABOVE the spend ring (per the Front-End Architecture Layout
 * Rules) on 2026-08-23 so the cents-remaining-this-period number
 * is the very first thing the user sees. The companion card
 * `DailyTrackingCard` still lives in the dashboard grid for users
 * who want the compact 3-cell variant.
 *
 * Layout (2-col):
 *   LEFT  — the headline number + sub + days/dollars
 *   RIGHT — the "period fuel gauge" — a horizontal bar where the
 *           teal fill = days elapsed, today is a gold vertical
 *           tick, days remaining are dim. A 7-day burn sparkline
 *           sits below the bar so the user can see the actual
 *           daily spend shape.
 *
 * Component Oracle Terminal treatment: mono caps eyebrows with //
 * prefix, big numbers in JetBrains Mono, body in Sora, status
 * markers [OK]/[WARN]/[SIGIL] in mono caps.
 */

import * as React from "react";
import { formatMoney, formatMoneySigned, formatMoneyCompact } from "@/lib/money";
import type { PaycheckBreakdown } from "@/lib/store";

export interface SafeToSpendHeroData {
  safeToSpendCents: number;
  todaySpentCents: number;
  weeklyAvgPerDayCents: number;
  /** 7-element array of cents per day, oldest first. */
  dailySpendCents: number[];
  last7Days: Date[];
  periodStart: Date;
  periodEnd: Date;
  /** 1-based day-of-period. 1 = first day, totalDays = last day. */
  day: number;
  totalDays: number;
  breakdown: PaycheckBreakdown;
}

export function SafeToSpendHero({ data }: { data: SafeToSpendHeroData }) {
  const {
    safeToSpendCents,
    todaySpentCents,
    weeklyAvgPerDayCents,
    dailySpendCents,
    periodStart,
    periodEnd,
    day,
    totalDays,
    breakdown,
  } = data;

  const daysLeft = Math.max(0, totalDays - day);
  // Per-day budget for the remaining cents, divided by days left.
  // Floor at 1 to avoid divide-by-zero.
  const perDayCents =
    daysLeft > 0 ? Math.round(safeToSpendCents / daysLeft) : 0;

  // Expected daily budget for the WHOLE period (incl. already-spent).
  const expectedDailyCents = Math.round(
    (breakdown.spendingCents + breakdown.unallocatedCents) / Math.max(1, totalDays),
  );

  // Pace — how today's spend compares to the expected daily amount.
  const pace = expectedDailyCents > 0 ? todaySpentCents / expectedDailyCents : 0;
  const paceLabel =
    pace === 0
      ? "[OK] calm"
      : pace < 0.5
        ? "[OK] well under"
        : pace < 1
          ? "[OK] under"
          : pace < 1.5
            ? "[OK] on pace"
            : pace < 2
              ? "[WARN] above"
              : "[WARN] well above";
  const paceAccent = pace < 1 ? "var(--ok)" : pace < 1.5 ? "var(--ok)" : "var(--warn)";

  // Safe-to-spend accent: cyan when positive, neg when over the line.
  const safeAccent =
    safeToSpendCents < 0 ? "var(--neg)" : "var(--terminal-cyan)";

  // Fill ratio for the fuel gauge (0 → 1): days elapsed / total days.
  const elapsedRatio = totalDays > 0 ? Math.min(1, day / totalDays) : 0;
  // Ratio of the gauge that's still "fuel": days remaining / total days.
  const remainingRatio = 1 - elapsedRatio;

  // Bar status: when per-day budget < expected → tight (warn); > expected → ok.
  const tight = perDayCents < expectedDailyCents * 0.7;
  const barAccent = tight ? "var(--warn)" : "var(--terminal-cyan)";

  return (
    <section
      aria-label="Daily telemetry — safe to spend"
      style={{
        background: "var(--cosmos-2)",
        border: "1px solid var(--line)",
        borderLeft: `2px solid ${barAccent}`,
        borderRadius: 4,
        padding: "22px 26px 20px",
        marginBottom: 28,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Eyebrow row — mono caps left, status pill right */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 18,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 10.5,
            fontWeight: 600,
            color: "var(--terminal-cyan)",
            letterSpacing: "0.20em",
            textTransform: "uppercase",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span
            aria-hidden
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: "var(--ok)",
              boxShadow: "0 0 6px var(--ok)",
            }}
          />
          // DAILY TELEMETRY · SAFE TO SPEND
        </div>
        <div
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 10,
            fontWeight: 600,
            color: paceAccent,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {paceLabel}
        </div>
      </div>

      {/* 2-col body: number (left) | fuel gauge (right) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.05fr) minmax(0, 1fr)",
          gap: 28,
          alignItems: "center",
        }}
      >
        {/* LEFT — the headline number */}
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 56,
              lineHeight: 0.95,
              color: safeAccent,
              fontFeatureSettings: '"tnum" 1, "zero" 1',
              fontWeight: 700,
              letterSpacing: "-0.025em",
              marginBottom: 8,
            }}
          >
            {formatMoney(safeToSpendCents)}
          </div>
          <div
            style={{
              fontFamily: "var(--font-sora)",
              fontSize: 14,
              color: "var(--ink-2)",
              lineHeight: 1.45,
              marginBottom: 14,
            }}
          >
            {safeToSpendCents < 0
              ? "Over the line — pull back."
              : "After bills, debt, and savings."}
          </div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 14,
              paddingTop: 12,
              borderTop: "1px solid var(--line-soft)",
            }}
          >
            <Metric
              label="days left"
              value={`${daysLeft}`}
              sub={daysLeft === 1 ? "day" : "days"}
            />
            <Sep />
            <Metric
              label="per day"
              value={formatMoneyCompact(perDayCents)}
              sub="to last"
              accent={tight ? "var(--warn)" : "var(--ok)"}
            />
            <Sep />
            <Metric
              label="today"
              value={formatMoneySigned(todaySpentCents)}
              sub={`of ~${formatMoneyCompact(expectedDailyCents)}`}
            />
          </div>
        </div>

        {/* RIGHT — the fuel gauge */}
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              marginBottom: 10,
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
              }}
            >
              // period fuel gauge
            </div>
            <div
              style={{
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 9.5,
                fontWeight: 600,
                color: "var(--ink-3)",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
              }}
            >
              day {day} / {totalDays}
            </div>
          </div>

          <FuelGauge
            day={day}
            totalDays={totalDays}
            elapsedRatio={elapsedRatio}
            remainingRatio={remainingRatio}
            barAccent={barAccent}
            safeAccent={safeAccent}
            periodStart={periodStart}
            periodEnd={periodEnd}
          />

          {/* 7-day burn sparkline below the gauge */}
          <div style={{ marginTop: 14 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 6,
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
                }}
              >
                // 7-day burn
              </div>
              <div
                style={{
                  fontFamily: "var(--font-jetbrains), monospace",
                  fontSize: 9.5,
                  fontWeight: 600,
                  color: "var(--ink-3)",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                }}
              >
                ~{formatMoneyCompact(weeklyAvgPerDayCents)} / day avg
              </div>
            </div>
            <WeekSparkline
              dailyCents={dailySpendCents}
              averageCents={weeklyAvgPerDayCents}
              todayIdx={dailySpendCents.length - 1}
              todayAccent={paceAccent}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Fuel gauge — a horizontal "tank" where the teal fill = days elapsed.
// Today is a gold vertical tick + dot. Days remaining are dim.
// Below the bar: start label, "today" label under the gold tick, EOP label.
// ---------------------------------------------------------------------------

function FuelGauge({
  day,
  totalDays,
  elapsedRatio,
  remainingRatio,
  barAccent,
  safeAccent,
  periodStart,
  periodEnd,
}: {
  day: number;
  totalDays: number;
  elapsedRatio: number;
  remainingRatio: number;
  barAccent: string;
  safeAccent: string;
  periodStart: Date;
  periodEnd: Date;
}) {
  // Container: a wide rounded track. 38px tall to hold the today dot
  // on top of the bar and the dashed line below.
  return (
    <div style={{ width: "100%" }}>
      {/* The bar itself */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height: 38,
          background: "var(--cosmos)",
          border: "1px solid var(--line)",
          borderRadius: 3,
          overflow: "visible",
        }}
      >
        {/* Days-elapsed fill (teal, grows from left to today's tick) */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            width: `${elapsedRatio * 100}%`,
            background: `linear-gradient(90deg, var(--terminal-cyan-dim) 0%, ${barAccent} 100%)`,
            opacity: 0.85,
            transition: "width 240ms cubic-bezier(0.2, 0.7, 0.3, 1)",
            borderRight: "1px solid var(--terminal-cyan-glow)",
            boxShadow: `0 0 12px ${barAccent} inset`,
          }}
        />
        {/* Faint "future" stripe pattern on the right side */}
        {remainingRatio > 0 && (
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: `${elapsedRatio * 100}%`,
              right: 0,
              backgroundImage:
                "repeating-linear-gradient(90deg, transparent 0 6px, rgba(40, 64, 76, 0.4) 6px 7px)",
            }}
          />
        )}
        {/* Gold "today" tick — a vertical bar that crosses the gauge */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: -6,
            bottom: -6,
            left: `calc(${elapsedRatio * 100}% - 1px)`,
            width: 2,
            background: "var(--gold)",
            boxShadow: "0 0 6px var(--gold)",
          }}
        />
        {/* Gold "today" dot — circles the tick at the top of the bar */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: -10,
            left: `calc(${elapsedRatio * 100}% - 5px)`,
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: "var(--gold)",
            border: "2px solid var(--cosmos-2)",
            boxShadow: "0 0 8px var(--gold)",
          }}
        />
      </div>

      {/* Label row under the bar */}
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginTop: 14,
          height: 18,
        }}
      >
        <DateLabel date={periodStart} align="left" />
        {/* "Today" pin label — absolutely positioned under the gold tick */}
        <div
          style={{
            position: "absolute",
            left: `calc(${elapsedRatio * 100}% - 32px)`,
            top: 0,
            width: 64,
            textAlign: "center",
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 9.5,
            fontWeight: 700,
            color: "var(--gold)",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}
        >
          ↑ today
        </div>
        <DateLabel date={periodEnd} align="right" />
      </div>
    </div>
  );
}

function DateLabel({ date, align }: { date: Date; align: "left" | "right" }) {
  return (
    <div
      style={{
        textAlign: align,
        fontFamily: "var(--font-jetbrains), monospace",
        fontSize: 9.5,
        fontWeight: 600,
        color: "var(--ink-3)",
        letterSpacing: "0.18em",
        textTransform: "uppercase",
      }}
    >
      {date
        .toLocaleString("en-US", { month: "short", day: "numeric" })
        .toUpperCase()}
    </div>
  );
}

function Metric({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 9,
          fontWeight: 600,
          color: "var(--ink-4)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
        }}
      >
        // {label}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 4,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 18,
            fontWeight: 700,
            color: accent ?? "var(--ink)",
            lineHeight: 1,
            fontFeatureSettings: '"tnum" 1, "zero" 1',
            letterSpacing: "-0.005em",
          }}
        >
          {value}
        </span>
        {sub && (
          <span
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 10,
              color: "var(--ink-3)",
              letterSpacing: "0.10em",
              textTransform: "uppercase",
            }}
          >
            {sub}
          </span>
        )}
      </div>
    </div>
  );
}

function Sep() {
  return (
    <div
      aria-hidden
      style={{
        width: 1,
        height: 28,
        background: "var(--line-soft)",
        alignSelf: "center",
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// 7-day burn sparkline — pure SVG, matches the DailyTrackingCard's sparkline
// so the visual language stays consistent.
// ---------------------------------------------------------------------------

function WeekSparkline({
  dailyCents,
  averageCents,
  todayIdx,
  todayAccent,
}: {
  dailyCents: number[];
  averageCents: number;
  todayIdx: number;
  todayAccent: string;
}) {
  const W = 360;
  const H = 40;
  const padX = 4;
  const padY = 6;
  const innerW = W - padX * 2;
  const innerH = H - padY * 2;

  const max = Math.max(1, ...dailyCents, averageCents);
  const yMax = max * 1.15;

  const x = (i: number) => padX + (i / Math.max(1, dailyCents.length - 1)) * innerW;
  const y = (v: number) => padY + (1 - v / yMax) * innerH;

  const path = dailyCents
    .map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`)
    .join(" ");

  const areaPath = `${path} L${x(dailyCents.length - 1).toFixed(1)},${(H - padY).toFixed(1)} L${x(0).toFixed(1)},${(H - padY).toFixed(1)} Z`;

  // Spike detection: any day ≥ 2× the average gets a small gold ring
  const spikes = dailyCents
    .map((v, i) => ({ v, i }))
    .filter(({ v }) => v >= averageCents * 2 && v > 0);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height={H}
      preserveAspectRatio="none"
      role="img"
      aria-label="7-day spending shape"
      style={{ display: "block" }}
    >
      {/* Average dashed line */}
      <line
        x1={padX}
        x2={W - padX}
        y1={y(averageCents)}
        y2={y(averageCents)}
        stroke="var(--ink-4)"
        strokeWidth={0.5}
        strokeDasharray="2 2"
        opacity={0.7}
      />
      {/* Filled area under the line */}
      <path d={areaPath} fill="var(--terminal-cyan)" opacity="0.12" />
      {/* The line */}
      <path
        d={path}
        fill="none"
        stroke="var(--terminal-cyan)"
        strokeWidth={1.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.95}
      />
      {/* Spike rings */}
      {spikes.map(({ i }) => (
        <circle
          key={`s${i}`}
          cx={x(i)}
          cy={y(dailyCents[i] ?? 0)}
          r={3.5}
          fill="none"
          stroke="var(--gold)"
          strokeWidth={0.8}
          opacity={0.7}
        />
      ))}
      {/* Today dot — colored by pace */}
      <circle
        cx={x(todayIdx)}
        cy={y(dailyCents[todayIdx] ?? 0)}
        r={3}
        fill={todayAccent}
        stroke="var(--cosmos-2)"
        strokeWidth={1}
      />
    </svg>
  );
}
