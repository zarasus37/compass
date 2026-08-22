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
      ? [{ id: "__source", label: sourceLabel, color: "var(--gold)" }, ...nodes]
      : nodes;
    const finalLinks = showSource
      ? links.map((l) => ({ ...l, source: "__source" }))
      : links;
    return { nodes: finalNodes, links: finalLinks };
  }, [nodes, links, showSource, sourceLabel]);

  // The nivo color resolver: source → gold leaf; otherwise planetary.
  const colorFor = (node: { id: string; color?: string }): string => {
    if (node.color) return node.color;
    if (node.id === "__source") return "var(--gold)";
    // Look up the node's planet by the envelope id
    const planet = inferPlanet(node.id);
    return planet ? PLANET_COLORS[planet] : "var(--gold)";
  };

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height,
        background: "var(--cosmos)",
        border: "1px solid var(--line)",
        borderRadius: 4,
        padding: 12,
      }}
    >
      <ResponsiveSankey
        data={data}
        margin={{ top: 16, right: 168, bottom: 16, left: 168 }}
        align="justify"
        sort="input"
        colors={colorFor as never}
        nodeOpacity={1}
        nodeHoverOpacity={0.85}
        nodeHoverOthersOpacity={0.4}
        nodeThickness={16}
        nodeInnerPadding={3}
        nodeSpacing={18}
        nodeBorderWidth={0}
        linkOpacity={0.42}
        linkHoverOpacity={0.75}
        linkHoverOthersOpacity={0.18}
        linkContract={3}
        enableLinkGradient
        labelPosition="outside"
        labelOrientation="horizontal"
        labelPadding={14}
        labelTextColor={{ from: "color", modifiers: [["brighter", 1.1]] }}
        valueFormat={(v) => formatMoney(Math.round(v))}
        layers={["links", "nodes", "labels"]}
        theme={{
          background: "transparent",
          text: {
            fontFamily: "var(--font-cormorant), serif",
            fontSize: 13,
            fill: "var(--ink)",
          },
          labels: {
            text: {
              fontFamily: "var(--font-italiana), var(--font-cinzel), serif",
              fontSize: 14,
              fontWeight: 500,
            },
          },
          tooltip: {
            container: {
              background: "var(--surface)",
              color: "var(--ink)",
              fontFamily: "var(--font-cormorant), serif",
              fontSize: 13,
              border: "1px solid var(--gold-soft)",
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
                fontFamily: "var(--font-italiana), serif",
                fontSize: 16,
                color: node.color,
              }}
            >
              {node.label ?? node.id}
            </strong>
            <span style={{ color: "var(--ink-2)" }}>
              {formatMoney(node.value)} of {formatMoney(totalCents)}
            </span>
            <span style={{ color: "var(--ink-3)", fontStyle: "italic", fontSize: 12 }}>
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
                  fontFamily: "var(--font-italiana), serif",
                  fontSize: 15,
                  color: target.label === sourceLabel ? "var(--gold)" : colorFor(target as never),
                }}
              >
                {formatMoney(link.value)} → {target.label ?? target.id}
              </strong>
              <span style={{ color: "var(--ink-2)" }}>{pct.toFixed(1)}% of paycheck</span>
              {linkSubtitle && (
                <span
                  style={{
                    color: "var(--ink-3)",
                    fontStyle: "italic",
                    fontSize: 12,
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
