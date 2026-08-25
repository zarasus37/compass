/**
 * PayDistributionCard — Cash Flow Funnel (Sankey at card size).
 *
 * The same data the /allocation Sankey visualizes, in a compact
 * horizontal ribbon. The paycheck arrives on the left, fans out into
 * the seven vessels as a stacked bar, and each segment is labeled
 * with its planet glyph + share. The full interactive Sankey lives
 * on /allocation; this card gives the user the headline number at
 * a glance from the dashboard.
 *
 * Per the must-have visualizations list:
 *   "Flow bands that show total income splitting into various expense
 *    destinations. Visualizes the efficiency of automatic allocations
 *    immediately."
 *
 * Component Oracle Terminal treatment: gold source node, planetary
 * destinations, mono captions.
 */

import * as React from "react";
import { PLANET_COLORS, type PlanetId } from "@/components/alchemy/VesselGlyph";
import { formatMoney, formatMoneyCompact } from "@/lib/money";

export interface PayDistributionCardData {
  /** The paycheck amount, in cents. */
  paycheckCents: number;
  /** Per-vessel allocation, in cents. */
  allocations: { envelopeId: string; name: string; planet: PlanetId | null; cents: number }[];
}

export function PayDistributionCard({ data }: { data: PayDistributionCardData }) {
  const total = data.paycheckCents;
  const allocs = data.allocations.filter((a) => a.cents > 0).sort((a, b) => b.cents - a.cents);
  const totalAllocated = allocs.reduce((s, a) => s + a.cents, 0);
  const free = Math.max(0, total - totalAllocated);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {/* FROM → TO header */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr auto",
          alignItems: "center",
          gap: 14,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 9,
              color: "var(--ink-3)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              marginBottom: 2,
            }}
          >
            // from
          </div>
          <div
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 12.5,
              color: "var(--gold)",
              fontFeatureSettings: '"tnum" 1, "zero" 1',
              fontWeight: 600,
            }}
          >
            ☉ {formatMoneyCompact(total)}
          </div>
        </div>
        <div
          style={{
            height: 1,
            background: "var(--vessel-border)",
            position: "relative",
          }}
        >
          <span
            style={{
              position: "absolute",
              top: -3,
              left: "50%",
              transform: "translateX(-50%)",
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 9,
              color: "var(--ink-3)",
              letterSpacing: "0.18em",
              background: "var(--vessel-surface)",
              padding: "0 6px",
            }}
          >
            // FAN-OUT
          </span>
        </div>
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 9,
              color: "var(--ink-3)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              marginBottom: 2,
            }}
          >
            // to
          </div>
          <div
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 12.5,
              color: "var(--vessel-accent)",
              fontFeatureSettings: '"tnum" 1, "zero" 1',
              fontWeight: 600,
            }}
          >
            {allocs.length} VESSELS
          </div>
        </div>
      </div>

      {/* Stacked ribbon */}
      <div
        style={{
          display: "flex",
          height: 22,
          borderRadius: 2,
          overflow: "hidden",
          background: "var(--vessel-dark)",
          border: "1px solid var(--vessel-border)",
        }}
      >
        {allocs.map((a) => {
          const w = total > 0 ? (a.cents / total) * 100 : 0;
          return (
            <div
              key={a.envelopeId}
              title={`${a.name}: ${formatMoney(a.cents)} (${w.toFixed(0)}%)`}
              style={{
                width: `${w}%`,
                background: a.planet ? PLANET_COLORS[a.planet] : "var(--ink-3)",
                opacity: 0.92,
                position: "relative",
                minWidth: w > 0 ? 2 : 0,
              }}
            />
          );
        })}
        {free > 0 && total > 0 && (
          <div
            title={`Free: ${formatMoney(free)} (${((free / total) * 100).toFixed(0)}%)`}
            style={{
              width: `${(free / total) * 100}%`,
              background: "var(--vessel-surface)",
              borderLeft: "1px dashed var(--ink-5)",
            }}
          />
        )}
      </div>

      {/* Per-vessel rows */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 14px" }}>
        {allocs.slice(0, 6).map((a) => {
          const pct = total > 0 ? (a.cents / total) * 100 : 0;
          return (
            <div
              key={a.envelopeId}
              style={{
                display: "grid",
                gridTemplateColumns: "8px 1fr auto",
                alignItems: "center",
                gap: 6,
                fontSize: 10.5,
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 1,
                  background: a.planet ? PLANET_COLORS[a.planet] : "var(--ink-3)",
                }}
              />
              <span
                style={{
                  fontFamily: "var(--font-sora)",
                  color: "var(--ink-2)",
                  fontSize: 11,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {a.name}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-jetbrains), monospace",
                  fontSize: 10,
                  color: "var(--ink)",
                  fontFeatureSettings: '"tnum" 1, "zero" 1',
                  fontWeight: 600,
                }}
              >
                {pct.toFixed(0)}%
              </span>
            </div>
          );
        })}
        {allocs.length > 6 && (
          <div
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 10,
              color: "var(--ink-4)",
              letterSpacing: "0.04em",
            }}
          >
            +{allocs.length - 6} more
          </div>
        )}
        {free > 0 && (
          <div
            style={{
              gridColumn: "1 / -1",
              display: "grid",
              gridTemplateColumns: "8px 1fr auto",
              alignItems: "center",
              gap: 6,
              fontSize: 10.5,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: 1,
                background: "var(--vessel-surface)",
                border: "1px dashed var(--ink-5)",
              }}
            />
            <span
              style={{
                fontFamily: "var(--font-sora)",
                color: "var(--ink-3)",
                fontSize: 11,
              }}
            >
              Free / unallocated
            </span>
            <span
              style={{
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 10,
                color: "var(--ink-3)",
                fontFeatureSettings: '"tnum" 1, "zero" 1',
              }}
            >
              {((free / total) * 100).toFixed(0)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
