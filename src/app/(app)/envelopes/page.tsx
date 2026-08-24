import * as React from "react";
import Link from "next/link";
import { PageHead } from "@/components/alchemy/PageHead";
import { EnvelopeBarChart } from "@/components/alchemy/EnvelopeBarChart";
import { VesselGlyph, type PlanetId } from "@/components/alchemy/VesselGlyph";
import { EnvelopeMiniBar } from "@/components/viz/EnvelopeMiniBar";
import { BudgetVsActual, type BudgetVsActualRow } from "@/components/viz/BudgetVsActual";
import { RebalanceForm } from "@/components/envelopes/RebalanceForm";
import { liveEnvelopes, liveTransactions, TODAY, PERIOD_START, PERIOD_END } from "@/lib/mock";
import { formatMoney, formatMoneySigned } from "@/lib/money";
import { formatShortDate, addDays, daysBetween, dayOfPeriod, periodLength } from "@/lib/format";

export const dynamic = "force-dynamic";

/**
 * Envelopes — articulated deep page.
 *
 * Component Oracle Terminal treatment: Sora section titles, JetBrains
 * Mono for amounts and labels, mono caps section headers with // prefix.
 * Primary "New" CTA in terminal-cyan. Status accents (over = neg,
 * near = warn, ok = ok-green) preserved as semantic mapping.
 */
