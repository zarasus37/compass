import * as React from "react";
import Link from "next/link";
import { PageHead } from "@/components/alchemy/PageHead";
import { formatMoney } from "@/lib/money";
import {
  liveDebts,
  liveEnvelopes,
  livePlan,
  TODAY,
  PERIOD_START,
  PERIOD_END,
} from "@/lib/mock";
import { paycheckBreakdown } from "@/lib/store";
import { DebtPayoffSimulator } from "@/components/debts/DebtPayoffSimulator";
import { DebtSparkline } from "@/components/viz/DebtSparkline";
import { liveBills, liveSnapshot } from "@/lib/mock";

export const dynamic = "force-dynamic";

/**
 * Debts — articulated deep page.
 *
 * Component Oracle Terminal treatment: Sora section titles, JetBrains
 * Mono for amounts and labels, mono caps headers with // prefix.
 * Saturn planet color preserved for the debt-specific accent (semantic).
 * Primary CTA in terminal-cyan.
 */
export default function DebtsPage() {
  const DEBTS = liveDebts();
  const BILLS = liveBills();
  const ENVELOPES = liveEnvelopes();
  const PLAN = livePlan();
  const SNAPSHOT = liveSnapshot();

  // Compute the "Free" amount the same way the dashboard does.
  const breakdown = paycheckBreakdown(
    SNAPSHOT.nextPaycheckCents,
    BILLS,
    PLAN,
    ENVELOPES,
    PERIOD_START,
    PERIOD_END,
  );
  const freeDollars = breakdown.unallocatedCents / 100;

  return (
    <div>
      <PageHead
        eyebrow="// money · debts"
        title="Debts"
        em="one line per debt."
        accent="saturn"
        actions={
          <Link
            href="/debts/new"
            style={{
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
            + Add debt
          </Link>
        }
        explanation={
          <>
            Every debt you carry, with its balance, interest rate, and the path to zero. The vessel for debt payoff is the Saturn envelope — money that lands there goes straight to the highest-priority balance. Pick a strategy: avalanche pays the highest-rate first (saves money), snowball pays the smallest first (builds momentum). Your call.
          </>
        }
      />

      {/* Debt list — live data */}
      <section style={{ marginBottom: 64 }}>
        <SectionHeader
          title="Your debts"
          em="with the path to zero."
          meta={`${DEBTS.length} ${DEBTS.length === 1 ? "debt" : "debts"} tracked`}
          accent="saturn"
        />
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
          {DEBTS.map((d) => {
            const pct =
              d.originalBalanceCents > 0
                ? Math.min(
                    100,
                    ((d.originalBalanceCents - d.balanceCents) /
                      d.originalBalanceCents) *
                      100,
                  )
                : 100;
            const isPaidOff = d.balanceCents === 0;
            return (
              <div
                key={d.id}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--line)",
                  borderLeft: "2px solid var(--saturn)",
                  borderRadius: 4,
                  padding: "20px 24px",
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1.4fr) 100px 90px 240px",
                  gap: 18,
                  alignItems: "center",
                }}
              >
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
                    {d.name}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-jetbrains), monospace",
                      fontSize: 11,
                      color: "var(--ink-3)",
                      marginTop: 2,
                      letterSpacing: "0.04em",
                    }}
                  >
                    {(d.aprBps / 100).toFixed(2)}% APR ·{" "}
                    {isPaidOff ? "[OK] Paid off" : `Due day ${d.dueDay}`}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: "var(--font-jetbrains), monospace",
                      fontSize: 9,
                      fontWeight: 600,
                      color: "var(--ink-3)",
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      marginBottom: 4,
                    }}
                  >
                    <span style={{ color: "var(--ink-4)" }}>//</span> Balance
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-jetbrains), monospace",
                      fontSize: 22,
                      fontWeight: 600,
                      color: isPaidOff ? "var(--ok)" : "var(--ink)",
                      fontFeatureSettings: '"tnum" 1, "zero" 1',
                    }}
                  >
                    {formatMoney(d.balanceCents)}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: "var(--font-jetbrains), monospace",
                      fontSize: 9,
                      fontWeight: 600,
                      color: "var(--ink-3)",
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      marginBottom: 4,
                    }}
                  >
                    <span style={{ color: "var(--ink-4)" }}>//</span> Min pay
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-jetbrains), monospace",
                      fontSize: 18,
                      color: "var(--ink-2)",
                      fontFeatureSettings: '"tnum" 1',
                    }}
                  >
                    {d.minPaymentCents > 0 ? formatMoney(d.minPaymentCents) : "—"}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: "var(--font-jetbrains), monospace",
                      fontSize: 9,
                      fontWeight: 600,
                      color: "var(--ink-3)",
                      letterSpacing: "0.18em",
                      textTransform: "uppercase",
                      marginBottom: 4,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                    }}
                  >
                    <span>// Progress</span>
                    <span
                      style={{
                        fontFamily: "var(--font-jetbrains), monospace",
                        fontSize: 10.5,
                        color: "var(--ok)",
                        textTransform: "none",
                        letterSpacing: "0.01em",
                        fontFeatureSettings: '"tnum" 1',
                      }}
                    >
                      {formatMoney(d.originalBalanceCents - d.balanceCents)} of {formatMoney(d.originalBalanceCents)}
                    </span>
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
                        background: isPaidOff ? "var(--ok)" : "var(--saturn)",
                        boxShadow: isPaidOff
                          ? "0 0 8px var(--ok)"
                          : "0 0 8px var(--saturn)",
                      }}
                    />
                  </div>
                  {/* The payoff sparkline — the trajectory chart sits
                      directly below the progress bar so both visuals
                      are right next to the debt's data. */}
                  <div
                    style={{
                      marginTop: 10,
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--font-jetbrains), monospace",
                        fontSize: 9,
                        fontWeight: 600,
                        color: "var(--ink-3)",
                        letterSpacing: "0.18em",
                        textTransform: "uppercase",
                        flexShrink: 0,
                      }}
                    >
                      // Payoff
                    </span>
                    {isPaidOff ? (
                      <span
                        style={{
                          fontFamily: "var(--font-jetbrains), monospace",
                          fontSize: 11,
                          color: "var(--ok)",
                          letterSpacing: "0.10em",
                          textTransform: "uppercase",
                        }}
                      >
                        [OK] Paid off
                      </span>
                    ) : (
                      <>
                        <DebtSparkline
                          planet="saturn"
                          balanceCents={d.balanceCents}
                          originalBalanceCents={d.originalBalanceCents}
                          aprBps={d.aprBps}
                          minPaymentCents={d.minPaymentCents}
                          anchor={TODAY}
                          width={120}
                          height={26}
                        />
                        <span
                          style={{
                            fontFamily: "var(--font-jetbrains), monospace",
                            fontSize: 9.5,
                            color: "var(--ink-3)",
                            marginLeft: "auto",
                            fontFeatureSettings: '"tnum" 1',
                            whiteSpace: "nowrap",
                          }}
                        >
                          {(() => {
                            const r = d.aprBps / 120000;
                            if (r === 0) {
                              if (d.minPaymentCents <= 0) return "No min";
                              const mo = Math.ceil(d.balanceCents / d.minPaymentCents);
                              return `~${mo}mo at min`;
                            }
                            const monthlyInterest = d.balanceCents * r;
                            if (d.minPaymentCents <= monthlyInterest) return "[WARN] Min < interest";
                            const N =
                              -Math.log(1 - monthlyInterest / d.minPaymentCents) / Math.log(1 + r);
                            return `~${Math.ceil(N)}mo at min`;
                          })()}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* The payoff simulator — the visible-UI hero of /debts */}
      <DebtPayoffSimulator
        debts={DEBTS}
        availableDollars={freeDollars}
        anchor={TODAY}
      />
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
  accent?: "cyan" | "saturn" | "neg" | "jupiter";
}) {
  const accentColor =
    accent === "saturn"
      ? "var(--saturn)"
      : accent === "neg"
      ? "var(--neg)"
      : accent === "jupiter"
      ? "var(--jupiter)"
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
