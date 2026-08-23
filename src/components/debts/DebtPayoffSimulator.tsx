"use client";

/**
 * DebtPayoffSimulator — the 3-up payoff card + "What if?" slider
 * + "Apply extra" action (Cluster 1.9).
 *
 * The user said:
 *   "If there is $175 left after bills and spending money, the app
 *    could say: You have $175 available. Add it to Credit Card #1?
 *    Then show: Current payoff: March 2027 / With extra $175: Dec 2026
 *    / You save: 3 months + $X interest."
 *
 * The simulator does exactly that. The "available" amount is fed
 * in from the dashboard's Plan My Next Check card (`unallocatedCents`).
 * The "What if?" slider lets her explore a different extra value
 * without committing. The "Apply extra" button writes through to
 * the live store via the `applyExtraToDebt` server action, which
 * reduces the balance, writes an audit entry, and revalidates the
 * page so the saved months + interest are recomputed.
 *
 * Method toggle: Snowball (smallest balance first) or Avalanche
 * (highest APR first). The choice is per-session; we don't persist.
 */

import * as React from "react";
import { useState, useTransition } from "react";
import { formatMoney } from "@/lib/money";
import {
  payoffProjection,
  type Debt,
  type PayoffMethod,
  type PayoffProjection,
} from "@/lib/store";
import { applyExtraToDebt } from "@/app/actions/debts";

export interface DebtPayoffSimulatorProps {
  debts: Debt[];
  /** The Plan My Next Check "Free" amount, in dollars (UI unit). */
  availableDollars: number;
  /** Anchor date for the projection. */
  anchor?: Date;
  /** Paychecks per month (default 2 — biweekly). */
  paychecksPerMonth?: number;
}

