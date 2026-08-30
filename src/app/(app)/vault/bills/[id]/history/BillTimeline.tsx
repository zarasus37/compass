/**
 * BillTimeline — Cluster 7.5.
 *
 * Visual-first (per the xKryptic 2026-08-23 directive) state
 * stepper for the bill's history page. The stepper shows the
 * 5 happy-path states (EARNING → FUNDED → PREPARING →
 * EXECUTING → SETTLED) as connected nodes, with a count of
 * state transitions landing in each. Below, a separate row
 * shows the 4 alternate states (ACTION REQUIRED, PAY MANUALLY,
 * PAUSED, CANCELLED) as branch badges. The current state
 * pulses with a small accent dot.
 *
 * Source: the `stateTransitionsByState` map from
 * `getBillAuditSummary` (counts of `vault.bill_state_changed`
 * rows grouped by `to`).
 *
 * Server component. Pure SVG for the connector lines.
 */
import * as React from "react";
import { tone, userLabel } from "@/lib/vault/state-machine";
import type { BillStatus } from "@/lib/vault/types";

const TONE_TO_COLOR: Record<"ok" | "warn" | "cyan" | "ink", string> = {
  ok: "var(--ok)",
  warn: "var(--vessel-watch)",
  cyan: "var(--vessel-accent)",
  ink: "var(--ink-2)",
};

const HAPPY_PATH: BillStatus[] = [
  "EARNING",
  "FUNDED",
  "PREPARING_SETTLEMENT",
  "EXECUTING",
  "SETTLED",
];

const ALTERNATE_STATES: BillStatus[] = [
  "INSUFFICIENT_FUNDS",
  "MANUAL_ACTION_REQUIRED",
  "PAUSED",
  "CANCELLED",
];

export function BillTimeline({
  currentState,
  stateTransitionsByState,
}: {
  currentState: BillStatus;
  stateTransitionsByState: Record<string, number>;
}) {
  return (
    <div
      data-testid="vault-bill-timeline"
      style={{
        border: "1px solid var(--vessel-border)",
        background: "var(--vessel-surface)",
        padding: "20px 24px",
        marginBottom: 32,
        fontFamily: "var(--font-jetbrains), monospace",
      }}
    >
      <div
        style={{
          fontSize: 9.5,
          color: "var(--ink-3)",
          textTransform: "uppercase",
          letterSpacing: "0.18em",
          marginBottom: 16,
        }}
      >
        // state progression
      </div>
      {/* Happy-path stepper. 5 nodes, each with the count of
          transitions that landed in that state. Connector
          lines are inline SVG so the spacing is exact. */}
      <div
        style={{
          position: "relative",
          display: "grid",
          gridTemplateColumns: `repeat(${HAPPY_PATH.length}, 1fr)`,
          gap: 0,
          marginBottom: 24,
        }}
      >
        {HAPPY_PATH.map((state, i) => {
          const isCurrent = state === currentState;
          const count = stateTransitionsByState[state] ?? 0;
          const color = isCurrent
            ? "var(--vessel-accent)"
            : count > 0
              ? TONE_TO_COLOR[tone(state)]
              : "var(--ink-3)";
          return (
            <div
              key={state}
              data-testid={`vault-bill-timeline-step-${state.toLowerCase()}`}
              style={{
                position: "relative",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                padding: "0 8px",
                textAlign: "center",
              }}
            >
              {/* Connector line to the right (SVG, exact) */}
              {i < HAPPY_PATH.length - 1 ? (
                <svg
                  aria-hidden
                  width="100%"
                  height="2"
                  style={{
                    position: "absolute",
                    top: 13,
                    left: "50%",
                    right: "-50%",
                    zIndex: 0,
                    overflow: "visible",
                  }}
                >
                  <line
                    x1="0"
                    y1="1"
                    x2="100%"
                    y2="1"
                    stroke={count > 0 ? "var(--vessel-accent)" : "var(--vessel-border)"}
                    strokeWidth="1"
                    strokeDasharray={count > 0 ? undefined : "2,3"}
                  />
                </svg>
              ) : null}
              {/* Node circle */}
              <div
                style={{
                  position: "relative",
                  zIndex: 1,
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: count > 0 || isCurrent ? color : "var(--vessel-dark)",
                  border: `2px solid ${color}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 11,
                  fontWeight: 700,
                  color: count > 0 || isCurrent ? "var(--vessel-dark)" : color,
                  boxShadow: isCurrent
                    ? `0 0 0 4px color-mix(in srgb, ${color} 25%, transparent)`
                    : undefined,
                }}
              >
                {isCurrent ? "•" : count > 0 ? "●" : "○"}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "var(--ink-2)",
                  textTransform: "uppercase",
                  letterSpacing: "0.10em",
                  fontWeight: 700,
                }}
              >
                {userLabel(state)}
              </div>
              <div
                style={{
                  fontSize: 9,
                  color: "var(--ink-3)",
                  textTransform: "uppercase",
                  letterSpacing: "0.10em",
                }}
              >
                // {count}× transition{count === 1 ? "" : "s"}
              </div>
            </div>
          );
        })}
      </div>
      {/* Alternate states — a row of branch badges. Each
          shows the count of transitions that landed in that
          alternate. Hidden when the user has never entered
          any alternate (all 0s). */}
      {ALTERNATE_STATES.some((s) => (stateTransitionsByState[s] ?? 0) > 0) ? (
        <div>
          <div
            style={{
              fontSize: 9.5,
              color: "var(--ink-3)",
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              marginBottom: 8,
            }}
          >
            // alternate paths visited
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${ALTERNATE_STATES.length}, 1fr)`,
              gap: 8,
            }}
          >
            {ALTERNATE_STATES.map((state) => {
              const count = stateTransitionsByState[state] ?? 0;
              if (count === 0) {
                return (
                  <div
                    key={state}
                    data-testid={`vault-bill-timeline-alt-${state.toLowerCase()}`}
                    style={{
                      padding: "8px 10px",
                      border: "1px dashed var(--vessel-border)",
                      color: "var(--ink-3)",
                      fontSize: 10,
                      textTransform: "uppercase",
                      letterSpacing: "0.10em",
                      textAlign: "center",
                      borderRadius: 2,
                    }}
                  >
                    {userLabel(state)} // 0×
                  </div>
                );
              }
              const isCurrent = state === currentState;
              const color = TONE_TO_COLOR[tone(state)];
              return (
                <div
                  key={state}
                  data-testid={`vault-bill-timeline-alt-${state.toLowerCase()}`}
                  style={{
                    padding: "8px 10px",
                    border: `1px solid ${color}`,
                    color: color,
                    background: isCurrent
                      ? `color-mix(in srgb, ${color} 12%, var(--vessel-surface))`
                      : "var(--vessel-surface)",
                    fontSize: 10,
                    textTransform: "uppercase",
                    letterSpacing: "0.10em",
                    textAlign: "center",
                    fontWeight: 700,
                    borderRadius: 2,
                  }}
                >
                  {userLabel(state)} // {count}× {isCurrent ? "•" : ""}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
