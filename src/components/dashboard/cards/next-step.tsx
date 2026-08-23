/**
 * NextStepCard — the live attention rail, card-sized.
 *
 * Same logic as the previous dashboard's NextStep section: surfaces
 * the over-limit envelopes with their current/target/overage, or
 * the calm jade summary when nothing is over.
 *
 * Tap-through → /envelopes.
 */

import * as React from "react";
import { formatMoney } from "@/lib/money";

export interface NextStepRow {
  id: string;
  name: string;
  current: number;
  target: number;
}

export interface NextStepCardData {
  overLimit: NextStepRow[];
}

export function NextStepCard({ data }: { data: NextStepCardData }) {
  const { overLimit } = data;
  const calm = overLimit.length === 0;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 20,
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          display: "grid",
          placeItems: "center",
          fontSize: 22,
          background: calm ? "rgba(106, 176, 136, 0.12)" : "rgba(196, 90, 58, 0.14)",
          color: calm ? "var(--ok)" : "var(--neg)",
          border: `1px solid ${calm ? "var(--ok)" : "var(--neg)"}`,
          flexShrink: 0,
          lineHeight: 1,
        }}
      >
        {calm ? "✓" : "!"}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {calm ? (
          <>
            <div
              style={{
                fontFamily: "var(--font-italiana), var(--font-cinzel), serif",
                fontSize: 18,
                color: "var(--ink)",
                marginBottom: 2,
              }}
            >
              All envelopes are within target.
            </div>
            <div
              style={{
                fontFamily: "var(--font-cormorant), serif",
                fontSize: 14,
                color: "var(--ink-2)",
              }}
            >
              Nice pace. Keep going, and the next paycheck will top up the ones that need it.
            </div>
          </>
        ) : (
          <>
            <div
              style={{
                fontFamily: "var(--font-italiana), var(--font-cinzel), serif",
                fontSize: 18,
                color: "var(--ink)",
                marginBottom: 4,
                lineHeight: 1.25,
              }}
            >
              {overLimit.length === 1
                ? "One envelope is over limit."
                : `${overLimit.length} envelopes are over limit.`}
            </div>
            <div
              style={{
                fontFamily: "var(--font-cormorant), serif",
                fontSize: 14,
                color: "var(--ink)",
                lineHeight: 1.5,
              }}
            >
              {overLimit.map((e, i) => {
                const overage = e.current - e.target;
                const sep =
                  i === 0
                    ? ""
                    : i === overLimit.length - 1
                    ? " and "
                    : ", ";
                return (
                  <span key={e.id}>
                    {sep}
                    <b style={{ color: "var(--neg)", fontWeight: 600 }}>{e.name}</b>{" "}
                    <span
                      style={{
                        fontFamily: "var(--font-jetbrains), monospace",
                        fontSize: 13,
                        color: "var(--ink)",
                      }}
                    >
                      {formatMoney(e.current)}
                    </span>{" "}
                    of {formatMoney(e.target)}
                    <span
                      style={{
                        fontStyle: "italic",
                        color: "var(--ink-3)",
                      }}
                    >
                      {" "}
                      (+{formatMoney(overage)})
                    </span>
                  </span>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
