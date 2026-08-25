import * as React from "react";
import { PageHead } from "@/components/alchemy/PageHead";
import { Mandala } from "@/components/alchemy/Mandala";
import { VesselGlyph } from "@/components/alchemy/VesselGlyph";
import { SpendRingCard } from "@/components/dashboard/cards/spend-ring";
import { SankeyFlow, type SankeyNode, type SankeyLink } from "@/components/viz/SankeyFlow";
import { PLANET_COLORS, type PlanetId } from "@/components/alchemy/VesselGlyph";
import {
  TODAY,
  PERIOD_START,
  PERIOD_END,
  NEXT_PAY_DATE,
  liveEnvelopes,
  liveTransactions,
} from "@/lib/mock";
import { formatMoney, formatMoneySigned } from "@/lib/money";
import {
  formatPeriodRange,
  formatShortDate,
  dayOfPeriod,
  periodLength,
  addDays,
  daysBetween,
} from "@/lib/format";
import { PRIOR_PERIODS } from "@/lib/mock-seed";

export const dynamic = "force-dynamic";

/**
 * Period — articulated deep page.
 *
 * Component Oracle Terminal treatment: mono caps section headers
 * with // prefix, JetBrains Mono for amounts and the day counter,
 * Sora for section titles. The Mandala is preserved as the visual
 * centerpiece.
 *
 * Three Period-specific visualizations live here:
 *   1. Pace projection — a cumulative-spend curve over the day-by-day
 *      timeline with a forward projection line ("at this rate, you'll
 *      finish at $X").
 *   2. Closing balance bridge — a stacked-bar walk from Start →
 *      +Income → −Spending → Projected.
 *   3. Period comparison — a grouped bar chart of the last 3 periods'
 *      income / spending / carry.
 */