export default function EnvelopesPage() {
  // Live reads: the bar chart and over-limit count reflect the current
  // store state, including any allocations from the paycheck simulator.
  const ENVELOPES = liveEnvelopes();
  const TRANSACTIONS = liveTransactions();
  const overLimit = ENVELOPES.filter((e) => e.current > e.target && e.target > 0);
  const nearLimit = ENVELOPES.filter(
    (e) => e.current <= e.target && e.current >= e.target * 0.85 && e.target > 0,
  );
  const onTrack = ENVELOPES.filter(
    (e) => e.current < e.target * 0.85 || e.target === 0,
  );
  const totalBalance = ENVELOPES.reduce((s, e) => s + e.current, 0);
  const totalTarget = ENVELOPES.reduce((s, e) => s + e.target, 0);

  return (
    <div>
      <PageHead
        eyebrow="// money · envelopes"
        title="Envelopes"
        em="each with a purpose."
        accent="cyan"
        actions={
          <Link
            href="/envelopes/new"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontFamily: "var(--font-jetbrains), monospace",
              background: "var(--terminal-cyan)",
              color: "var(--void)",
              border: 0,
              borderRadius: 2,
              padding: "12px 22px",
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              textDecoration: "none",
              boxShadow: "0 0 16px rgba(45, 212, 191, 0.3)",
            }}
          >
            + New envelope
          </Link>
        }
        explanation={
          <>
            An envelope is a small budget for one part of your life. Seven come with Compass — one for each of the basic areas (rent, groceries, utilities, joy, buffer, savings, debt). You can add more any time. Set a target for each. When the paycheck arrives, money moves in automatically. When you spend, the balance drops. When it hits 85%, the bar turns amber. When it goes over 100%, the bar shows it in iron red — your signal to slow down or adjust the target.
          </>
        }
      />

      {/* Summary strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 0,
          border: "1px solid var(--line)",
          background: "var(--surface)",
          marginBottom: 56,
        }}
      >
        <SummaryCell label="envelopes" value={ENVELOPES.length.toString()} sub="7 planetary · 0 custom" />
        <SummaryCell
          label="total balance"
          value={formatMoney(totalBalance)}
          sub={`of ${formatMoney(totalTarget)} target`}
        />
        <SummaryCell
          label="needs attention"
          value={overLimit.length.toString()}
          sub={overLimit.length === 0 ? "all within target" : "over limit — review"}
          accent={overLimit.length > 0 ? "neg" : "ok"}
        />
        <SummaryCell
          label="on track"
          value={onTrack.length.toString()}
          sub={`${nearLimit.length} near limit`}
        />
      </div>

      <section style={{ marginBottom: 64 }}>
        <SectionHeader
          title="Move between vessels"
          em="rebalance without waiting for a paycheck."
          meta="Atomic — both balances update or neither does. Audited."
        />
        <RebalanceForm
          envelopes={ENVELOPES.map((e) => ({
            id: e.id,
            name: e.name,
            planet: e.planet,
            currentCents: e.current,
            targetCents: e.target,
          }))}
        />
      </section>

      <section style={{ marginBottom: 64 }}>
        <SectionHeader
          title="Budget vs actual"
          em="this period."
          meta="Gold = plan per paycheck, planetary = what's actually happened so far."
        />
        <BudgetVsActual rows={ENVELOPES.map((e) => {
          const plan = e.target;
          const actual = e.current;
          return {
            id: e.id,
            name: e.name,
            planet: e.planet,
            planCents: plan,
            actualCents: actual,
          } satisfies BudgetVsActualRow;
        })} />
      </section>

      {/* Needs attention — over limit envelopes in full detail */}
      {overLimit.length > 0 && (
        <section style={{ marginBottom: 64 }}>
          <SectionHeader
            title="Over limit"
            em={
              overLimit.length === 1
                ? "one envelope needs attention."
                : `${overLimit.length} envelopes need attention.`
            }
            accent="neg"
            meta="These spent more than the target. Open the envelope to see recent activity."
          />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            {overLimit.map((e) => (
              <EnvelopeDetail key={e.id} envelope={e} transactions={TRANSACTIONS} />
            ))}
          </div>
        </section>
      )}

      {/* All envelopes — compact summary row
          (replaces the old 7-card detail grid, which duplicated the bar
          chart above and added vertical mass without much new signal).
          The bar chart shows fill; this row shows the headline numbers
          so the user can scan balance/target/pct without a card stack. */}
      <section style={{ marginBottom: 64 }}>
        <SectionHeader
          title="Every envelope"
          em="at a glance."
          meta="Each row carries its own bar — the visual sits right next to the data."
        />
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 4,
            overflow: "hidden",
          }}
        >
          {ENVELOPES.map((e, i) => {
            const pct = e.target > 0 ? Math.min((e.current / e.target) * 100, 100) : 0;
            const isOver = e.current > e.target && e.target > 0;
            return (
              <div
                key={e.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "32px 1fr 100px 100px 160px 60px",
                  alignItems: "center",
                  gap: 20,
                  padding: "16px 24px",
                  borderBottom: i < ENVELOPES.length - 1 ? "1px solid var(--line-soft)" : "none",
                  fontSize: 14,
                }}
              >
                <span style={{ fontSize: 18, lineHeight: 1, color: e.planet ? `var(--${e.planet})` : "var(--ink-2)" }}>
                  <VesselGlyph planet={e.planet} size={18} />
                </span>
                <Link
                  href={`/envelopes/${e.id}`}
                  style={{
                    fontFamily: "var(--font-sora)",
                    fontSize: 15,
                    fontWeight: 500,
                    color: "var(--ink)",
                    textDecoration: "none",
                  }}
                >
                  {e.name} →
                </Link>
                <span
                  style={{
                    fontFamily: "var(--font-jetbrains), monospace",
                    fontSize: 13,
                    color: "var(--ink)",
                    fontFeatureSettings: '"tnum" 1, "zero" 1',
                    textAlign: "right",
                    fontWeight: 500,
                  }}
                >
                  {formatMoney(e.current)}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-jetbrains), monospace",
                    fontSize: 12,
                    color: "var(--ink-3)",
                    textAlign: "right",
                  }}
                >
                  of {formatMoney(e.target)}
                </span>
                {/* The per-envelope mini bar — directly next to the
                    current/target numbers it visualizes. */}
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <EnvelopeMiniBar
                    planet={e.planet}
                    currentCents={e.current}
                    targetCents={e.target}
                    width={140}
                    height={8}
                  />
                </div>
                <span
                  style={{
                    fontFamily: "var(--font-jetbrains), monospace",
                    fontSize: 10,
                    fontWeight: 700,
                    color: isOver ? "var(--neg)" : pct >= 0.85 ? "var(--warn)" : "var(--ok)",
                    letterSpacing: "0.14em",
                    textAlign: "right",
                  }}
                >
                  {Math.round(pct)}%
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Insight at the bottom — dynamic. */}
      <EnvelopesInsight
        overLimit={overLimit}
        onTrack={onTrack.length}
        totalEnvelopes={ENVELOPES.length}
      />
    </div>
  );
}

// ---------- Subcomponents ----------