export function DebtPayoffSimulator({
  debts,
  availableDollars,
  anchor,
  paychecksPerMonth = 2,
}: DebtPayoffSimulatorProps) {
  const [method, setMethod] = useState<PayoffMethod>("snowball");
  // The slider's "extra per paycheck" in dollars. Default to the
  // available amount; user can drag to explore.
  const [extraDollars, setExtraDollars] = useState<number>(
    Math.max(0, Math.round(availableDollars)),
  );
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [paidOff, setPaidOff] = useState<{ debtName: string; at: Date } | null>(
    null,
  );

  // Live projection (recomputed on every change).
  const projection = React.useMemo(
    () =>
      payoffProjection(
        debts,
        method,
        Math.max(0, Math.round(extraDollars * 100)),
        anchor ?? new Date(),
        paychecksPerMonth,
      ),
    [debts, method, extraDollars, anchor, paychecksPerMonth],
  );

  // The "current" (no-extra) projection for comparison.
  const baseline = React.useMemo(
    () => payoffProjection(debts, method, 0, anchor ?? new Date(), paychecksPerMonth),
    [debts, method, anchor, paychecksPerMonth],
  );

  const savedMonths = baseline.totalMonths - projection.totalMonths;
  const savedInterest = baseline.totalInterestCents - projection.totalInterestCents;
  const headDebt = projection.perDebt.find((p) => p.monthsToPayoff > 0);

  const onApply = () => {
    if (!headDebt) return;
    setError(null);
    setPaidOff(null);
    const fd = new FormData();
    fd.set("debtId", headDebt.debtId);
    fd.set("amount", String(extraDollars));
    fd.set("source", "plan-my-next-check");
    startTransition(async () => {
      const result = await applyExtraToDebt(null, fd);
      if (!result.ok) {
        setError(result.reason ?? "Could not apply payment.");
        return;
      }
      if (result.debt && result.debt.balanceCents === 0) {
        setPaidOff({ debtName: result.debt.name, at: new Date() });
      }
    });
  };

  return (
    <section
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderLeft: "3px solid var(--saturn)",
        borderRadius: 4,
        padding: "32px 36px",
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
            color: "var(--saturn)",
            letterSpacing: "0.28em",
            textTransform: "uppercase",
          }}
        >
          <span style={{ fontSize: 18, lineHeight: 1 }}>♄</span>
          Debt payoff simulator
        </div>
        <span
          style={{
            fontFamily: "var(--font-sora)",
            fontSize: 13,
                        color: "var(--ink-3)",
          }}
        >
          Free {formatMoney(Math.round(availableDollars * 100))} this period — see what it does.
        </span>
      </div>

      {/* Method toggle */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 24,
        }}
      >
        <MethodPill
          active={method === "snowball"}
          onClick={() => setMethod("snowball")}
          label="Snowball"
          sub="smallest first"
        />
        <MethodPill
          active={method === "avalanche"}
          onClick={() => setMethod("avalanche")}
          label="Avalanche"
          sub="highest APR first"
        />
      </div>

      {/* What if? slider */}
      <div
        style={{
          background: "var(--cosmos)",
          border: "1px solid var(--line-soft)",
          borderRadius: 4,
          padding: "18px 22px",
          marginBottom: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 12,
          }}
        >
          <label
            htmlFor="debt-extra"
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 9.5,
              color: "var(--ink-3)",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
            }}
          >
            What if I add
          </label>
          <div
            style={{
              fontFamily: "var(--font-sora)",
              fontSize: 26,
              color: "var(--gold-glow)",
              lineHeight: 1,
            }}
          >
            {formatMoney(Math.round(extraDollars * 100))}
            <span
              style={{
                fontFamily: "var(--font-sora)",
                                fontSize: 13,
                color: "var(--ink-3)",
                marginLeft: 8,
              }}
            >
              per paycheck
            </span>
          </div>
        </div>
        <input
          id="debt-extra"
          type="range"
          min={0}
          max={500}
          step={5}
          value={extraDollars}
          onChange={(e) => setExtraDollars(Number(e.target.value))}
          style={{
            width: "100%",
            accentColor: "var(--gold)",
          }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 10,
            color: "var(--ink-4)",
            marginTop: 6,
          }}
        >
          <span>$0</span>
          <span>$500</span>
        </div>
      </div>

      {/* 3-up payoff card */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 16,
          marginBottom: 24,
        }}
      >
        <ProjectionCard
          label="Current"
          em="without the extra"
          months={baseline.totalMonths}
          interestCents={baseline.totalInterestCents}
          accent="ink-2"
        />
        <ProjectionCard
          label={`With extra ${formatMoney(Math.round(extraDollars * 100))}`}
          em="per paycheck"
          months={projection.totalMonths}
          interestCents={projection.totalInterestCents}
          accent="saturn"
        />
        <ProjectionCard
          label="You save"
          em="from the extra"
          months={savedMonths}
          interestCents={savedInterest}
          accent={savedInterest > 0 ? "ok" : "ink-3"}
          highlight
        />
      </div>

      {/* Headline answer + apply button */}
      {headDebt && extraDollars > 0 && (
        <div
          style={{
            background: "var(--cosmos)",
            border: "1px solid var(--gold-soft)",
            borderRadius: 4,
            padding: "20px 24px",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            gap: 24,
          }}
        >
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontFamily: "var(--font-sora)",
                fontSize: 16,
                color: "var(--ink)",
                lineHeight: 1.5,
              }}
            >
              Add <b style={{ color: "var(--gold-glow)" }}>{formatMoney(Math.round(extraDollars * 100))}</b> per
              paycheck to <b style={{ color: "var(--ink)" }}>{headDebt.debtName}</b> — it pays off in{" "}
              <b style={{ color: "var(--saturn)" }}>
                {headDebt.monthsToPayoff}mo
              </b>
              .
              {savedMonths > 0 && (
                <>
                  {" "}You save{" "}
                  <b style={{ color: "var(--ok)" }}>
                    {savedMonths}mo + {formatMoney(Math.max(0, savedInterest))}
                  </b>
                  .
                </>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onApply}
            disabled={isPending || extraDollars <= 0}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontFamily: "var(--font-jetbrains), monospace",
              background: isPending ? "var(--ink-3)" : "var(--saturn)",
              color: "var(--ink)",
              border: 0,
              borderRadius: 2,
              padding: "12px 22px",
              fontSize: 11,
              fontWeight: 600,
              cursor: isPending ? "wait" : "pointer",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              boxShadow: isPending
                ? "none"
                : "0 0 16px rgba(168, 176, 200, 0.35)",
              whiteSpace: "nowrap",
            }}
          >
            {isPending ? "Applying…" : "Apply extra →"}
          </button>
        </div>
      )}

      {error && (
        <p
          style={{
            fontFamily: "var(--font-sora)",
                        fontSize: 14,
            color: "var(--neg)",
            marginTop: 4,
          }}
        >
          {error}
        </p>
      )}

      {paidOff && (
        <PaidOffCelebration
          debtName={paidOff.debtName}
          at={paidOff.at}
          onClose={() => setPaidOff(null)}
        />
      )}

      {projection.hasUnpayableDebt && (
        <div
          style={{
            background:
              "linear-gradient(90deg, rgba(196, 90, 58, 0.18) 0%, transparent 100%)",
            border: "1px solid var(--neg)",
            borderRadius: 2,
            padding: "12px 16px",
            marginTop: 16,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span style={{ color: "var(--neg)", fontSize: 18 }}>!</span>
          <span
            style={{
              fontFamily: "var(--font-sora)",
              fontSize: 14,
              color: "var(--ink)",
            }}
          >
            One or more debts won&apos;t pay off at the current payment level. Increase the extra to clear them.
          </span>
        </div>
      )}
    </section>
  );
}

