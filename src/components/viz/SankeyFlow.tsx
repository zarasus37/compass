"use client";

/**
 * SankeyFlow — the Automation Map.
 *
 * A paycheck arrives on the left; on the right, it fans out into the
 * seven envelopes (Sol / Luna / Mars / Mercury / Jupiter / Venus / Saturn)
 * with link widths proportional to each vessel's share. The eye reads
 * the whole allocation in one glance.
 *
 * Per 00-DESIGN.md §0a: cosmic dark canvas, gold leaf for the source,
 * planetary metals for each destination. Click a link to see the rule
 * behind the flow.
 *
 * @nivo/sankey is used for the layout (d3-sankey under the hood); the
 * rest of the chart is themed to the Compass visual system.
 */

import * as React from "react";
import { useMemo } from "react";
import { ResponsiveSankey } from "@nivo/sankey";
import { formatMoney } from "@/lib/money";
import { PLANET_COLORS, type PlanetId } from "@/components/alchemy/VesselGlyph";

export interface SankeyNode {
  id: string;
  /** Optional human-readable label override. */
  label?: string;
  /** Optional node color override (defaults to planetary metal). */
  color?: string;
}

export interface SankeyLink {
  /** Envelope id on the left of the flow. */
  source: string;
  /** Envelope id on the right of the flow. */
  target: string;
  /** Allocated amount, in cents. */
  value: number;
  /** Optional hint for the link color (defaults to target planet). */
  endColor?: string;
}

export interface SankeyFlowProps {
  /** The 7 envelopes the paycheck fans out to. */
  nodes: SankeyNode[];
  /** The 7 (or N) flows from paycheck to each envelope. */
  links: SankeyLink[];
  /** The paycheck amount, in cents (for the head label). */
  totalCents: number;
  /** Height in px (responsive width). */
  height?: number;
  /** Whether the source node is shown ("Paycheck" by default). */
  showSource?: boolean;
  /** Override for the source node label. */
  sourceLabel?: string;
  /** Custom tooltips for links (e.g. to show the rule). */
  linkSubtitle?: (link: SankeyLink) => string;
}