function SummaryCell({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: "ok" | "neg";
}) {
  return (
    <div
      style={{
        padding: "20px 24px",
        borderRight: "1px solid var(--line-soft)",
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
          marginBottom: 10,
        }}
      >
        <span style={{ color: "var(--ink-4)" }}>//</span> {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 24,
          lineHeight: 1,
          color:
            accent === "neg"
              ? "var(--neg)"
              : accent === "ok"
              ? "var(--ok)"
              : "var(--ink)",
          fontFeatureSettings: '"tnum" 1, "zero" 1',
          fontWeight: 600,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 10.5,
          color: "var(--ink-3)",
          marginTop: 6,
          letterSpacing: "0.04em",
        }}
      >
        {sub}
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  em,
  meta,
  accent = "cyan",
}: {
  title: string;
  em?: string;
  meta?: string;
  accent?: "cyan" | "neg" | "jupiter" | "gold";
}) {
  const accentColor =
    accent === "neg"
      ? "var(--neg)"
      : accent === "jupiter"
      ? "var(--jupiter)"
      : accent === "gold"
      ? "var(--gold)"
      : "var(--terminal-cyan)";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        marginBottom: 28,
        paddingBottom: 16,
        borderBottom: "1px solid var(--line)",
        position: "relative",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <span
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 9.5,
            fontWeight: 600,
            color: accentColor,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}
        >
          <span style={{ color: "var(--ink-4)" }}>//</span>
        </span>
        <h2
          style={{
            fontFamily: "var(--font-sora)",
            fontWeight: 600,
            fontSize: 26,
            letterSpacing: "-0.01em",
            margin: 0,
            color: "var(--ink)",
          }}
        >
          {title}
        </h2>
        {em && (
          <span
            style={{
              fontFamily: "var(--font-sora)",
              fontWeight: 400,
              fontSize: 16,
              color: "var(--ink-3)",
            }}
          >
            {em}
          </span>
        )}
      </div>
      {meta && (
        <div
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 10,
            color: "var(--ink-3)",
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            maxWidth: 380,
            textAlign: "right",
          }}
        >
          {meta}
        </div>
      )}
      <span
        aria-hidden
        style={{
          position: "absolute",
          bottom: -1,
          left: 0,
          width: 80,
          height: 1,
          background: accentColor,
          boxShadow: `0 0 8px ${accentColor}`,
        }}
      />
    </div>
  );
}

