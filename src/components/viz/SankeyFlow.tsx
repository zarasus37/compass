"use client";

/**
 * SankeyFlow — the Automation Map.
 *
 * A paycheck arrives on the left; on the right, it fans out into the
 * seven envelopes (Sol / Luna / Mars / Mercury / Jupiter / Venus / Saturn)
 * with link widths proportional to each vessel's share. The eye reads
 * the whole allocation in one glance.
 *
 * Why this isn't a stock nivo Sankey:
 *   nivo's link layer forces every link to inherit its source node's
 *   color (`e.color = e.source.color` in their data prep), then
 *   optionally gradients toward the target. The gradient was washing
 *   out on the cosmic dark canvas (multiply blend + dim opacity).
 *   We bypass the default `links` layer with our own implementation
 *   that paints each link SOLID in the target node's color, then
 *   apply a Gaussian-blur glow filter (defined below) for the
 *   "light delivery" effect.
 *
 * @nivo/sankey is still used for the data prep + sankey layout + node
 * and label rendering. We just replace the link layer.
 *
 * Per 00-DESIGN.md §0a: cosmic dark canvas, gold leaf for the source,
 * planetary metals for each destination. The visible UI matters more
 * than the math, so the per-link color is the destination planet
 * (not the source gold).
 */

import * as React from "react";
import { Fragment, useMemo } from "react";
import { ResponsiveSankey } from "@nivo/sankey";
import { line, curveMonotoneX } from "d3-shape";
import { formatMoney } from "@/lib/money";
import { type PlanetId } from "@/components/alchemy/VesselGlyph";

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
}

export interface SankeyFlowProps {
  nodes: SankeyNode[];
  links: SankeyLink[];
  totalCents: number;
  height?: number;
  showSource?: boolean;
  sourceLabel?: string;
  /**
   * Optional secondary text for each link's native <title> tooltip.
   * Use for "Rule: percent · 18% of paycheck" or similar context
   * the user might want to know on hover.
   */
  linkSubtitle?: (link: SankeyLink) => string;
}

export function SankeyFlow({
  nodes,
  links,
  totalCents,
  height = 380,
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

  return (
    <div
      className="sankey-chart"
      style={{
        position: "relative",
        width: "100%",
        background: "var(--cosmos)",
        border: "1px solid var(--line)",
        borderRadius: 4,
        padding: "12px 12px 8px",
      }}
    >
      {/* SVG defs — a Gaussian-blur glow filter applied to every link
          path so each band reads as light-emitting, not just flat color.
          The filter is referenced by CSS via .sankey-chart path. */}
      <svg
        aria-hidden
        width="0"
        height="0"
        style={{ position: "absolute", overflow: "hidden" }}
      >
        <defs>
          <filter id="sankeyGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>

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
                color: "#FFD24A",
                lineHeight: 1,
                letterSpacing: "0.02em",
              }}
            >
              {sourceLabel} · {formatMoney(totalCents)}
            </span>
          </div>
          <span
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 10,
              color: "var(--ink-3)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
          >
            7 VESSELS · AUTO
          </span>
        </div>
      )}

      <div style={{ position: "relative", width: "100%", height }}>
        <ResponsiveSankey
          data={data}
          // Margins tuned so:
          //   - 80px left fits the source value label ("$2,400.00")
          //     without clipping at the chart's left edge
          //   - 220px right fits the longest vessel label
          //     ("Dining & Joy") plus its value chip
          margin={{ top: 8, right: 220, bottom: 8, left: 80 }}
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
          nodeBorderColor={{ from: "color", modifiers: [["darker", 0.55]] }}
          // The default link layer is REPLACED by `CustomLinksLayer`
          // (see below) — every link is painted solid in the target
          // node's color, not the source's. The default nivo settings
          // are irrelevant; we control the layer ourselves.
          enableLinkGradient={false}
          labelPosition="outside"
          labelOrientation="horizontal"
          labelPadding={14}
          labelTextColor={{ from: "color", modifiers: [["brighter", 1.1]] }}
          valueFormat={(v) => formatMoney(Math.round(v))}
          layers={["links", "nodes", "labels", (p) => (
            <CustomLinksLayer
              {...(p as unknown as SankeyLayerProps)}
              linkOpacity={1}
              linkHoverOpacity={1}
              linkHoverOthersOpacity={0.2}
              linkContract={3}
              linkBlendMode="screen"
              layout="horizontal"
              linkSubtitle={linkSubtitle}
              totalCents={totalCents}
            />
          )]}
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
          // We replaced the default `links` layer with CustomLinksLayer
          // (passed above), so the default nivo tooltip for links is
          // moot. The custom layer implements its own tooltip below.
          // (The linkTooltip prop is for the default layer.)
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
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Custom link layer — the workhorse that fixes nivo's color bug.
// ---------------------------------------------------------------------------

interface SankeyLayerProps {
  links: SankeyLinkDatum[];
  nodes: SankeyNodeDatum[];
  currentNode: SankeyNodeDatum | null;
  currentLink: SankeyLinkDatum | null;
  setCurrentLink: (link: SankeyLinkDatum | null) => void;
  isCurrentLink: (link: SankeyLinkDatum) => boolean;
  isInteractive: boolean;
  layout: "horizontal" | "vertical";
  linkOpacity: number;
  linkHoverOpacity: number;
  linkHoverOthersOpacity: number;
  linkContract: number;
  linkBlendMode: string;
  /** SankeyFlow props forwarded to the layer. */
  linkSubtitle?: (link: SankeyLink) => string;
  totalCents: number;
}

