/**
 * CashFlowForecastCard — 30/60/90-day balance projection (Cluster 7.26).
 *
 * Surfaces the user's projected checking-account balance over the
 * next N days at the current cadence. Three states:
 *   - `[OK] HEALTHY`     — balance stays above the bill-cycle buffer
 *                          for the whole horizon.
 *   - `[WARN] TIGHT DAYS AHEAD` — the projection shows a day where
 *                          balance dips below the buffer floor.
 *   - `[PENDING] ...`    — honest "needs X to enable" state when
 *                          pay schedule, account, or bills are missing.
 *
 * Component Oracle Terminal treatment: Sora title, JetBrains Mono
 * for amounts/dates, mono caps headers with // prefix, cyan primary
 * line. Same visual language as NetTrajectoryCard — pairs naturally
 * with it on /insights.
 *
 * `compact` mode renders a 60-day chip with the chart and headline
 * but no per-pay-period detail list — used on /dashboard where
 * vertical space is at a premium.
 *
 * No fake timestamps. No fake balances. The data is computed
 * server-side via `loadCashFlowForecast` and passed in as props.
 */

import * as React from "react";
import Link from "next/link";
import { formatMoneyCompact, formatMoneySigned } from "@/lib/money";
import { formatShortDate } from "@/lib/format";
import type {
  CashFlowForecast,
  CashFlowPoint,
  CashFlowStatus,
} from "@/lib/forecast/cash-flow";

export interface CashFlowForecastCardProps {
  data: CashFlowForecast;
  compact?: boolean;
  /** Override the destination link (defaults to /accounts). */
  href?: string;
}

const W = 380;
const H = 140;
const PAD_X = 4;
const PAD_Y = 8;
const INNER_W = W - PAD_X * 2;
const INNER_H = H - PAD_Y * 2;

function pillLabel(status: CashFlowStatus, lowPoint: CashFlowForecast["lowPoint"]): {
  text: string;
  color: string;
} {
  if (status === "pending_no_pay_schedule") {
    return { text: "[PENDING] NO PAY SCHEDULE", color: "var(--vessel-watch)" };
  }
  if (status === "pending_no_account") {
    return { text: "[PENDING] NO ACCOUNT", color: "var(--vessel-watch)" };
  }
  if (status === "pending_no_bills") {
    return { text: "[OK] NO BILLS TO PROJECT", color: "var(--ok)" };
  }
  if (lowPoint) {
    return { text: "[WARN] TIGHT DAYS AHEAD", color: "var(--vessel-watch)" };
  }
  return { text: "[OK] HEALTHY", color: "var(--ok)" };
}

function pendingMessage(status: CashFlowStatus, href: string): React.ReactNode {
  if (status === "pending_no_pay_schedule") {
    return (
      <>
        Set up your pay schedule in{" "}
        <Link href={href} style={{ color: "var(--vessel-accent)" }}>
          /accounts
        </Link>{" "}
        to enable cash-flow projection.
      </>
    );
  }
  if (status === "pending_no_account") {
    return (
      <>
        Add a checking account in{" "}
        <Link href={href} style={{ color: "var(--vessel-accent)" }}>
          /accounts
        </Link>{" "}
        to enable cash-flow projection.
      </>
    );
  }
  if (status === "pending_no_bills") {
    return (
      <>
        Add a bill in{" "}
        <Link
          href="/obligations?tab=bills"
          style={{ color: "var(--vessel-accent)" }}
        >
          /obligations
        </Link>{" "}
        to see when they'll hit your balance.
      </>
    );
  }
  return null;
}