export function SankeyFlow({
  nodes,
  links,
  totalCents,
  height = 360,
  showSource = true,
  sourceLabel = "Paycheck",
  linkSubtitle,
}: SankeyFlowProps) {
  // Build the chart data: optional source node + the envelope nodes.
  const data = useMemo(() => {
    const finalNodes = showSource
      ? [{ id: "__source", label: sourceLabel, color: "#FFD24A" }, ...nodes]
      : nodes;
    const finalLinks = showSource
      ? links.map((l) => ({ ...l, source: "__source" }))
      : links;
    return { nodes: finalNodes, links: finalLinks };
  }, [nodes, links, showSource, sourceLabel]);

  // The nivo color resolver: source → bright gold leaf; otherwise the
  // Sankey-specific palette (slightly brighter than the chip-tuned
  // PLANET_COLORS so the blocks read on the dark cosmic canvas).
  const colorFor = (node: { id: string; color?: string }): string => {
    if (node.color) return node.color;
    if (node.id === "__source") return "#FFD24A"; // bright gold for source
    const planet = inferPlanet(node.id);
    return planet ? SANKEY_PALETTE[planet] : "#FFD24A";
  };

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        background: "var(--cosmos)",
        border: "1px solid var(--line)",
        borderRadius: 4,
        padding: "12px 12px 8px",
      }}
    >
      {/* Source header — guarantees the "Paycheck · $X" label is
          always visible regardless of chart width. The in-chart source
          node keeps its `outside` label so both reads agree. */}
      {showSource && (
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            marginBottom: 6,
            padding: "0 4px",
          }}
        >
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
                fontSize: 9.5,
                color: "var(--ink-3)",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
              }}
            >
              <span style={{ color: "var(--ink-4)" }}>//</span> From
            </span>
            <span
              style={{
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 14,
                fontWeight: 600,
                color: "var(--gold-glow)",
                lineHeight: 1,
                letterSpacing: "0.02em",
              }}
            >
              {sourceLabel}
            </span>
          </div>
          <span
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 10.5,
              color: "var(--ink-3)",
              letterSpacing: "0.10em",
              textTransform: "uppercase",
            }}
          >
            7 vessels · auto-distributed
          </span>
        </div>
      )}
      <div style={{ position: "relative", width: "100%", height }}>
        <ResponsiveSankey
          data={data}
          margin={{ top: 12, right: 200, bottom: 12, left: 60 }}
        align="justify"
        sort="input"
        colors={colorFor as never}
        nodeOpacity={1}
        nodeHoverOpacity={1}
        nodeHoverOthersOpacity={0.45}
        nodeThickness={22}
        nodeInnerPadding={3}
        nodeSpacing={22}
        nodeBorderWidth={2}
        nodeBorderColor={{ from: "color", modifiers: [["darker", 0.5]] }}
        linkOpacity={0.88}
        linkHoverOpacity={1}
        linkHoverOthersOpacity={0.28}
        linkContract={3}
        enableLinkGradient
        labelPosition="outside"
        labelOrientation="horizontal"
        labelPadding={16}
        labelTextColor={{ from: "color", modifiers: [["brighter", 1.1]] }}
        valueFormat={(v) => formatMoney(Math.round(v))}
        layers={["links", "nodes", "labels"]}
        theme={{
          background: "transparent",
          text: {
            fontFamily: "var(--font-sora)",
            fontSize: 12,
            fill: "var(--ink)",
          },
          labels: {
            text: {
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 11,
              fontWeight: 500,
            },
          },
          tooltip: {
            container: {
              background: "var(--surface)",
              color: "var(--ink)",
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 12,
              border: "1px solid var(--line)",
              borderRadius: 2,
              padding: "8px 12px",
              boxShadow: "0 0 16px rgba(0,0,0,0.4)",
            },
          },
        }}
        label={((node: { id: string; label?: string }) =>
          `${node.label ?? node.id}`) as never}
        nodeTooltip={({ node }) => (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <strong
              style={{
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 13,
                fontWeight: 600,
                color: node.color,
                letterSpacing: "0.04em",
              }}
            >
              {node.label ?? node.id}
            </strong>
            <span
              style={{
                color: "var(--ink-2)",
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 12,
              }}
            >
              {formatMoney(node.value)} of {formatMoney(totalCents)}
            </span>
            <span
              style={{
                color: "var(--ink-3)",
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 10,
                letterSpacing: "0.10em",
                textTransform: "uppercase",
              }}
            >
              {((node.value / totalCents) * 100).toFixed(1)}% of paycheck
            </span>
          </div>
        )}
        linkTooltip={({ link }) => {
          const target = link.target as { id: string; label?: string };
          const pct = totalCents > 0 ? (link.value / totalCents) * 100 : 0;
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <strong
                style={{
                  fontFamily: "var(--font-jetbrains), monospace",
                  fontSize: 12,
                  fontWeight: 600,
                  color: target.label === sourceLabel ? "#FFD24A" : colorFor(target as never),
                }}
              >
                {formatMoney(link.value)} → {target.label ?? target.id}
              </strong>
              <span
                style={{
                  color: "var(--ink-2)",
                  fontFamily: "var(--font-jetbrains), monospace",
                  fontSize: 12,
                }}
              >
                {pct.toFixed(1)}% of paycheck
              </span>
              {linkSubtitle && (
                <span
                  style={{
                    color: "var(--ink-3)",
                    fontSize: 11,
                    fontFamily: "var(--font-sora)",
                    maxWidth: 220,
                    lineHeight: 1.4,
                  }}
                >
                  {linkSubtitle({
                    source: String(link.source),
                    target: String(link.target),
                    value: link.value,
                  })}
                </span>
              )}
            </div>
          );
        }}
      />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * The nivo Sankey uses stable ids; we want the visual color to follow the
 * planetary mapping. The 7 default envelope ids are stable, so this lookup
 * works without a planet param. For custom envelopes, callers can pass
 * `color` directly on the node.
 */
function inferPlanet(nodeId: string): PlanetId | null {
  if (nodeId.startsWith("env-rent")) return "sol";
  if (nodeId.startsWith("env-groceries")) return "luna";
  if (nodeId.startsWith("env-utilities")) return "mercury";
  if (nodeId.startsWith("env-dining")) return "venus";
  if (nodeId.startsWith("env-buffer")) return "mars";
  if (nodeId.startsWith("env-savings")) return "jupiter";
  if (nodeId.startsWith("env-debt")) return "saturn";
  return null;
}

// ---------------------------------------------------------------------------
// Sankey-specific palettes
// ---------------------------------------------------------------------------

/**
 * Block colors for the Sankey nodes. Slightly brighter + more saturated
 * than the standard PLANET_COLORS (which are tuned for small chips and
 * glyphs that need to read against varied backgrounds). At 16-20px node
 * thickness on a dark cosmic canvas, the eye needs the extra contrast
 * to distinguish Jupiter (purple) from Saturn (gray) and Mercury (teal)
 * from Luna (pale blue).
 *
 * Pair with the nivo `nodeBorderColor` `darker 0.35` modifier to give
 * each block a 1px edge for separation against neighbors.
 */
const SANKEY_PALETTE: Record<PlanetId, string> = {
  sol:     "#FFC93C",  // warm gold (Rent)
  luna:    "#5BA8E0",  // cool moon-blue (Groceries) — more saturated
  mars:    "#FF5C2E",  // iron orange-red (Buffer) — more saturated
  mercury: "#1FE0C2",  // bright teal (Utilities)
  jupiter: "#C77DFF",  // royal purple (Growth) — more saturated
  venus:   "#FF8A65",  // warm rose (Joy) — more saturated
  saturn:  "#7B8DB5",  // cool slate (Debt)
};