export default function PeriodPage() {
  const ENVELOPES = liveEnvelopes();
  const TRANSACTIONS = liveTransactions();

  const totalDays = periodLength(PERIOD_START, PERIOD_END);
  const day = dayOfPeriod(TODAY, PERIOD_START, PERIOD_END);
  const daysToPay = Math.max(0, daysBetween(TODAY, NEXT_PAY_DATE));
  const daysAfterPay = Math.max(0, daysBetween(NEXT_PAY_DATE, PERIOD_END));
  const totalIncome = TRANSACTIONS.filter((t) => t.amountCents > 0).reduce((s, t) => s + t.amountCents, 0);
  const totalExpense = TRANSACTIONS.filter((t) => t.amountCents < 0).reduce((s, t) => s + t.amountCents, 0);
  const totalDistill = ENVELOPES.reduce((s, e) => s + e.target, 0);
  // Closing-balance walk components
  const startBalanceCents = 240_000; // carry-in from prior period
  const projectedBalanceCents = startBalanceCents + totalIncome + totalExpense;

  return (
    <div>
      <PageHead
        eyebrow={`// period ${Math.ceil((TODAY.getTime() - PERIOD_START.getTime()) / (14 * 86400000)) + 1} of Q3`}
        title="This Period"
        em={`${formatPeriodRange(PERIOD_START, PERIOD_END)}`}
        accent="cyan"
        actions={
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 6,
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
              <span style={{ color: "var(--ink-4)" }}>//</span> Day
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: 8,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-jetbrains), monospace",
                  fontWeight: 600,
                  fontSize: 48,
                  color: "var(--terminal-cyan)",
                  fontFeatureSettings: '"tnum" 1, "zero" 1',
                }}
              >
                {day}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-jetbrains), monospace",
                  fontSize: 18,
                  color: "var(--ink-3)",
                  fontFeatureSettings: '"tnum" 1',
                }}
              >
                of {totalDays}
              </span>
            </div>
          </div>
        }
        explanation={
          <>
            A period is the slice between two paychecks. Everything that happens in this period — every dollar in, every dollar out, every envelope that fills or empties — is what defines your financial life right now. The needle in the compass below points to today. The colors around the rim are the seven envelopes, each with its own direction. The next paycheck is the one event that will refill them all — and you can see exactly how it'll be distributed.
          </>
        }
      />

      {/* Mandala — the full alchemical compass */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1.2fr",
          gap: 64,
          alignItems: "center",
          marginBottom: 80,
          padding: "32px 0",
          borderTop: "1px solid var(--line)",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <div style={{ display: "grid", placeItems: "center" }}>
          <Mandala
            size={420}
            dayOfPeriod={day}
            totalDays={totalDays}
            todayPlanet="saturn"
          />
          <div
            style={{
              marginTop: 12,
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 10,
              fontWeight: 600,
              color: "var(--gold)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            <span style={{ color: "var(--ink-4)" }}>//</span> The compass · day {day} of {totalDays}
          </div>
        </div>
        <div>
          <div
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 10.5,
              fontWeight: 600,
              color: "var(--terminal-cyan)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              marginBottom: 16,
            }}
          >
            <span style={{ color: "var(--ink-4)" }}>//</span> Where the money goes this period
          </div>
          <h3
            style={{
              fontFamily: "var(--font-sora)",
              fontSize: 32,
              margin: "0 0 16px",
              fontWeight: 600,
              lineHeight: 1.15,
              letterSpacing: "-0.01em",
              color: "var(--ink)",
            }}
          >
            {daysToPay} days until the next paycheck
          </h3>
          <p
            style={{
              fontFamily: "var(--font-sora)",
              fontSize: 16,
              lineHeight: 1.55,
              color: "var(--ink-2)",
              margin: "0 0 24px",
            }}
          >
            On <b style={{ color: "var(--ink)" }}>{formatShortDate(NEXT_PAY_DATE)}</b> the paycheck arrives. Then it will be distributed across the seven envelopes according to your active plan — no confirm, no friction. After the distribution, the period continues for {daysAfterPay} more days on what the envelopes can cover.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 0,
              border: "1px solid var(--line)",
              background: "var(--surface)",
            }}
          >
            <PeriodStat label="period income" value={formatMoney(totalIncome)} accent="cyan" sub={`Paycheck ${formatShortDate(TODAY)}`} />
            <PeriodStat label="period spending" value={formatMoneySigned(totalExpense)} sub={`${totalDays - day} days left`} />
            <PeriodStat label="allocated" value={formatMoney(totalDistill)} sub="across 7 envelopes" />
            <PeriodStat label="projected carry" value={formatMoney(projectedBalanceCents)} sub="after next paycheck" accent={projectedBalanceCents < 0 ? "neg" : "ok"} />
          </div>
        </div>
      </section>

      {/* Period overview: spend ring + safe-to-spend-until-paycheck (#1, #3) */}
      <section style={{ marginBottom: 64 }}>
        <SectionHeader
          title="This period at a glance"
          em="spend ring scoped to the cycle, and what's left to spend before the next paycheck."
        />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
          }}
        >
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: 4,
              padding: 24,
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
                marginBottom: 16,
              }}
            >
              <span style={{ color: "var(--ink-4)" }}>//</span> spend ring · this period
            </div>
            <SpendRingCard
              data={{
                perEnvelope: ENVELOPES.map((e) => ({
                  id: e.id,
                  name: e.name,
                  planet: e.planet as PlanetId,
                  currentCents: e.current,
                  targetCents: e.target,
                })),
                totalSpentCents: Math.abs(totalExpense),
                totalTargetCents: totalDistill,
              }}
            />
          </div>
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: 4,
              padding: 24,
            }}
          >
            <SafeToSpendUntilPaycheck
              envelopes={ENVELOPES}
              transactions={TRANSACTIONS}
              daysToPay={daysToPay}
              today={TODAY}
              periodStart={PERIOD_START}
              periodEnd={PERIOD_END}
            />
          </div>
        </div>
      </section>

      {/* Full allocation breakdown */}
      <section style={{ marginBottom: 64 }}>
        <SectionHeader title="Will be distributed" em="when the next paycheck arrives." />
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 4,
            padding: 4,
          }}
        >
          {/* Sankey allocation waterfall — paycheck → 7 envelopes (#6) */}
          <div style={{ padding: 12 }}>
            <AllocationSankey envelopes={ENVELOPES} totalCents={totalDistill} />
          </div>
          {ENVELOPES.map((e, i) => {
            const pct = totalDistill > 0 ? Math.round((e.target / totalDistill) * 100) : 0;
            // Per-envelope burn-rate sparkline (#4): daily spend in
            // this envelope, oldest first, padded to totalDays.
            const burnCents = Array.from({ length: totalDays }, () => 0);
            for (const t of TRANSACTIONS) {
              if (t.amountCents >= 0) continue;
              if (t.envelopeId !== e.id) continue;
              const d = dayOfPeriod(t.date, PERIOD_START, PERIOD_END);
              if (d >= 1 && d <= totalDays) {
                burnCents[d - 1] = (burnCents[d - 1] ?? 0) + Math.abs(t.amountCents);
              }
            }
            const planetColor = PLANET_COLORS[e.planet];
            return (
              <div
                key={e.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "44px 1fr 100px 2fr 140px 100px",
                  alignItems: "center",
                  gap: 24,
                  padding: "16px 24px",
                  borderBottom: i < ENVELOPES.length - 1 ? "1px solid var(--line-soft)" : "none",
                  fontSize: 15,
                }}
              >
                <VesselGlyph planet={e.planet} size={24} inCircle />
                <div
                  style={{
                    fontFamily: "var(--font-sora)",
                    fontSize: 16,
                    fontWeight: 500,
                    color: "var(--ink)",
                  }}
                >
                  {e.name}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-jetbrains), monospace",
                    fontSize: 14,
                    color: "var(--ink)",
                    fontFeatureSettings: '"tnum" 1, "zero" 1',
                    fontWeight: 500,
                  }}
                >
                  {formatMoney(e.target)}
                </div>
                <div
                  style={{
                    position: "relative",
                    height: 6,
                    background: "var(--cosmos)",
                    border: "1px solid var(--line-soft)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      inset: "0 auto 0 0",
                      width: `${pct}%`,
                      background: "var(--gold)",
                      boxShadow: "0 0 8px var(--gold)",
                    }}
                  />
                </div>
                {/* Per-envelope burn-rate sparkline (#4) */}
                <div style={{ display: "flex", alignItems: "center" }}>
                  <EnvelopeBurnSparkline
                    cents={burnCents}
                    planetColor={planetColor}
                  />
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-jetbrains), monospace",
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--ink-3)",
                    letterSpacing: "0.14em",
                    textAlign: "right",
                  }}
                >
                  {pct}%
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Day-by-day timeline + pace projection */}
      <section style={{ marginBottom: 64 }}>
        <SectionHeader
          title="Day by day · pace"
          em="cumulative spending this period, with a forward projection."
        />
        <PaceProjection
          periodStart={PERIOD_START}
          periodEnd={PERIOD_END}
          today={TODAY}
          transactions={TRANSACTIONS}
        />
      </section>

      {/* Closing balance bridge chart */}
      <section style={{ marginBottom: 64 }}>
        <SectionHeader
          title="Closing balance · this period"
          em="how the start balance walks to the projected carry."
        />
        <ClosingBalanceBridge
          startCents={startBalanceCents}
          incomeCents={totalIncome}
          spendingCents={Math.abs(totalExpense)}
        />
      </section>

      {/* Period-over-period comparison */}
      <section style={{ marginBottom: 64 }}>
        <SectionHeader
          title="Three periods back"
          em="income, spending, and carry for the last three cycles."
        />
        <PeriodComparison
          current={{
            label: "This period",
            incomeCents: totalIncome,
            spendingCents: Math.abs(totalExpense),
            carryCents: projectedBalanceCents,
            accent: "cyan" as const,
          }}
          prior={PRIOR_PERIODS}
        />
      </section>
    </div>
  );
}