interface SankeyNodeDatum {
  id: string;
  label?: string;
  color: string;
  x: number;
  y: number;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  width: number;
  height: number;
  value: number;
}

interface SankeyLinkDatum {
  source: SankeyNodeDatum;
  target: SankeyNodeDatum;
  value: number;
  formattedValue?: string;
  index: number;
  thickness: number;
  pos0: number;
  pos1: number;
}

/**
 * Custom link layer for nivo Sankey. Paints each link in the target
 * node's color (not the source's), with the standard d3-sankey path.
 * Path generation mirrors nivo's: a 9-point polyline with cubic
 * monotone-X interpolation, treated as a closed shape.
 *
 * Replaces the default `links` layer entirely. The default nivo layer
 * sets `e.color = e.source.color` in its data-prep step, which forces
 * every link to be the source's color — defeating the per-vessel
 * "this is a Savings link" reading the user wants. We bypass it.
 */
function CustomLinksLayer(props: SankeyLayerProps) {
  const {
    links,
    nodes,
    currentNode,
    currentLink,
    setCurrentLink,
    isCurrentLink,
    isInteractive,
    linkOpacity,
    linkHoverOpacity,
    linkHoverOthersOpacity,
    linkContract,
    linkBlendMode,
    linkSubtitle,
    totalCents,
  } = props;

  // Map node id → color for O(1) lookups.
  const colorById = useMemo(
    () => new Map<string, string>(nodes.map((n) => [n.id, n.color])),
    [nodes],
  );

  // Path generator — same algorithm nivo uses, with d3-shape's
  // line+curveMonotoneX. Each call returns a closed path string.
  const lineGen = useMemo(
    () => line().curve(curveMonotoneX),
    [],
  );

  const buildPath = React.useCallback(
    (link: SankeyLinkDatum): string => {
      const t = Math.max(1, link.thickness - 2 * linkContract) / 2;
      const i = 0.12 * (link.target.x0 - link.source.x1);
      const points: [number, number][] = [
        [link.source.x1, link.pos0 - t],
        [link.source.x1 + i, link.pos0 - t],
        [link.target.x0 - i, link.pos1 - t],
        [link.target.x0, link.pos1 - t],
        [link.target.x0, link.pos1 + t],
        [link.target.x0 - i, link.pos1 + t],
        [link.source.x1 + i, link.pos0 + t],
        [link.source.x1, link.pos0 + t],
        [link.source.x1, link.pos0 - t],
      ];
      const raw = lineGen(points);
      // d3.line returns a string with "M ..." and "L ...". We need it
      // closed (Z) to form a filled path.
      return (raw ?? "") + "Z";
    },
    [lineGen, linkContract],
  );

  // Hover state — dim non-focused links when one is hovered, just like
  // nivo's default. Uses the same math.
  const isFocused = (link: SankeyLinkDatum): boolean =>
    Boolean(currentLink) || Boolean(currentNode);
  const effectiveOpacity = (link: SankeyLinkDatum): number => {
    if (!isFocused(link)) return linkOpacity;
    return isCurrentLink(link) ? linkHoverOpacity : linkHoverOthersOpacity;
  };

  return (
    <Fragment>
      {links.map((link) => {
        const targetColor = colorById.get(link.target.id) ?? "#FFD24A";
        const targetLabel = link.target.label ?? link.target.id;
        const subtitle = linkSubtitle
          ? linkSubtitle({
              source: String(link.source.id),
              target: String(link.target.id),
              value: link.value,
            })
          : "";
        const pct = totalCents > 0 ? (link.value / totalCents) * 100 : 0;
        return (
          <path
            key={`${link.source.id}.${link.target.id}.${link.index}`}
            d={buildPath(link)}
            fill={targetColor}
            fillOpacity={effectiveOpacity(link)}
            onMouseEnter={isInteractive ? () => setCurrentLink(link) : undefined}
            onMouseLeave={isInteractive ? () => setCurrentLink(null) : undefined}
            onClick={isInteractive ? () => setCurrentLink(link) : undefined}
            style={{
              mixBlendMode: (linkBlendMode ?? "normal") as React.CSSProperties["mixBlendMode"],
              cursor: isInteractive ? "pointer" : "default",
            }}
          >
            {isInteractive && (
              <title>
                {`${formatMoney(link.value)} → ${targetLabel} (${pct.toFixed(1)}% of paycheck)${subtitle ? `\n${subtitle}` : ""}`}
              </title>
            )}
          </path>
        );
      })}
    </Fragment>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * The nivo Sankey uses stable ids; we want the visual color to follow
 * the planetary mapping. Each destination envelope gets its planet
 * color from SANKEY_PALETTE.
 */
const colorFor = (node: { id: string; color?: string }): string => {
  if (node.color) return node.color;
  if (node.id === "__source") return "#FFD24A";
  const planet = inferPlanet(node.id);
  return planet ? SANKEY_PALETTE[planet] : "#FFD24A";
};

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
// Sankey-specific palette — neon-bright, each on a different hue family
// so adjacent bands never run together.
// ---------------------------------------------------------------------------

const SANKEY_PALETTE: Record<PlanetId, string> = {
  sol:     "#FFE600",  // electric yellow (Rent)
  luna:    "#4ADE80",  // bright green (Groceries)
  mars:    "#FF4D4D",  // pure red (Buffer)
  mercury: "#22D3EE",  // bright cyan (Utilities)
  jupiter: "#C084FC",  // bright purple (Growth)
  venus:   "#F472B6",  // bright pink (Joy)
  saturn:  "#60A5FA",  // bright blue (Debt)
};