function MethodPill({
  active,
  onClick,
  label,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  sub: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        background: active ? "var(--cosmos)" : "transparent",
        border: `1px solid ${active ? "var(--saturn)" : "var(--line)"}`,
        borderRadius: 2,
        padding: "10px 16px",
        cursor: "pointer",
        textAlign: "left",
        boxShadow: active ? "0 0 12px rgba(168, 176, 200, 0.18)" : "none",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 11,
          fontWeight: 600,
          color: active ? "var(--saturn)" : "var(--ink-2)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-sora)",
                    fontSize: 12,
          color: "var(--ink-3)",
          marginTop: 2,
        }}
      >
        {sub}
      </div>
    </button>
  );
}

function ProjectionCard({
  label,
  em,
  months,
  interestCents,
  accent,
  highlight,
}: {
  label: string;
  em: string;
  months: number;
  interestCents: number;
  accent: "saturn" | "ok" | "ink-2" | "ink-3";
  highlight?: boolean;
}) {
  const accentColor =
    accent === "saturn"
      ? "var(--saturn)"
      : accent === "ok"
      ? "var(--ok)"
      : accent === "ink-3"
      ? "var(--ink-3)"
      : "var(--ink-2)";

  return (
    <div
      style={{
        background: highlight
          ? "radial-gradient(ellipse at 50% 0%, rgba(106, 176, 136, 0.10) 0%, transparent 60%), var(--cosmos)"
          : "var(--cosmos)",
        border: `1px solid ${highlight ? "var(--ok)" : "var(--line)"}`,
        borderRadius: 4,
        padding: "18px 22px",
        boxShadow: highlight ? "0 0 16px rgba(106, 176, 136, 0.18)" : "none",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 9.5,
          color: highlight ? "var(--ok)" : "var(--ink-3)",
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-sora)",
                    fontSize: 12,
          color: "var(--ink-3)",
          marginBottom: 12,
        }}
      >
        {em}
      </div>
      <div
        style={{
          fontFamily: "var(--font-sora)",
          fontSize: 32,
          color: accentColor,
          lineHeight: 1,
          fontFeatureSettings: '"tnum" 1',
          marginBottom: 6,
        }}
      >
        {months === 0
          ? "Paid off"
          : months > 999
          ? "Never"
          : `${months}mo`}
      </div>
      <div
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 12,
          color: "var(--ink-2)",
          fontFeatureSettings: '"tnum" 1',
        }}
      >
        {months > 999 ? "—" : formatMoney(Math.max(0, interestCents))} interest
      </div>
    </div>
  );
}

/**
 * PaidOffCelebration — the celestial overlay fired when a debt
 * is zeroed. A compass rose expands from the center with a
 * "PAID OFF" headline + the debt name. Uses CSS animation only;
 * no external library.
 */
function PaidOffCelebration({
  debtName,
  at,
  onClose,
}: {
  debtName: string;
  at: Date;
  onClose: () => void;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(6, 8, 15, 0.85)",
        display: "grid",
        placeItems: "center",
        zIndex: 100,
        animation: "celestialFadeIn 400ms ease-out",
        cursor: "pointer",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          textAlign: "center",
          padding: 48,
          animation: "celestialScale 600ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <div
          aria-hidden
          style={{
            fontSize: 96,
            color: "var(--gold-glow)",
            marginBottom: 16,
            filter: "drop-shadow(0 0 32px var(--gold))",
          }}
        >
          ☉
        </div>
        <div
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 14,
            color: "var(--gold)",
            letterSpacing: "0.4em",
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          Paid off
        </div>
        <h2
          style={{
            fontFamily: "var(--font-sora)",
            fontSize: 56,
            color: "var(--ink)",
            margin: 0,
            lineHeight: 1.1,
            marginBottom: 12,
          }}
        >
          {debtName}
        </h2>
        <p
          style={{
            fontFamily: "var(--font-sora)",
                        fontSize: 18,
            color: "var(--ink-2)",
            margin: "0 0 24px",
          }}
        >
          The weight of past spending, gone. {at.toLocaleDateString()}.
        </p>
        <button
          type="button"
          onClick={onClose}
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
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            boxShadow: "0 0 18px rgba(212, 175, 82, 0.35)",
          }}
        >
          Continue →
        </button>
        <style>{`
          @keyframes celestialFadeIn { from { opacity: 0 } to { opacity: 1 } }
          @keyframes celestialScale { from { transform: scale(0.7); opacity: 0 } to { transform: scale(1); opacity: 1 } }
        `}</style>
      </div>
    </div>
  );
}
