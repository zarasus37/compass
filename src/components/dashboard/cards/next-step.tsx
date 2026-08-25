/**
 * NextStepCard — the live attention rail, card-sized.
 *
 * Same logic as the previous dashboard's NextStep section: surfaces
 * the over-limit envelopes with their current/target/overage, or
 * the [OK] ALL CALM summary when nothing is over.
 *
 * Component Oracle Terminal treatment: status marker in mono caps
 * with [WARN] / [OK], names in Sora (gold for over, ink for calm),
 * amounts in JetBrains Mono. The overage parenthetical is mono.
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
        aria-hidden
        style={{
          width: 48,
          height: 48,
          borderRadius: 2,
          display: "grid",
          placeItems: "center",
          fontSize: 12,
          fontFamily: "var(--font-jetbrains), monospace",
          fontWeight: 700,
          letterSpacing: "0.04em",
          background: calm ? "rgba(74, 222, 128, 0.10)" : "rgba(239, 68, 68, 0.12)",
          color: calm ? "var(--ok)" : "var(--vessel-over)",
          border: `1px solid ${calm ? "var(--ok)" : "var(--vessel-over)"}`,
          flexShrink: 0,
          lineHeight: 1,
        }}
      >
        {calm ? "[OK]" : "[WARN]"}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        {calm ? (
          <>
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
              Nice pace — the next paycheck will top up the ones that need it.
            </div>
          </>
        ) : (
          <>
            <div
              style={{
                fontFamily: "var(--font-sora)",
                fontSize: 15,
                fontWeight: 600,
                color: "var(--ink)",
                marginBottom: 4,
                lineHeight: 1.3,
              }}
            >
              {overLimit.length === 1
                ? "One envelope is over limit."
                : `${overLimit.length} envelopes are over limit.`}
            </div>
            <div
              style={{
                fontFamily: "var(--font-sora)",
                fontSize: 13.5,
                color: "var(--ink-2)",
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
                    <b
                      style={{
                        color: "var(--vessel-over)",
                        fontWeight: 600,
                        fontFamily: "var(--font-sora)",
                      }}
                    >
                      {e.name}
                    </b>{" "}
                    <span
                      style={{
                        fontFamily: "var(--font-jetbrains), monospace",
                        fontSize: 12,
                        color: "var(--ink)",
                        fontFeatureSettings: '"tnum" 1, "zero" 1',
                      }}
                    >
                      {formatMoney(e.current)}
                    </span>{" "}
                    of {formatMoney(e.target)}
                    <span
                      style={{
                        fontFamily: "var(--font-jetbrains), monospace",
                        color: "var(--ink-3)",
                        marginLeft: 4,
                      }}
                    >
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
