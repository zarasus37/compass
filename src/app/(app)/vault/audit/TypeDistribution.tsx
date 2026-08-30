/**
 * TypeDistribution — horizontal stacked bar of actionType counts.
 *
 * Visual-first (per xKryptic directive 2026-08-23): one segment
 * per distinct actionType, width = (count / total) * 100%.
 * Segment order: by count desc. Each segment is clickable and
 * navigates to `?type=<exactActionType>` (server-side filter).
 *
 * Color map: stable per actionType (see `colorForActionType` in
 * the data layer) — the same color shows up in the table chip
 * below. This gives the user a visual "type signature" that
 * persists across renders.
 *
 * Server component, pure render. No client islands.
 */
import * as React from "react";
import Link from "next/link";
import type { AuditLogTypeCount } from "@/lib/vault/audit-log";
import { colorForActionType } from "@/lib/vault/audit-log";

export function TypeDistribution({
  types,
  total,
  currentType,
  prefixFilter,
}: {
  types: AuditLogTypeCount[];
  total: number;
  /** The currently-active type filter (if any) — used to render
   *  the active segment with a brighter ring. */
  currentType?: string;
  /** The currently-active prefix filter (if any) — used to keep
   *  it applied when a segment is clicked. */
  prefixFilter?: string;
}) {
  if (types.length === 0) {
    return (
      <div
        data-testid="vault-audit-type-distribution"
        style={{
          background: "var(--vessel-surface)",
          border: "1px solid var(--vessel-border)",
          padding: "16px 20px",
          marginBottom: 32,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 10,
            fontWeight: 600,
            color: "var(--ink-3)",
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            marginBottom: 12,
          }}
        >
          // type distribution
        </div>
        <div
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 11,
            color: "var(--ink-3)",
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            padding: "12px 0",
          }}
        >
          // no events yet
        </div>
      </div>
    );
  }
  const segments = types.map((t) => {
    const widthPct = (t.count / total) * 100;
    const color = colorForActionType(t.actionType);
    const href = prefixFilter
      ? `?type=${encodeURIComponent(t.actionType)}&prefix=${encodeURIComponent(prefixFilter)}`
      : `?type=${encodeURIComponent(t.actionType)}`;
    const isActive = t.actionType === currentType;
    return { ...t, widthPct, color, href, isActive };
  });
  // Visible legend: top 6 types + a "+ N more" if there are
  // more (keeps the row scannable; the rest are in the pills
  // row below). 6 is enough to read the shape.
  const visibleLegend = segments.slice(0, 6);
  const remainingCount = segments.length - visibleLegend.length;
  return (
    <div
      data-testid="vault-audit-type-distribution"
      style={{
        background: "var(--vessel-surface)",
        border: "1px solid var(--vessel-border)",
        padding: "16px 20px",
        marginBottom: 32,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 10,
            fontWeight: 600,
            color: "var(--ink-3)",
            textTransform: "uppercase",
            letterSpacing: "0.18em",
          }}
        >
          // type distribution
        </div>
        <div
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 10,
            color: "var(--ink-3)",
            textTransform: "uppercase",
            letterSpacing: "0.18em",
          }}
        >
          // {types.length} type{types.length === 1 ? "" : "s"} ·{" "}
          {total.toLocaleString("en-US")} total · click a segment to filter
        </div>
      </div>
      <div
        role="img"
        aria-label={`Type distribution: ${segments
          .map((s) => `${s.actionType} ${s.count}`)
          .join(", ")}`}
        style={{
          display: "flex",
          width: "100%",
          height: 36,
          border: "1px solid var(--vessel-border)",
          background: "var(--vessel-surface)",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        {segments.map((s) => (
          <Link
            key={s.actionType}
            href={s.href}
            data-testid={`vault-audit-type-segment-${s.actionType.replace(/[^a-z0-9]/gi, "-")}`}
            title={`${s.actionType} · ${s.count} (${s.widthPct.toFixed(1)}%)`}
            style={{
              display: "block",
              width: `${s.widthPct}%`,
              background: s.color,
              position: "relative",
              textDecoration: "none",
              outline: s.isActive ? "2px solid var(--ink)" : "none",
              outlineOffset: s.isActive ? -2 : 0,
              opacity: s.isActive ? 1 : 0.92,
              cursor: "pointer",
            }}
          >
            {s.widthPct > 4 ? (
              <span
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  fontFamily: "var(--font-jetbrains), monospace",
                  fontSize: 9.5,
                  fontWeight: 700,
                  color: "var(--vessel-dark)",
                  textTransform: "uppercase",
                  letterSpacing: "0.10em",
                  whiteSpace: "nowrap",
                  pointerEvents: "none",
                }}
              >
                {s.count}
              </span>
            ) : null}
          </Link>
        ))}
      </div>
      {/* Legend (top 6) */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 16,
          marginTop: 12,
        }}
      >
        {visibleLegend.map((s) => (
          <div
            key={s.actionType}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 10,
              color: "var(--ink-2)",
              letterSpacing: "0.05em",
            }}
          >
            <span
              aria-hidden
              style={{
                width: 10,
                height: 10,
                background: s.color,
                borderRadius: 1,
                flexShrink: 0,
              }}
            />
            <span>{s.actionType}</span>
            <span style={{ color: "var(--ink-3)" }}>· {s.count}</span>
          </div>
        ))}
        {remainingCount > 0 ? (
          <div
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 10,
              color: "var(--ink-3)",
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              alignSelf: "center",
            }}
          >
            + {remainingCount} more
          </div>
        ) : null}
      </div>
    </div>
  );
}
