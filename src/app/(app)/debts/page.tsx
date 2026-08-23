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
import { billsDueInPeriod, paycheckBreakdown } from "@/lib/store";
import { DebtPayoffSimulator } from "@/components/debts/DebtPayoffSimulator";
import { DebtSparkline } from "@/components/viz/DebtSparkline";
import { liveBills, liveSnapshot } from "@/lib/mock";

export const dynamic = "force-dynamic";

/**
 * Debts — articulated deep page (Cluster 1.9).
 *
 * Live data: each debt is in the in-memory store. The page reads
 * the current set on every render and shows:
 *
 *  1. The list (live) — name, APR, balance, paid %, min payment
 *  2. The DebtPayoffSimulator — the 3-up "current / with-extra / saved"
 *     card + the "What if?" slider + the "Apply extra" action. The
 *     "available" amount is fed from the dashboard's Plan My Next
 *     Check "Free" value (the unallocatedCents from paycheckBreakdown).
 *
 * The apply action calls the `applyExtraToDebt` server action, which
 * reduces the debt's balance, writes an audit entry, and revalidates
 * the page. When a debt hits $0, the celebration overlay fires.
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
        eyebrow="Money · Debts"
        title="Debts"
        em="one line per debt."
        accent="saturn"
        actions={
          <Link
            href="/debts/new"
            style={{
              fontFamily: "var(--font-cinzel), serif",
              background: "var(--gold)",
              color: "var(--void)",
              border: 0,
              borderRadius: 2,
              padding: "12px 22px",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              textDecoration: "none",
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
                      fontFamily: "var(--font-italiana), var(--font-cinzel), serif",
                      fontSize: 22,
                      color: "var(--ink)",
                    }}
                  >
                    {d.name}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-cormorant), serif",
                      fontStyle: "italic",
                      fontSize: 13,
                      color: "var(--ink-3)",
                      marginTop: 2,
                    }}
                  >
                    {(d.aprBps / 100).toFixed(2)}% APR ·{" "}
                    {isPaidOff ? "Paid off" : `Due day ${d.dueDay}`}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: "var(--font-cinzel), serif",
                      fontSize: 9,
                      color: "var(--ink-3)",
                      letterSpacing: "0.22em",
                      textTransform: "uppercase",
                      marginBottom: 4,
                    }}
                  >
                    Balance
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-italiana), var(--font-cinzel), serif",
                      fontSize: 22,
                      color: isPaidOff ? "var(--ok)" : "var(--ink)",
                    }}
                  >
                    {formatMoney(d.balanceCents)}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: "var(--font-cinzel), serif",
                      fontSize: 9,
                      color: "var(--ink-3)",
                      letterSpacing: "0.22em",
                      textTransform: "uppercase",
                      marginBottom: 4,
                    }}
                  >
                    Min payment
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-italiana), var(--font-cinzel), serif",
                      fontSize: 18,
                      color: "var(--ink-2)",
                    }}
                  >
                    {d.minPaymentCents > 0 ? formatMoney(d.minPaymentCents) : "—"}
                  </div>
                </div>
                <div>
                  {/* The progress bar — paid vs original (the data the
                      bar visualizes) */}
                  <div
                    style={{
                      fontFamily: "var(--font-cinzel), serif",
                      fontSize: 9,
                      color: "var(--ink-3)",
                      letterSpacing: "0.22em",
                      textTransform: "uppercase",
                      marginBottom: 4,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                    }}
                  >
                    <span>Progress</span>
                    <span
                      style={{
                        fontFamily: "var(--font-jetbrains), monospace",
                        fontSize: 10.5,
                        color: "var(--ok)",
                        textTransform: "none",
                        letterSpacing: "0.01em",
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
                        fontFamily: "var(--font-cinzel), serif",
                        fontSize: 9,
                        color: "var(--ink-3)",
                        letterSpacing: "0.22em",
                        textTransform: "uppercase",
                        flexShrink: 0,
                      }}
                    >
                      Payoff
                    </span>
                    {isPaidOff ? (
                      <span
                        style={{
                          fontFamily: "var(--font-cormorant), serif",
                          fontStyle: "italic",
                          fontSize: 13,
                          color: "var(--ok)",
                        }}
                      >
                        Paid off ✦
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
                            // Closed-form: months to payoff at min only
                            const r = d.aprBps / 120000;
                            if (r === 0) {
                              if (d.minPaymentCents <= 0) return "No min";
                              const mo = Math.ceil(d.balanceCents / d.minPaymentCents);
                              return `~${mo}mo at min`;
                            }
                            const monthlyInterest = d.balanceCents * r;
                            if (d.minPaymentCents <= monthlyInterest) return "Min < interest";
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
}: {
  title: string;
  em?: string;
  meta?: string;
}) {
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
      <h2
        style={{
          fontFamily: "var(--font-italiana), var(--font-cinzel), serif",
          fontWeight: 400,
          fontSize: 30,
          margin: 0,
          color: "var(--ink)",
        }}
      >
        {title}
        {em && (
          <em
            style={{
              fontFamily: "var(--font-cormorant), serif",
              fontStyle: "italic",
              color: "var(--ink-3)",
              fontWeight: 500,
              marginLeft: 8,
            }}
          >
            {em}
          </em>
        )}
      </h2>
      {meta && (
        <div
          style={{
            fontFamily: "var(--font-cinzel), serif",
            fontSize: 10,
            color: "var(--ink-3)",
            letterSpacing: "0.22em",
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
          background: "var(--saturn)",
          boxShadow: "0 0 8px var(--saturn)",
        }}
      />
    </div>
  );
}