function PeriodStat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: "cyan" | "ok" | "neg" | "gold";
}) {
  return (
    <div
      style={{
        padding: "16px 20px",
        borderRight: "1px solid var(--line-soft)",
        borderBottom: "1px solid var(--line-soft)",
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
        }}
      >
        <span style={{ color: "var(--ink-4)" }}>//</span> {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 22,
          fontWeight: 600,
          color:
            accent === "neg"
              ? "var(--neg)"
              : accent === "ok"
              ? "var(--ok)"
              : accent === "gold"
              ? "var(--gold)"
              : accent === "cyan"
              ? "var(--terminal-cyan)"
              : "var(--ink)",
          fontFeatureSettings: '"tnum" 1, "zero" 1',
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 10,
          color: "var(--ink-4)",
          letterSpacing: "0.10em",
          textTransform: "uppercase",
          marginTop: 4,
        }}
      >
        {sub}
      </div>
    </div>
  );
}

function SectionHeader({ title, em }: { title: string; em: string }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 10.5,
          fontWeight: 600,
          color: "var(--terminal-cyan)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          marginBottom: 8,
        }}
      >
        <span style={{ color: "var(--ink-4)" }}>//</span> {title}
      </div>
      <h2
        style={{
          fontFamily: "var(--font-sora)",
          fontSize: 28,
          margin: 0,
          fontWeight: 600,
          color: "var(--ink)",
          letterSpacing: "-0.01em",
        }}
      >
        {title}
      </h2>
      <p
        style={{
          fontFamily: "var(--font-sora)",
          fontSize: 15,
          color: "var(--ink-3)",
          margin: "6px 0 0",
        }}
      >
        {em}
      </p>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Pace projection — the 14-day timeline + a cumulative-spend curve
// with a forward projection line ("at this rate, you'll finish
// at $X"). Reshaped from Dashboard's 7-day rolling pace for
// Period's scope (this cycle, not rolling 7).
// ──────────────────────────────────────────────────────────────────────

interface PaceProps {
  periodStart: Date;
  periodEnd: Date;
  today: Date;
  transactions: ReadonlyArray<{ date: Date; amountCents: number }>;
}

