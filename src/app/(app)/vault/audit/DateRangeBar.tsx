/**
 * DateRangeBar — Cluster 7.7.
 *
 * The date-range filter strip on `/vault/audit`. Five preset
 * chips (Last 24h / 7d / 30d / 90d / All time) + a small
 * active-range badge. All chips are `<Link>` elements that
 * change the URL; the page re-renders with the new filter.
 *
 * **URL contract**:
 *   - `?from=YYYY-MM-DD&to=YYYY-MM-DD` sets the window.
 *   - The "All time" chip removes both params.
 *   - The other filter params (`?type=`, `?prefix=`, `?q=`,
 *     `?take=`) are PRESERVED when changing the range. The
 *     chip's href merges the new range with the existing
 *     filter via `auditLogFilterToQuery` (called on a
 *     copy of the filter with the from/to swapped).
 *   - The "Clear" chip (visible when a range is active) drops
 *     just the date params, preserving the rest.
 *
 * **Visible-UI payoff**: per the 2026-08-24 directive, every
 * cell on the page pairs a headline number with a clickable
 * action. The date-range filter pairs with the "last activity"
 * cell of the headline strip — "Last activity: 3 minutes ago,
 * [SHOW LAST 7 DAYS →]" — to make the filter discoverable
 * from the data the user is already looking at.
 *
 * Server component. No `"use client"`; chips are plain
 * `<Link>` elements so the page stays static.
 */
import * as React from "react";
import Link from "next/link";
import {
  auditLogFilterToQuery,
  dateRangeForPreset,
  hasDateRange,
  type AuditLogFilter,
  type DateRangePresetId,
  DATE_RANGE_PRESETS,
} from "@/lib/vault/audit-log-shared";

export function DateRangeBar({
  filter,
  now,
}: {
  /** The page's current filter (for href merging + active state). */
  filter: AuditLogFilter;
  /** Pinned "now" for the relative preset windows. The page
   *  passes `new Date()`; the smoke can pass a fixed Date. */
  now: Date;
}) {
  const hasRange = hasDateRange(filter);
  // Build the href for each preset chip. The chip's href is
  // the union of the new from/to + the rest of the filter
  // (type/prefix/q/take). The active state is a highlight +
  // the `?from=` + `?to=` params match the preset's window.
  function hrefForPreset(id: DateRangePresetId): string {
    const range = dateRangeForPreset(id, now);
    const next: AuditLogFilter = {
      type: filter.type,
      prefix: filter.prefix,
      q: filter.q,
      take: filter.take,
      from: range.from,
      to: range.to,
    };
    const qs = auditLogFilterToQuery(next);
    return qs ? `/vault/audit${qs}` : "/vault/audit";
  }

  // Active state: a preset chip is "active" when its computed
  // window matches the page's current from/to. The "All time"
  // chip is active when the page has no range set.
  function isPresetActive(id: DateRangePresetId): boolean {
    const range = dateRangeForPreset(id, now);
    if (range.from === undefined && range.to === undefined) {
      // "All time" — active when the page has no range set.
      return !hasRange;
    }
    // Match the preset's from/to exactly. The smoke relies on
    // this exact-match behavior to assert "the chip you
    // clicked is the one that's now active."
    return range.from === filter.from && range.to === filter.to;
  }

  return (
    <div
      data-testid="vault-audit-date-range-bar"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        flexWrap: "wrap",
        marginBottom: 16,
        padding: "12px 14px",
        border: "1px solid var(--vessel-border)",
        background: "var(--vessel-surface)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 9.5,
            color: "var(--ink-3)",
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            marginRight: 4,
          }}
        >
          // range:
        </span>
        {DATE_RANGE_PRESETS.map((p) => {
          const active = isPresetActive(p.id);
          return (
            <Link
              key={p.id}
              href={hrefForPreset(p.id)}
              data-testid={`vault-audit-range-${p.id}`}
              data-active={active ? "true" : undefined}
              style={{
                display: "inline-block",
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 10,
                fontWeight: active ? 700 : 500,
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: active ? "var(--vessel-dark)" : "var(--ink-2)",
                background: active
                  ? "var(--vessel-accent)"
                  : "var(--vessel-dark)",
                border: `1px solid ${
                  active ? "var(--vessel-accent)" : "var(--vessel-border)"
                }`,
                padding: "4px 10px",
                borderRadius: 2,
                textDecoration: "none",
                whiteSpace: "nowrap",
              }}
            >
              {p.label}
            </Link>
          );
        })}
      </div>
      {hasRange ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 10,
            color: "var(--ink-2)",
            textTransform: "uppercase",
            letterSpacing: "0.10em",
          }}
        >
          <span data-testid="vault-audit-range-active">
            {filter.from && filter.to
              ? `${filter.from} → ${filter.to}`
              : filter.from
                ? `from ${filter.from}`
                : `until ${filter.to}`}
          </span>
          <Link
            href={clearRangeHref(filter)}
            data-testid="vault-audit-range-clear"
            style={{
              display: "inline-block",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--vessel-accent)",
              border: "1px solid var(--vessel-accent)",
              padding: "4px 10px",
              borderRadius: 2,
              textDecoration: "none",
            }}
          >
            [CLEAR]
          </Link>
        </div>
      ) : null}
    </div>
  );
}

/** Build the href for the [CLEAR] chip: drop from/to, keep
 *  the rest of the filter. */
function clearRangeHref(filter: AuditLogFilter): string {
  const next: AuditLogFilter = {
    type: filter.type,
    prefix: filter.prefix,
    q: filter.q,
    take: filter.take,
  };
  const qs = auditLogFilterToQuery(next);
  return qs ? `/vault/audit${qs}` : "/vault/audit";
}