export function CashFlowForecastCard({
  data,
  compact = false,
  href = "/accounts",
}: CashFlowForecastCardProps) {
  const isPending =
    data.status === "pending_no_pay_schedule" ||
    data.status === "pending_no_account";
  const pill = pillLabel(data.status, data.lowPoint);

  // For pending states, render a minimal honest card.
  if (isPending) {
    return (
      <section
        data-testid="cash-flow-forecast-card"
        data-status={data.status}
        style={{
          background: "var(--vessel-surface)",
          border: "1px solid var(--vessel-border)",
          borderRadius: 4,
          padding: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 6,
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 10.5,
              fontWeight: 600,
              color: "var(--vessel-accent)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            <span style={{ color: "var(--ink-4)" }}>//</span> cash flow ·{" "}
            {data.horizonDays}d
          </div>
          <span
            data-testid="cash-flow-pill"
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 9.5,
              fontWeight: 600,
              color: pill.color,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
            }}
          >
            {pill.text}
          </span>
        </div>
        <h3
          style={{
            fontFamily: "var(--font-sora)",
            fontSize: 22,
            fontWeight: 600,
            margin: "0 0 8px",
            color: "var(--ink)",
            letterSpacing: "-0.005em",
          }}
        >
          Cash flow, {data.horizonDays} days
        </h3>
        <p
          data-testid="cash-flow-pending-message"
          style={{
            fontFamily: "var(--font-sora)",
            fontSize: 13.5,
            color: "var(--ink-3)",
            marginBottom: 0,
            lineHeight: 1.5,
          }}
        >
          {pendingMessage(data.status, href)}
        </p>
      </section>
    );
  }

  // Real forecast — render the chart + headline + per-paycheck detail.
  const series = data.series;
  const lastPoint = series[series.length - 1];
  const firstPoint = series[0];
  const points = series.map((p) => p.balanceCents);
  const max = Math.max(...points, data.bufferFloorCents);
  const min = Math.min(...points, data.bufferFloorCents, 0);
  const range = max - min || 1;

  const toX = (i: number) =>
    PAD_X + (series.length === 1 ? 0 : (i / (series.length - 1)) * INNER_W);
  const toY = (v: number) => PAD_Y + (1 - (v - min) / range) * INNER_H;

  const bufferY = toY(data.bufferFloorCents);

  // Build the line + area paths
  const lineSegments = series.map((p, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(p.balanceCents)}`);
  const linePath = lineSegments.join(" ");
  const areaPath =
    lineSegments.join(" ") +
    ` L ${toX(series.length - 1)} ${PAD_Y + INNER_H} L ${toX(0)} ${PAD_Y + INNER_H} Z`;

  const start = firstPoint ? firstPoint.balanceCents : data.startBalanceCents;
  const end = lastPoint ? lastPoint.balanceCents : data.startBalanceCents;
  const delta = end - start;

  return (
    <section
      data-testid="cash-flow-forecast-card"
      data-status={data.status}
      data-horizon={data.horizonDays}
      data-start-balance-cents={data.startBalanceCents}
      data-end-balance-cents={data.endBalanceCents}
      data-low-day={data.lowPoint?.date ?? ""}
      data-paycheck-count={data.paycheckCount}
      data-bill-count={data.billCount}
      style={{
        background: "var(--vessel-surface)",
        border: "1px solid var(--vessel-border)",
        borderRadius: 4,
        padding: 24,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 6,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 10.5,
            fontWeight: 600,
            color: "var(--vessel-accent)",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}
        >
          <span style={{ color: "var(--ink-4)" }}>//</span> cash flow ·{" "}
          {data.horizonDays}d
        </div>
        <span
          data-testid="cash-flow-pill"
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 9.5,
            fontWeight: 600,
            color: pill.color,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
          }}
        >
          {pill.text}
        </span>
      </div>
      <h3
        style={{
          fontFamily: "var(--font-sora)",
          fontSize: 22,
          fontWeight: 600,
          margin: "0 0 4px",
          color: "var(--ink)",
          letterSpacing: "-0.005em",
        }}
      >
        Cash flow, {data.horizonDays} days
      </h3>
      <p
        style={{
          fontFamily: "var(--font-sora)",
          fontSize: 13.5,
          color: "var(--ink-3)",
          margin: "0 0 18px",
          lineHeight: 1.5,
        }}
      >
        Projected at current cadence — paychecks, bills, and envelope
        contributions.
        {data.lowPoint && (
          <>
            {" "}
            <span
              data-testid="cash-flow-low-point-callout"
              style={{ color: "var(--vessel-watch)", fontWeight: 600 }}
            >
              Tight day on {formatShortDate(data.lowPoint.date)} (
              {data.lowPoint.daysFromNow}d away, projected balance{" "}
              {formatMoneySigned(data.lowPoint.balanceCents)}).
            </span>
          </>
        )}
      </p>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginBottom: 6,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 9.5,
              fontWeight: 600,
              color: "var(--ink-3)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              marginBottom: 2,
            }}
          >
            <span style={{ color: "var(--ink-4)" }}>//</span> now
          </div>
          <div
            data-testid="cash-flow-now"
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 22,
              color: "var(--vessel-accent)",
              fontFeatureSettings: '"tnum" 1, "zero" 1',
              fontWeight: 600,
            }}
          >
            {formatMoneyCompact(data.startBalanceCents)}
          </div>
        </div>
        <div
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 11,
            color: delta >= 0 ? "var(--ok)" : "var(--vessel-watch)",
          }}
        >
          {delta >= 0 ? "↗" : "↘"} {formatMoneySigned(delta)}
        </div>
        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <div
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 9.5,
              fontWeight: 600,
              color: "var(--ink-3)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              marginBottom: 2,
            }}
          >
            <span style={{ color: "var(--ink-4)" }}>//</span> {data.horizonDays}d
          </div>
          <div
            data-testid="cash-flow-end"
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 22,
              color: "var(--jupiter)",
              fontFeatureSettings: '"tnum" 1, "zero" 1',
              fontWeight: 600,
            }}
          >
            {formatMoneyCompact(data.endBalanceCents)}
          </div>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        preserveAspectRatio="none"
        data-testid="cash-flow-chart"
      >
        <defs>
          <linearGradient id="cff-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--vessel-accent)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="var(--vessel-accent)" />
          </linearGradient>
          <linearGradient id="cff-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--vessel-accent)" stopOpacity="0.32" />
            <stop offset="100%" stopColor="var(--vessel-accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* grid lines */}
        {[0.25, 0.5, 0.75].map((p) => (
          <line
            key={p}
            x1={PAD_X}
            x2={W - PAD_X}
            y1={PAD_Y + INNER_H * p}
            y2={PAD_Y + INNER_H * p}
            stroke="var(--vessel-border)"
            strokeWidth="0.5"
            strokeDasharray="2 3"
          />
        ))}
        {/* buffer floor reference line */}
        {data.bufferFloorCents > 0 && (
          <>
            <line
              x1={PAD_X}
              x2={W - PAD_X}
              y1={bufferY}
              y2={bufferY}
              stroke="var(--gold)"
              strokeWidth="0.6"
              strokeDasharray="3 3"
              opacity="0.6"
            />
            <text
              x={W - PAD_X - 2}
              y={bufferY - 3}
              textAnchor="end"
              fontFamily="var(--font-jetbrains), monospace"
              fontSize="6.5"
              fill="var(--gold)"
              letterSpacing="1"
              fontWeight={600}
            >
              BUFFER · {formatMoneyCompact(data.bufferFloorCents)}
            </text>
          </>
        )}
        {/* area fill */}
        <path d={areaPath} fill="url(#cff-fill)" />
        {/* line */}
        <path
          d={linePath}
          fill="none"
          stroke="url(#cff-grad)"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* pay-period dots (gold) */}
        {series.map((p, i) => {
          if (p.incomeCents <= 0) return null;
          return (
            <circle
              key={`pay-${i}`}
              cx={toX(i)}
              cy={toY(p.balanceCents)}
              r="2"
              fill="var(--gold)"
            />
          );
        })}
        {/* bill-day dots (warn amber) */}
        {series.map((p, i) => {
          if (p.billsCents <= 0) return null;
          return (
            <circle
              key={`bill-${i}`}
              cx={toX(i)}
              cy={toY(p.balanceCents)}
              r="2"
              fill="var(--vessel-watch)"
            />
          );
        })}
        {/* low-point dot if any */}
        {data.lowPoint && (
          (() => {
            const lpIdx = series.findIndex((p) => p.date === data.lowPoint!.date);
            if (lpIdx < 0) return null;
            return (
              <circle
                cx={toX(lpIdx)}
                cy={toY(series[lpIdx]!.balanceCents)}
                r="3.5"
                fill="var(--vessel-watch)"
              />
            );
          })()
        )}
      </svg>

      <div
        data-testid="cash-flow-subtext"
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 10,
          color: "var(--ink-3)",
          marginTop: 10,
          letterSpacing: "0.06em",
        }}
      >
        {data.paycheckCount} paycheck{data.paycheckCount === 1 ? "" : "s"}
        {" · "}
        {data.billCount} bill{data.billCount === 1 ? "" : "s"}
        {" · "}
        horizon {data.horizonDays}d · buffer {formatMoneyCompact(data.bufferFloorCents)}
      </div>

      {!compact && (
        <ul
          data-testid="cash-flow-paycheck-list"
          style={{
            marginTop: 16,
            padding: 0,
            listStyle: "none",
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 10.5,
            color: "var(--ink-2)",
          }}
        >
          {series
            .filter((p) => p.incomeCents > 0 || p.billsCents > 0)
            .slice(0, 6)
            .map((p: CashFlowPoint, idx: number) => (
              <li
                key={idx}
                data-testid="cash-flow-paycheck-row"
                data-date={p.date}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "4px 0",
                  borderBottom: "1px solid var(--vessel-border)",
                }}
              >
                <span>
                  <span style={{ color: "var(--ink-4)" }}>·</span>{" "}
                  {formatShortDate(p.date)}
                </span>
                <span style={{ color: "var(--ink-3)" }}>
                  {p.incomeCents > 0 && (
                    <span style={{ color: "var(--ok)" }}>
                      +{formatMoneyCompact(p.incomeCents)}
                    </span>
                  )}
                  {p.billsCents > 0 && (
                    <span style={{ color: "var(--vessel-watch)", marginLeft: 6 }}>
                      −{formatMoneyCompact(p.billsCents)}
                    </span>
                  )}
                  <span style={{ marginLeft: 10, color: "var(--ink-2)" }}>
                    {formatMoneyCompact(p.balanceCents)}
                  </span>
                </span>
              </li>
            ))}
        </ul>
      )}
    </section>
  );
}