function PaceProjection({ periodStart, periodEnd, today, transactions }: PaceProps) {
  const totalDays = periodLength(periodStart, periodEnd);
  const day = dayOfPeriod(today, periodStart, periodEnd);

  // Cumulative spending per day-of-period (1-based; day 1 = periodStart).
  // Spending = absolute value of negative transactions; we don't subtract
  // income — the projection answers "how fast are you burning through
  // the cycle's budget."
  const spendPerDay: number[] = Array.from({ length: totalDays }, () => 0);
  for (const t of transactions) {
    if (t.amountCents >= 0) continue;
    const d = dayOfPeriod(t.date, periodStart, periodEnd);
    if (d >= 1 && d <= totalDays) {
      spendPerDay[d - 1] = (spendPerDay[d - 1] ?? 0) + Math.abs(t.amountCents);
    }
  }
  const cumulative: number[] = [];
  let run = 0;
  for (const s of spendPerDay) {
    run += s;
    cumulative.push(run);
  }

  const totalSpentCents = run;
  // Linear projection: at day N with cumulative C, projected end =
  // C * (totalDays / N). If N === 0, no projection.
  const projectedEndCents =
    day >= 1 ? Math.round((totalSpentCents * totalDays) / Math.max(day, 1)) : 0;
  const pacePerDay = day >= 1 ? totalSpentCents / day : 0;

  // y-axis max is the larger of (projected) and (actual total).
  const yMaxCents = Math.max(projectedEndCents, totalSpentCents, 100_00);

  // Chart dimensions
  const W = 920;
  const H = 200;
  const padL = 56;
  const padR = 24;
  const padT = 18;
  const padB = 36;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const colW = innerW / totalDays;
  const yToPx = (cents: number) => padT + innerH - (cents / yMaxCents) * innerH;
  const xToPx = (i: number) => padL + colW * (i + 0.5);

  // Build the path data for the cumulative-spend line.
  // Past days: solid line through actual cumulative values.
  // Future days: dashed line following the linear projection.
  const pastPoints: Array<{ x: number; y: number }> = [];
  const projPoints: Array<{ x: number; y: number }> = [];
  for (let i = 0; i < totalDays; i++) {
    const x = xToPx(i);
    const px = yToPx(cumulative[i] ?? 0);
    if (i + 1 <= day) {
      pastPoints.push({ x, y: px });
    } else {
      // Project from the last actual point, linearly to projectedEndCents.
      const startC = day >= 1 ? cumulative[day - 1] ?? 0 : 0;
      const startI = Math.max(day - 1, 0);
      const tDays = Math.max(totalDays - 1 - startI, 1);
      const projAtI = startC + ((projectedEndCents - startC) * (i - startI)) / tDays;
      const projY = yToPx(projAtI);
      projPoints.push({ x, y: projY });
    }
  }

  const toPath = (pts: Array<{ x: number; y: number }>) =>
    pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  // Y-axis ticks: 5 evenly-spaced values from 0 to yMax.
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((p) => Math.round(yMaxCents * p));

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: 4,
        padding: 24,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 24,
          marginBottom: 16,
        }}
      >
        <PaceStat
          label="spent this period"
          value={formatMoney(totalSpentCents)}
          sub={`across ${totalDays} days`}
        />
        <PaceStat
          label="pace per day"
          value={formatMoney(Math.round(pacePerDay))}
          sub="average since period start"
        />
        <PaceStat
          label="finish at"
          value={formatMoney(projectedEndCents)}
          sub="if pace holds"
          accent="gold"
        />
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ display: "block" }}>
        {ticks.map((t, i) => {
          const y = yToPx(t);
          return (
            <g key={i}>
              <line
                x1={padL}
                x2={W - padR}
                y1={y}
                y2={y}
                stroke="var(--line-soft)"
                strokeDasharray="2 3"
                strokeWidth={1}
              />
              <text
                x={padL - 8}
                y={y + 3}
                textAnchor="end"
                fontFamily="var(--font-jetbrains), monospace"
                fontSize={9}
                fill="var(--ink-4)"
                style={{ fontFeatureSettings: '"tnum" 1' }}
              >
                {formatMoney(t)}
              </text>
            </g>
          );
        })}

        {Array.from({ length: totalDays }, (_, i) => {
          const date = addDays(periodStart, i);
          const x = xToPx(i);
          const isToday = i + 1 === day;
          return (
            <g key={i}>
              <text
                x={x}
                y={H - 18}
                textAnchor="middle"
                fontFamily="var(--font-jetbrains), monospace"
                fontSize={9}
                fontWeight={isToday ? 700 : 500}
                fill={isToday ? "var(--gold)" : "var(--ink-3)"}
                style={{ fontFeatureSettings: '"tnum" 1' }}
              >
                {date.getDate()}
              </text>
              <text
                x={x}
                y={H - 6}
                textAnchor="middle"
                fontFamily="var(--font-jetbrains), monospace"
                fontSize={7}
                letterSpacing="0.10em"
                fill={isToday ? "var(--gold)" : "var(--ink-4)"}
              >
                D{i + 1}
              </text>
              {isToday && (
                <line
                  x1={x}
                  x2={x}
                  y1={padT}
                  y2={H - padB}
                  stroke="var(--gold)"
                  strokeWidth={1.5}
                  opacity={0.5}
                />
              )}
            </g>
          );
        })}

        {pastPoints.length > 0 && (
          <path
            d={toPath(pastPoints)}
            fill="none"
            stroke="var(--terminal-cyan)"
            strokeWidth={2}
          />
        )}

        {projPoints.length > 0 && day < totalDays && (
          <path
            d={toPath(projPoints)}
            fill="none"
            stroke="var(--gold)"
            strokeWidth={2}
            strokeDasharray="4 4"
          />
        )}

        {Array.from({ length: day }, (_, i) => {
          const x = xToPx(i);
          const y = yToPx(cumulative[i] ?? 0);
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={2.5}
              fill="var(--terminal-cyan)"
              stroke="var(--surface)"
              strokeWidth={1}
            />
          );
        })}

        {day >= 1 && day < totalDays && (
          <text
            x={W - padR + 4}
            y={yToPx(projectedEndCents) + 3}
            textAnchor="start"
            fontFamily="var(--font-jetbrains), monospace"
            fontSize={9}
            fontWeight={700}
            fill="var(--gold)"
            style={{ fontFeatureSettings: '"tnum" 1, "zero" 1' }}
          >
            {formatMoney(projectedEndCents)}
          </text>
        )}
      </svg>

      <div
        style={{
          display: "flex",
          gap: 24,
          marginTop: 12,
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 10,
          color: "var(--ink-3)",
          letterSpacing: "0.10em",
          textTransform: "uppercase",
        }}
      >
        <span>
          <svg width="20" height="6" style={{ verticalAlign: "middle", marginRight: 6 }}>
            <line x1="0" y1="3" x2="20" y2="3" stroke="var(--terminal-cyan)" strokeWidth="2" />
          </svg>
          Actual
        </span>
        <span>
          <svg width="20" height="6" style={{ verticalAlign: "middle", marginRight: 6 }}>
            <line x1="0" y1="3" x2="20" y2="3" stroke="var(--gold)" strokeWidth="2" strokeDasharray="4 4" />
          </svg>
          Projection
        </span>
        <span>
          <svg width="6" height="14" style={{ verticalAlign: "middle", marginRight: 6 }}>
            <line x1="3" y1="0" x2="3" y2="14" stroke="var(--gold)" strokeWidth="1.5" opacity={0.5} />
          </svg>
          Today
        </span>
      </div>
    </div>
  );
}

