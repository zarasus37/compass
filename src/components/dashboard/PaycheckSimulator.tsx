"use client";

/**
 * PaycheckSimulator — the live demo of the auto-allocate engine.
 *
 * This is the visible centerpiece of Cluster 1's interactivity pass.
 * A button on the dashboard. Click it. The server action runs the
 * allocation engine. The envelope balances update. The bar chart
 * re-renders. A celebration banner shows what happened.
 *
 * Per 00-DESIGN.md D12: the plan is armed, no confirm, no modal — the
 * system runs the plan on every paycheck, and the user sees the
 * summary afterward.
 *
 * In Cluster 2 this exact same surface will be triggered by a real
 * bank webhook (Plaid). The action contract is identical; only the
 * trigger source changes.
 */

import * as React from "react";
import { useActionState, useEffect, useRef } from "react";
import { simulatePaycheck, type SimulatePaycheckResult } from "@/app/actions/paycheck";
import { VesselGlyph, type PlanetId } from "@/components/alchemy/VesselGlyph";
import { SankeyFlow, type SankeyLink, type SankeyNode } from "@/components/viz/SankeyFlow";
import { formatMoney } from "@/lib/money";

const INITIAL: SimulatePaycheckResult = { ok: true, planArmed: true };

export function PaycheckSimulator() {
  const [state, formAction, isPending] = useActionState(simulatePaycheck, INITIAL);
  const formRef = useRef<HTMLFormElement>(null);
  const bannerRef = useRef<HTMLDivElement>(null);

  // When a new run lands, scroll the celebration banner into view
  useEffect(() => {
    if (state.run && bannerRef.current) {
      bannerRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [state.run?.paycheckTransactionId, state.run]);

  return (
    <section
      style={{
        background:
          "radial-gradient(ellipse at 100% 0%, rgba(212, 175, 82, 0.10) 0%, transparent 55%), radial-gradient(ellipse at 0% 100%, rgba(196, 90, 58, 0.05) 0%, transparent 50%), var(--surface)",
        border: "1px solid var(--gold-soft)",
        borderRadius: 4,
        padding: "36px 44px 32px",
        marginBottom: 56,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Gold leaf corner mark */}
      <span
        aria-hidden
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: 80,
          height: 80,
          background:
            "radial-gradient(circle at 100% 0%, rgba(212, 175, 82, 0.2) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          marginBottom: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontFamily: "var(--font-cinzel), serif",
            fontSize: 10.5,
            fontWeight: 600,
            color: "var(--gold)",
            letterSpacing: "0.28em",
            textTransform: "uppercase",
          }}
        >
          <span style={{ fontSize: 18, lineHeight: 1 }}>⚹</span>
          See the plan in action
        </div>
        <span
          style={{
            fontFamily: "var(--font-cormorant), serif",
            fontSize: 13,
            fontStyle: "italic",
            color: "var(--ink-3)",
          }}
        >
          Arm a plan. Money arrives. The system runs it.
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 40, alignItems: "center" }}>
        <div>
          <h2
            style={{
              fontFamily: "var(--font-italiana), var(--font-cinzel), serif",
              fontWeight: 400,
              fontSize: 38,
              lineHeight: 1.05,
              letterSpacing: "0.005em",
              margin: "0 0 12px",
              color: "var(--ink)",
            }}
          >
            Run the next paycheck.
          </h2>
          <p
            style={{
              fontFamily: "var(--font-cormorant), serif",
              fontSize: 17,
              lineHeight: 1.5,
              color: "var(--ink-2)",
              margin: "0 0 24px",
              maxWidth: 540,
            }}
          >
            The plan is armed. Compass will distribute every dollar across the seven envelopes the moment a paycheck lands. No confirm. No friction. Just the system doing its job.
          </p>
          <form
            ref={formRef}
            action={formAction}
            style={{ display: "flex", alignItems: "flex-end", gap: 16, flexWrap: "wrap" }}
          >
            <label
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                flex: "1 1 220px",
                minWidth: 200,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-cinzel), serif",
                  fontSize: 9.5,
                  color: "var(--ink-3)",
                  letterSpacing: "0.22em",
                  textTransform: "uppercase",
                }}
              >
                Paycheck amount
              </span>
              <div style={{ position: "relative" }}>
                <span
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: 14,
                    transform: "translateY(-50%)",
                    fontFamily: "var(--font-italiana), serif",
                    fontSize: 22,
                    color: "var(--ink-3)",
                  }}
                >
                  $
                </span>
                <input
                  name="amount"
                  type="number"
                  min={0}
                  step="1"
                  defaultValue="1820"
                  inputMode="decimal"
                  style={{
                    width: "100%",
                    background: "var(--cosmos)",
                    border: "1px solid var(--line)",
                    borderRadius: 2,
                    padding: "12px 14px 12px 30px",
                    color: "var(--ink)",
                    fontFamily: "var(--font-italiana), var(--font-cinzel), serif",
                    fontSize: 22,
                    fontWeight: 500,
                    outline: "none",
                  }}
                />
              </div>
            </label>
            <input type="hidden" name="source" value="ADP paycheck (simulated)" />
            <button
              type="submit"
              disabled={isPending}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                fontFamily: "var(--font-cinzel), serif",
                background: isPending ? "var(--ink-3)" : "var(--gold)",
                color: "var(--void)",
                border: 0,
                borderRadius: 2,
                padding: "14px 26px",
                fontSize: 11.5,
                fontWeight: 600,
                cursor: isPending ? "wait" : "pointer",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                boxShadow: isPending
                  ? "none"
                  : "0 0 18px rgba(212, 175, 82, 0.35)",
                height: 50,
                flexShrink: 0,
                whiteSpace: "nowrap",
              }}
            >
              {isPending ? "Allocating..." : "Run paycheck →"}
            </button>
          </form>
          {state.ok === false && (
            <p
              style={{
                fontFamily: "var(--font-cormorant), serif",
                fontStyle: "italic",
                fontSize: 14,
                color: "var(--neg)",
                marginTop: 12,
              }}
            >
              {state.reason}
            </p>
          )}
        </div>

        {/* Right side: live plan summary */}
        <div
          style={{
            background: "var(--cosmos)",
            border: "1px solid var(--line)",
            borderRadius: 4,
            padding: "22px 24px 18px",
            position: "relative",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-cinzel), serif",
              fontSize: 9.5,
              color: "var(--ink-3)",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              marginBottom: 14,
            }}
          >
            Current plan
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 10,
              marginBottom: 4,
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-italiana), serif",
                fontSize: 26,
                color: "var(--ink)",
                lineHeight: 1,
              }}
            >
              Envelope
            </span>
            <span
              style={{
                fontFamily: "var(--font-cormorant), serif",
                fontSize: 14,
                fontStyle: "italic",
                color: "var(--ink-3)",
              }}
            >
              proportional split
            </span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontFamily: "var(--font-cinzel), serif",
              fontSize: 10,
              color: "var(--ok)",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              marginBottom: 16,
            }}
          >
            <span style={{ fontSize: 12 }}>●</span>
            Armed · auto-runs on every paycheck
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: 6,
              marginBottom: 12,
            }}
          >
            {PLAN_GLYPHS.map((g) => (
              <div
                key={g.planet}
                style={{
                  textAlign: "center",
                  fontFamily: "var(--font-italiana), serif",
                  fontSize: 22,
                  color: g.color,
                  lineHeight: 1,
                  padding: "8px 0",
                  background: "var(--surface)",
                  border: "1px solid var(--line-soft)",
                  borderRadius: 2,
                }}
                title={g.label}
              >
                {g.glyph}
              </div>
            ))}
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontFamily: "var(--font-cormorant), serif",
              fontSize: 12.5,
              color: "var(--ink-3)",
              fontStyle: "italic",
            }}
          >
            <span>Rent · Utilities · Groceries</span>
            <span>Joy · Savings · Debt · Buffer</span>
          </div>
        </div>
      </div>

      {/* Celebration banner — appears after each successful run */}
      {state.ok && state.run && (
        <div
          ref={bannerRef}
          style={{
            marginTop: 32,
            background:
              "linear-gradient(180deg, rgba(212, 175, 82, 0.05) 0%, transparent 100%)",
            border: "1px solid var(--gold-soft)",
            borderLeft: "3px solid var(--gold)",
            borderRadius: 4,
            padding: "24px 28px 22px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 18,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                fontFamily: "var(--font-cinzel), serif",
                fontSize: 10.5,
                color: "var(--gold)",
                letterSpacing: "0.24em",
                textTransform: "uppercase",
              }}
            >
              <span style={{ fontSize: 16 }}>✓</span>
              Paycheck allocated
            </div>
            <div
              style={{
                fontFamily: "var(--font-italiana), serif",
                fontSize: 18,
                color: "var(--ink)",
              }}
            >
              {formatMoney(state.run.paycheckCents)}{" "}
              <span
                style={{
                  fontFamily: "var(--font-cormorant), serif",
                  fontStyle: "italic",
                  color: "var(--ink-3)",
                  fontSize: 14,
                }}
              >
                into {state.run.transfers.length} envelopes
              </span>
            </div>
          </div>
          {/* Sankey — the Automation Map. Paycheck on the left fans out
              to the 7 vessels on the right. Link widths = share of
              paycheck. Hover any link for the rule behind the flow. */}
          <div style={{ marginBottom: 24 }}>
            <SankeyFlow
              nodes={state.run.transfers.map(
                (t): SankeyNode => ({
                  id: t.envelopeId,
                  label: t.envelopeName,
                }),
              )}
              links={state.run.transfers.map(
                (t): SankeyLink => ({
                  source: t.envelopeId,
                  target: t.envelopeId,
                  value: t.allocatedCents,
                }),
              )}
              totalCents={state.run.paycheckCents}
              sourceLabel={`Paycheck · ${formatMoney(state.run.paycheckCents)}`}
              height={340}
              linkSubtitle={(l) => {
                const t = state.run!.transfers.find(
                  (x) => x.envelopeId === l.target,
                );
                if (!t) return "";
                return `Rule: ${t.mode} · ${t.pctOfPaycheck.toFixed(1)}% of paycheck`;
              }}
            />
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 8,
            }}
          >
            {state.run.transfers.map((t) => (
              <AllocationRow key={t.transferId} transfer={t} total={state.run!.paycheckCents} />
            ))}
          </div>
          {state.run.unallocatedCents > 0 && (
            <p
              style={{
                fontFamily: "var(--font-cormorant), serif",
                fontSize: 13,
                color: "var(--ink-3)",
                fontStyle: "italic",
                marginTop: 14,
                marginBottom: 0,
              }}
            >
              {formatMoney(state.run.unallocatedCents)} left in the buffer — the engine rounds and gives the dust to the safety wall.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function AllocationRow({
  transfer,
  total,
}: {
  transfer: NonNullable<SimulatePaycheckResult["run"]>["transfers"][number];
  total: number;
}) {
  const pctOfTotal = total > 0 ? (transfer.allocatedCents / total) * 100 : 0;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 12px",
        background: "var(--surface)",
        border: "1px solid var(--line-soft)",
        borderRadius: 2,
        fontSize: 13,
      }}
    >
      <span style={{ color: PLANET_COLOR[transfer.planet], fontSize: 16, lineHeight: 1 }}>
        <VesselGlyph planet={transfer.planet as PlanetId} size={16} />
      </span>
      <span
        style={{
          fontFamily: "var(--font-italiana), serif",
          color: "var(--ink)",
          fontSize: 15,
          flex: 1,
        }}
      >
        {transfer.envelopeName}
      </span>
      <span
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          color: "var(--gold)",
          fontSize: 13,
          fontWeight: 500,
        }}
      >
        +{formatMoney(transfer.allocatedCents)}
      </span>
      <span
        style={{
          fontFamily: "var(--font-cormorant), serif",
          fontStyle: "italic",
          color: "var(--ink-3)",
          fontSize: 11.5,
        }}
      >
        {pctOfTotal.toFixed(0)}%
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Static reference for the right-side "current plan" card. Matches the
// 7-rule plan in the store seed (priority 1..7).
// ---------------------------------------------------------------------------

const PLAN_GLYPHS: Array<{ planet: PlanetId; glyph: string; label: string; color: string }> = [
  { planet: "sol",     glyph: "☉", label: "Rent",      color: "var(--sol)" },
  { planet: "mercury", glyph: "☿", label: "Utilities", color: "var(--mercury)" },
  { planet: "luna",    glyph: "☽", label: "Groceries", color: "var(--luna)" },
  { planet: "venus",   glyph: "♀", label: "Joy",       color: "var(--venus)" },
  { planet: "jupiter", glyph: "♃", label: "Savings",   color: "var(--jupiter)" },
  { planet: "saturn",  glyph: "♄", label: "Debt",      color: "var(--saturn)" },
  { planet: "mars",    glyph: "♂", label: "Buffer",    color: "var(--mars)" },
];

const PLANET_COLOR: Record<PlanetId, string> = {
  sol: "var(--sol)",
  luna: "var(--luna)",
  mars: "var(--mars)",
  mercury: "var(--mercury)",
  jupiter: "var(--jupiter)",
  venus: "var(--venus)",
  saturn: "var(--saturn)",
};