function EnvelopeDetail({
  envelope,
  transactions,
  compact = false,
}: {
  envelope: ReturnType<typeof liveEnvelopes>[number];
  transactions: ReturnType<typeof liveTransactions>;
  compact?: boolean;
}) {
  const e = envelope;
  const pct = e.target > 0 ? Math.min((e.current / e.target) * 100, 100) : 0;
  const isOver = e.current > e.target && e.target > 0;
  const daysLeft = Math.max(0, daysBetween(TODAY, addDays(TODAY, 5)));
  const recentTx = transactions.filter((t) => t.envelope === e.id).slice(0, compact ? 2 : 3);
  const overage = isOver ? e.current - e.target : 0;

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: 4,
        padding: "24px 28px 22px",
        position: "relative",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 18,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 2,
              display: "grid",
              placeItems: "center",
              background: "var(--cosmos)",
              border: "1px solid var(--line)",
              position: "relative",
            }}
          >
            <VesselGlyph planet={e.planet} size={22} />
            <span
              aria-hidden
              style={{
                position: "absolute",
                inset: -3,
                borderRadius: 2,
                border: "1px dashed var(--line-soft)",
              }}
            />
          </div>
          <div>
            <div
              style={{
                fontFamily: "var(--font-sora)",
                fontSize: 20,
                fontWeight: 600,
                color: "var(--ink)",
                letterSpacing: "-0.005em",
              }}
            >
              {e.name}
            </div>
            <div
              style={{
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 10,
                color: "var(--ink-3)",
                marginTop: 2,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
              }}
            >
              {planetName(e.planet)}
            </div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 22,
              fontWeight: 600,
              color: isOver ? "var(--neg)" : pct >= 0.85 ? "var(--warn)" : "var(--ink)",
              fontFeatureSettings: '"tnum" 1, "zero" 1',
            }}
          >
            {formatMoney(e.current)}
          </div>
          <div
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 11,
              color: "var(--ink-3)",
              marginTop: 2,
            }}
          >
            of {formatMoney(e.target)} · {Math.round(pct)}%
          </div>
        </div>
      </div>

      {/* Bar */}
      <div
        style={{
          position: "relative",
          height: 6,
          background: "var(--cosmos)",
          border: "1px solid var(--line-soft)",
          overflow: "hidden",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: "0 auto 0 0",
            width: `${pct}%`,
            background: isOver ? "var(--neg)" : pct >= 0.85 ? "var(--warn)" : "var(--ok)",
            boxShadow:
              isOver
                ? "0 0 8px var(--neg)"
                : pct >= 0.85
                ? "0 0 8px var(--warn)"
                : "0 0 8px var(--ok)",
          }}
        />
        {isOver && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "repeating-linear-gradient(45deg, transparent 0, transparent 4px, rgba(6,8,15,0.3) 4px, rgba(6,8,15,0.3) 8px)",
              pointerEvents: "none",
            }}
          />
        )}
      </div>

      {/* Quick stats */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 11,
          color: "var(--ink-2)",
          paddingBottom: compact ? 0 : 16,
          borderBottom: compact ? "none" : "1px solid var(--line-soft)",
          marginBottom: compact ? 0 : 16,
          letterSpacing: "0.04em",
        }}
      >
        <span>
          <b style={{ color: "var(--ink)", fontWeight: 700 }}>{daysLeft}</b> days left
        </span>
        <span>
          {isOver ? (
            <b style={{ color: "var(--neg)", fontWeight: 700 }}>[WARN] +{formatMoney(overage)} over</b>
          ) : (
            <b style={{ color: "var(--ok)", fontWeight: 700 }}>[OK] {formatMoney(e.target - e.current)} left</b>
          )}
        </span>
      </div>

      {/* Recent activity */}
      {!compact && recentTx.length > 0 && (
        <div>
          <div
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 9.5,
              fontWeight: 600,
              color: "var(--ink-3)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            <span style={{ color: "var(--ink-4)" }}>//</span> Recent activity
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {recentTx.map((t) => (
              <div
                key={t.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: 13,
                }}
              >
                <span style={{ color: "var(--ink-2)" }}>{t.payee ?? "—"}</span>
                <span
                  style={{
                    fontFamily: "var(--font-jetbrains), monospace",
                    color: t.amountCents < 0 ? "var(--ink)" : "var(--ok)",
                    fontFeatureSettings: '"tnum" 1',
                  }}
                >
                  {formatMoneySigned(t.amountCents)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function planetName(p: PlanetId | null): string {
  if (!p) return "custom";
  return p.charAt(0).toUpperCase() + p.slice(1);
}

function EnvelopesInsight({
  overLimit,
  onTrack,
  totalEnvelopes,
}: {
  overLimit: Array<{ id: string; name: string; current: number; target: number }>;
  onTrack: number;
  totalEnvelopes: number;
}) {
  if (overLimit.length === 0) {
    return (
      <section
        style={{
          background: "var(--cosmos-2)",
          border: "1px solid var(--line)",
          borderLeft: "2px solid var(--ok)",
          borderRadius: 4,
          padding: "24px 28px",
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <div
          aria-hidden
          style={{
            width: 36,
            height: 36,
            borderRadius: 2,
            display: "grid",
            placeItems: "center",
            fontSize: 11,
            fontFamily: "var(--font-jetbrains), monospace",
            fontWeight: 700,
            color: "var(--ok)",
            background: "rgba(74, 222, 128, 0.10)",
            border: "1px solid var(--ok)",
            flexShrink: 0,
            letterSpacing: "0.04em",
          }}
        >
          [OK]
        </div>
        <div>
          <div
            style={{
              fontFamily: "var(--font-sora)",
              fontSize: 15,
              fontWeight: 600,
              color: "var(--ink)",
              marginBottom: 2,
            }}
          >
            All envelopes are within target.
          </div>
          <div
            style={{
              fontFamily: "var(--font-sora)",
              fontSize: 13,
              color: "var(--ink-2)",
            }}
          >
            {onTrack} of {totalEnvelopes} on track. Next paycheck will top up the ones that need it.
          </div>
        </div>
      </section>
    );
  }

  const worst = overLimit[0];
  if (!worst) return null;
  const overage = worst.current - worst.target;
  return (
    <section
      style={{
        background: "var(--cosmos-2)",
        border: "1px solid var(--line)",
        borderLeft: "2px solid var(--neg)",
        borderRadius: 4,
        padding: "24px 28px",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 9.5,
          fontWeight: 600,
          color: "var(--neg)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          marginBottom: 8,
        }}
      >
        <span style={{ color: "var(--ink-4)" }}>//</span> [WARN] {overLimit.length}{" "}
        {overLimit.length === 1 ? "envelope" : "envelopes"} need attention
      </div>
      <div
        style={{
          fontFamily: "var(--font-sora)",
          fontSize: 15,
          color: "var(--ink-2)",
          lineHeight: 1.5,
        }}
      >
        <b style={{ color: "var(--neg)", fontWeight: 600 }}>{worst.name}</b> is over by{" "}
        <span
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            color: "var(--neg)",
            fontFeatureSettings: '"tnum" 1',
          }}
        >
          {formatMoney(overage)}
        </span>
        . Consider raising the target to{" "}
        <span
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            color: "var(--ink)",
            fontFeatureSettings: '"tnum" 1',
          }}
        >
          {formatMoney(worst.current + Math.round(overage * 0.1))}
        </span>{" "}
        next period, or trim the spending.
      </div>
    </section>
  );
}