function PaceStat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: "cyan" | "ok" | "neg" | "gold";
}) {
  return (
    <div>
      <div
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 9.5,
          fontWeight: 600,
          color: "var(--ink-3)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          marginBottom: 6,
        }}
      >
        <span style={{ color: "var(--ink-4)" }}>//</span> {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 22,
          fontWeight: 600,
          color:
            accent === "gold"
              ? "var(--gold)"
              : accent === "neg"
              ? "var(--neg)"
              : accent === "ok"
              ? "var(--ok)"
              : "var(--terminal-cyan)",
          fontFeatureSettings: '"tnum" 1, "zero" 1',
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 9.5,
          color: "var(--ink-4)",
          letterSpacing: "0.10em",
          textTransform: "uppercase",
          marginTop: 2,
        }}
      >
        {sub}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Closing-balance bridge — a stacked-bar walk from Start → +Income →
// −Spending → Projected. Replaces the prior text-based walk.
// ──────────────────────────────────────────────────────────────────────

interface BridgeProps {
  startCents: number;
  incomeCents: number;
  spendingCents: number;
}

function ClosingBalanceBridge({ startCents, incomeCents, spendingCents }: BridgeProps) {
  const projectedCents = startCents + incomeCents - spendingCents;
  const maxBar = Math.max(startCents + incomeCents, projectedCents) * 1.05;
  const W = 920;
  const H = 280;
  const padL = 60;
  const padR = 60;
  const padT = 36;
  const padB = 56;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const yToPx = (cents: number) => padT + innerH - (cents / maxBar) * innerH;
  const slotW = innerW / 4;
  const barW = Math.min(120, slotW * 0.55);

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((p) => Math.round(maxBar * p));

  interface BarSpec {
    label: string;
    sub: string;
    color: string;
    mode: "absolute" | "stacked-add" | "stacked-sub";
    value: number;
    base: number;
    result: number;
  }
  const bars: BarSpec[] = [
    {
      label: "Start",
      sub: "carry-in",
      color: "var(--terminal-cyan)",
      mode: "absolute",
      value: startCents,
      base: 0,
      result: startCents,
    },
    {
      label: "+ Income",
      sub: "paycheck",
      color: "var(--ok)",
      mode: "stacked-add",
      value: incomeCents,
      base: startCents,
      result: startCents + incomeCents,
    },
    {
      label: "− Spending",
      sub: "outflow",
      color: "var(--mars)",
      mode: "stacked-sub",
      value: spendingCents,
      base: startCents + incomeCents,
      result: startCents + incomeCents - spendingCents,
    },
    {
      label: "Projected",
      sub: "closing",
      color: "var(--gold)",
      mode: "absolute",
      value: projectedCents,
      base: 0,
      result: projectedCents,
    },
  ];

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: 4,
        padding: 24,
      }}
    >
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ display: "block" }}>
        {ticks.map((t, i) => {
          const y = yToPx(t);
          return (
            <g key={i}>
              <line
                x1={padL}
                x2={W - padR}
                y1={y}
                y2={y}
                stroke="var(--line-soft)"
                strokeDasharray="2 3"
                strokeWidth={1}
              />
              <text
                x={padL - 8}
                y={y + 3}
                textAnchor="end"
                fontFamily="var(--font-jetbrains), monospace"
                fontSize={9}
                fill="var(--ink-4)"
                style={{ fontFeatureSettings: '"tnum" 1' }}
              >
                {formatMoney(t)}
              </text>
            </g>
          );
        })}

        {bars.slice(0, -1).map((b, i) => {
          const next = bars[i + 1];
          if (!next) return null;
          const x1 = padL + slotW * (i + 0.5) + barW / 2;
          const x2 = padL + slotW * (i + 1.5) - barW / 2;
          const y1 = yToPx(b.result);
          const y2 =
            next.mode === "stacked-sub"
              ? yToPx(next.base)
              : yToPx(next.mode === "stacked-add" ? next.base + next.value : next.result);
          return (
            <line
              key={`tread-${i}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="var(--ink-3)"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
          );
        })}

        {bars.map((b, i) => {
          const cx = padL + slotW * (i + 0.5);
          const x = cx - barW / 2;
          let y: number;
          let h: number;
          if (b.mode === "absolute") {
            y = yToPx(b.value);
            h = padT + innerH - y;
          } else if (b.mode === "stacked-add") {
            const topY = yToPx(b.base + b.value);
            const botY = yToPx(b.base);
            y = topY;
            h = botY - topY;
          } else {
            const topY = yToPx(b.base);
            const botY = yToPx(b.base - b.value);
            y = topY;
            h = botY - topY;
          }
          return (
            <g key={b.label}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={Math.max(0, h)}
                fill={b.color}
                opacity={0.9}
                rx={2}
              />
              <text
                x={cx}
                y={y - 8}
                textAnchor="middle"
                fontFamily="var(--font-jetbrains), monospace"
                fontSize={11}
                fontWeight={700}
                fill={b.color}
                style={{ fontFeatureSettings: '"tnum" 1, "zero" 1' }}
              >
                {b.mode === "stacked-sub"
                  ? `−${formatMoney(b.value)}`
                  : b.mode === "stacked-add"
                    ? `+${formatMoney(b.value)}`
                    : formatMoney(b.value)}
              </text>
              <text
                x={cx}
                y={H - padB + 18}
                textAnchor="middle"
                fontFamily="var(--font-jetbrains), monospace"
                fontSize={10}
                fontWeight={600}
                fill="var(--ink-2)"
                style={{ textTransform: "uppercase", letterSpacing: "0.12em" }}
              >
                {b.label}
              </text>
              <text
                x={cx}
                y={H - padB + 32}
                textAnchor="middle"
                fontFamily="var(--font-jetbrains), monospace"
                fontSize={9}
                fill="var(--ink-4)"
                style={{ textTransform: "uppercase", letterSpacing: "0.10em" }}
              >
                {b.sub}
              </text>
            </g>
          );
        })}

        <text
          x={W - padR + 4}
          y={yToPx(projectedCents) + 3}
          textAnchor="start"
          fontFamily="var(--font-jetbrains), monospace"
          fontSize={10}
          fontWeight={700}
          fill="var(--gold)"
          style={{ fontFeatureSettings: '"tnum" 1, "zero" 1' }}
        >
          {formatMoney(projectedCents)}
        </text>
      </svg>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Period comparison — a grouped bar chart (Income / Spending / Carry)
// for the last 3 prior periods + the current one. Period-specific
// because Dashboard has no reason to show period history.
// ──────────────────────────────────────────────────────────────────────

interface PeriodColumn {
  label: string;
  incomeCents: number;
  spendingCents: number;
  carryCents: number;
  accent?: "cyan" | "gold";
}

function PeriodComparison({
  current,
  prior,
}: {
  current: PeriodColumn;
  prior: ReadonlyArray<{ label: string; incomeCents: number; spendingCents: number; carryCents: number }>;
}) {
  const periods: PeriodColumn[] = [
    current,
    ...prior.map((p) => ({ ...p, accent: undefined as "cyan" | "gold" | undefined })),
  ];

  const allValues = periods.flatMap((p) => [p.incomeCents, p.spendingCents, p.carryCents]);
  const maxBar = Math.max(...allValues) * 1.1;

  const W = 920;
  const H = 280;
  const padL = 60;
  const padR = 40;
  const padT = 36;
  const padB = 60;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const yToPx = (cents: number) => padT + innerH - (cents / maxBar) * innerH;
  const slotW = innerW / periods.length;
  const groupGap = 8;
  const barW = (slotW - groupGap * 4) / 3;

  const ticks = [0, 0.25, 0.5, 0.75, 1].map((p) => Math.round(maxBar * p));

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: 4,
        padding: 24,
      }}
    >
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ display: "block" }}>
        {ticks.map((t, i) => {
          const y = yToPx(t);
          return (
            <g key={i}>
              <line
                x1={padL}
                x2={W - padR}
                y1={y}
                y2={y}
                stroke="var(--line-soft)"
                strokeDasharray="2 3"
                strokeWidth={1}
              />
              <text
                x={padL - 8}
                y={y + 3}
                textAnchor="end"
                fontFamily="var(--font-jetbrains), monospace"
                fontSize={9}
                fill="var(--ink-4)"
                style={{ fontFeatureSettings: '"tnum" 1' }}
              >
                {formatMoney(t)}
              </text>
            </g>
          );
        })}

        {periods.map((p, pi) => {
          const slotX = padL + slotW * pi;
          const colors = ["var(--ok)", "var(--mars)", "var(--terminal-cyan)"];
          const metrics: Array<{ key: "income" | "spending" | "carry"; cents: number; color: string }> = [
            { key: "income", cents: p.incomeCents, color: colors[0]! },
            { key: "spending", cents: p.spendingCents, color: colors[1]! },
            { key: "carry", cents: p.carryCents, color: colors[2]! },
          ];
          const isCurrent = p.accent === "cyan";
          return (
            <g key={p.label}>
              {metrics.map((m, mi) => {
                const x = slotX + groupGap + mi * (barW + groupGap);
                const y = yToPx(m.cents);
                const h = padT + innerH - y;
                return (
                  <g key={m.key}>
                    <rect
                      x={x}
                      y={y}
                      width={barW}
                      height={Math.max(0, h)}
                      fill={m.color}
                      opacity={isCurrent ? 0.95 : 0.55}
                      rx={2}
                    />
                    {isCurrent && mi === 0 && (
                      <rect
                        x={x - 2}
                        y={y - 2}
                        width={barW + 4}
                        height={Math.max(0, h) + 4}
                        fill="none"
                        stroke="var(--gold)"
                        strokeWidth={1}
                        strokeDasharray="3 3"
                        opacity={0.6}
                        rx={3}
                      />
                    )}
                  </g>
                );
              })}
              <text
                x={slotX + slotW / 2}
                y={H - padB + 18}
                textAnchor="middle"
                fontFamily="var(--font-jetbrains), monospace"
                fontSize={10}
                fontWeight={isCurrent ? 700 : 500}
                fill={isCurrent ? "var(--gold)" : "var(--ink-2)"}
                style={{ textTransform: "uppercase", letterSpacing: "0.10em" }}
              >
                {isCurrent ? "this period" : p.label}
              </text>
            </g>
          );
        })}
      </svg>

      <div
        style={{
          display: "flex",
          gap: 24,
          marginTop: 12,
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 10,
          color: "var(--ink-3)",
          letterSpacing: "0.10em",
          textTransform: "uppercase",
        }}
      >
        <span>
          <span
            style={{
              display: "inline-block",
              width: 10,
              height: 10,
              background: "var(--ok)",
              marginRight: 6,
              verticalAlign: "middle",
              borderRadius: 1,
            }}
          />
          Income
        </span>
        <span>
          <span
            style={{
              display: "inline-block",
              width: 10,
              height: 10,
              background: "var(--mars)",
              marginRight: 6,
              verticalAlign: "middle",
              borderRadius: 1,
            }}
          />
          Spending
        </span>
        <span>
          <span
            style={{
              display: "inline-block",
              width: 10,
              height: 10,
              background: "var(--terminal-cyan)",
              marginRight: 6,
              verticalAlign: "middle",
              borderRadius: 1,
            }}
          />
          Carry
        </span>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Period overview additions (#1, #3, #4, #6).
//   #1 — SpendRingCard (reused from dashboard) with period-scoped data.
//   #3 — SafeToSpendUntilPaycheck: a stat block answering "what can I
//        still spend before the next paycheck without dipping into the
//        hard-locked envelopes (Rent, Debt, Savings, Utilities)?"
//   #4 — EnvelopeBurnSparkline: a tiny per-envelope burn-rate sparkline
//        inline in the Will-be-distributed row, so the user can see at
//        a glance which envelopes are burning fast.
//   #6 — AllocationSankey: a SankeyFlow showing the paycheck fanning
//        out into the 7 envelopes, mirroring the compass metaphor.
// ──────────────────────────────────────────────────────────────────────

// #3 — safe-to-spend-until-paycheck
// Computes the "permission slip" using only the FLEXIBLE envelopes
// (Dining & Joy + Buffer for the demo persona). The hard-locked
// envelopes (Rent, Utilities, Savings, Debt) are excluded — touching
// them is a policy break, not a budget question.
function SafeToSpendUntilPaycheck({
  envelopes,
  transactions,
  daysToPay,
  today,
  periodStart,
  periodEnd,
}: {
  envelopes: ReadonlyArray<{ id: string; name: string; current: number; target: number }>;
  transactions: ReadonlyArray<{ amountCents: number; envelopeId: string | null }>;
  daysToPay: number;
  today: Date;
  periodStart: Date;
  periodEnd: Date;
}) {
  // Hard-coded flexible envelope set for the demo persona.
  // In Cluster 5.x this becomes a user preference ("which envelopes
  // count as flexible / discretionary").
  const FLEXIBLE_IDS = new Set(["env-dining", "env-buffer"]);
  const flexible = envelopes.filter((e) => FLEXIBLE_IDS.has(e.id));

  // Flexible spend this period (what's already gone from the
  // flexible envelopes' targets).
  let spentFromFlexible = 0;
  for (const t of transactions) {
    if (t.amountCents >= 0) continue;
    if (t.envelopeId && FLEXIBLE_IDS.has(t.envelopeId)) {
      spentFromFlexible += Math.abs(t.amountCents);
    }
  }
  const totalFlexibleTarget = flexible.reduce((s, e) => s + e.target, 0);
  const totalFlexibleCurrent = flexible.reduce((s, e) => s + e.current, 0);
  const remainingCents = Math.max(0, totalFlexibleCurrent);
  const perDayCents = daysToPay > 0 ? Math.round(remainingCents / daysToPay) : remainingCents;

  // The "if you go back in time" framing: how much of the flexible
  // budget was left at this point in past periods? (Read-only stat —
  // shows the user what the typical "now" looks like.)
  // For v1, just show the current number + the per-day.

  // Day-of-period (1-based) for context.
  const day = dayOfPeriod(today, periodStart, periodEnd);
  void spentFromFlexible;
  void totalFlexibleTarget;
  void day;

  const accent = remainingCents === 0 ? "neg" : remainingCents < perDayCents * 2 ? "warn" : "cyan";

  return (
    <div>
      <div
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 9.5,
          fontWeight: 600,
          color: "var(--ink-3)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          marginBottom: 16,
        }}
      >
        <span style={{ color: "var(--ink-4)" }}>//</span> safe to spend · before paycheck
      </div>

      {/* Big number */}
      <div
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 44,
          fontWeight: 600,
          color:
            accent === "neg"
              ? "var(--neg)"
              : accent === "warn"
                ? "var(--warn)"
                : "var(--terminal-cyan)",
          fontFeatureSettings: '"tnum" 1, "zero" 1',
          lineHeight: 1,
          marginBottom: 6,
        }}
      >
        {formatMoney(remainingCents)}
      </div>
      <div
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 10.5,
          color: "var(--ink-3)",
          letterSpacing: "0.10em",
          textTransform: "uppercase",
          marginBottom: 24,
        }}
      >
        of {formatMoney(totalFlexibleTarget)} flexible · across Dining & Joy, Buffer
      </div>

      {/* 3-cell row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          border: "1px solid var(--line)",
          borderRadius: 4,
        }}
      >
        <div style={{ padding: "12px 14px", borderRight: "1px solid var(--line-soft)" }}>
          <div
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 9,
              color: "var(--ink-3)",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            per day
          </div>
          <div
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 18,
              fontWeight: 600,
              color: "var(--ink)",
              fontFeatureSettings: '"tnum" 1, "zero" 1',
            }}
          >
            {formatMoney(perDayCents)}
          </div>
        </div>
        <div style={{ padding: "12px 14px", borderRight: "1px solid var(--line-soft)" }}>
          <div
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 9,
              color: "var(--ink-3)",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            days left
          </div>
          <div
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 18,
              fontWeight: 600,
              color: "var(--ink)",
              fontFeatureSettings: '"tnum" 1, "zero" 1',
            }}
          >
            {daysToPay}
          </div>
        </div>
        <div style={{ padding: "12px 14px" }}>
          <div
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 9,
              color: "var(--ink-3)",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              marginBottom: 6,
            }}
          >
            from
          </div>
          <div
            style={{
              fontFamily: "var(--font-sora)",
              fontSize: 12,
              fontWeight: 500,
              color: "var(--ink-2)",
            }}
          >
            {flexible.map((e) => e.name).join(" + ")}
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: 16,
          fontFamily: "var(--font-sora)",
          fontSize: 12,
          lineHeight: 1.5,
          color: "var(--ink-3)",
        }}
      >
        Hard-locked envelopes (Rent, Utilities, Savings, Debt) are excluded — touching those is a policy break, not a budget question.
      </div>
    </div>
  );
}

// #4 — EnvelopeBurnSparkline (per-envelope, inline in the
// Will-be-distributed row). Tiny 7-day burn rate so the user can
// see at a glance which envelopes are burning fast vs flat.
function EnvelopeBurnSparkline({
  cents,
  planetColor,
}: {
  cents: number[];
  planetColor: string;
}) {
  const W = 140;
  const H = 18;
  const padX = 2;
  const padY = 2;
  const innerW = W - padX * 2;
  const innerH = H - padY * 2;
  const max = Math.max(1, ...cents);
  const yMax = max * 1.1;
  const x = (i: number) => padX + (i / Math.max(1, cents.length - 1)) * innerW;
  const y = (v: number) => padY + (1 - v / yMax) * innerH;
  const path = cents
    .map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`)
    .join(" ");
  const hasSpend = cents.some((v) => v > 0);
  const total = cents.reduce((s, v) => s + v, 0);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`Burn rate · ${formatMoney(total)}`}
        style={{ display: "block" }}
      >
        {hasSpend ? (
          <>
            <path d={path} fill="none" stroke={planetColor} strokeWidth={1.5} />
            {cents.length > 0 && (
              <circle
                cx={x(cents.length - 1)}
                cy={y(cents[cents.length - 1] ?? 0)}
                r={2}
                fill={planetColor}
                stroke="var(--surface)"
                strokeWidth={1}
              />
            )}
          </>
        ) : (
          <line
            x1={padX}
            x2={W - padX}
            y1={H - padY}
            y2={H - padY}
            stroke="var(--ink-5)"
            strokeWidth={0.5}
            strokeDasharray="1 2"
            opacity={0.6}
          />
        )}
      </svg>
      <div
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 9.5,
          color: "var(--ink-4)",
          letterSpacing: "0.10em",
          textTransform: "uppercase",
          whiteSpace: "nowrap",
        }}
      >
        {hasSpend ? formatMoney(total) : "—"}
      </div>
    </div>
  );
}

// #6 — AllocationSankey: a SankeyFlow showing the paycheck fanning
// out into the 7 envelopes. Wraps the viz component to provide the
// nodes/links in the shape it expects.
function AllocationSankey({
  envelopes,
  totalCents,
}: {
  envelopes: ReadonlyArray<{ id: string; name: string; planet: PlanetId; target: number }>;
  totalCents: number;
}) {
  const nodes: SankeyNode[] = [
    { id: "paycheck", label: "Paycheck", color: "var(--gold)" },
    ...envelopes.map((e) => ({
      id: e.id,
      label: e.name,
      color: PLANET_COLORS[e.planet],
    })),
  ];
  const links: SankeyLink[] = envelopes
    .filter((e) => e.target > 0)
    .map((e) => ({
      source: "paycheck",
      target: e.id,
      value: e.target,
    }));
  return (
    <SankeyFlow
      nodes={nodes}
      links={links}
      totalCents={totalCents}
      height={220}
      showSource
      sourceLabel="Paycheck"
    />
  );
}
