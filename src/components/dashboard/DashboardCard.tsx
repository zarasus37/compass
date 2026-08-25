"use client";

/**
 * DashboardCard — the atomic card primitive for the Component Oracle
 * Terminal dashboard.
 *
 * Pattern (mom-grade, locked):
 *  - In VIEW mode: the entire card is a single tap-through target.
 *    The chevron is a terminal `›` glyph that signals "more here".
 *    Hovering lifts the card slightly with a teal-cyan border glow
 *    (the "connection active" state). :active scales the card 0.5%
 *    down for tactile feedback.
 *  - In EDIT mode: the Link is replaced with a div; the card shows
 *    reorder controls (up/down) on the left and a remove (X) on the
 *    right. The content remains visible so the user can see what
 *    they're reordering.
 *
 * Visual language:
 *  - thin teal-gray border (#28404C)
 *  - square corners (4px)
 *  - mono labels (eyebrow, badges)
 *  - Sora for headings, mono for everything else
 *  - teal/cyan for active/connect, antique gold for primary accent
 */

import * as React from "react";
import Link from "next/link";

export type CardAccent = "gold" | "warn" | "neg" | "ok" | "cyan" | "jupiter" | "saturn" | "venus" | "luna" | "mercury" | "mars" | "sol";

export interface DashboardCardProps {
  /** Stable id used by the dashboard grid for reorder / hide. */
  cardId: string;
  /** Destination for the tap-through. Required in view mode. */
  href?: string;
  /** Mono caps eyebrow above the title (e.g. "// INDEXED"). */
  eyebrow?: string;
  /** Card title — Sora, prominent. */
  title: string;
  /** Italic tail after the title, e.g. "what's safe to spend.". */
  em?: string;
  /** Right-side meta — e.g. a small status pill, an amount, a date. */
  rightMeta?: React.ReactNode;
  /** Accent color for the left rail (terminal-cyan by default). */
  accent?: CardAccent;
  /** Edit mode — show reorder + remove controls instead of tap-through. */
  editing?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onRemove?: () => void;
  children: React.ReactNode;
}

const ACCENT_VAR: Record<CardAccent, string> = {
  gold: "var(--gold)",
  warn: "var(--vessel-watch)",
  neg: "var(--vessel-over)",
  ok: "var(--ok)",
  cyan: "var(--vessel-accent)",
  jupiter: "var(--jupiter)",
  saturn: "var(--saturn)",
  venus: "var(--venus)",
  luna: "var(--luna)",
  mercury: "var(--mercury)",
  mars: "var(--mars)",
  sol: "var(--sol)",
};

const ACCENT_TINT: Record<CardAccent, string> = {
  gold: "rgba(201, 164, 92, 0.08)",
  warn: "rgba(249, 115, 22, 0.08)",
  neg: "rgba(239, 68, 68, 0.10)",
  ok: "rgba(74, 222, 128, 0.08)",
  cyan: "rgba(168, 85, 247, 0.10)",
  jupiter: "rgba(196, 181, 253, 0.10)",
  saturn: "rgba(148, 163, 184, 0.08)",
  venus: "rgba(252, 165, 165, 0.10)",
  luna: "rgba(203, 213, 225, 0.08)",
  mercury: "rgba(103, 232, 249, 0.10)",
  mars: "rgba(251, 146, 60, 0.10)",
  sol: "rgba(252, 211, 77, 0.08)",
};

export function DashboardCard({
  cardId,
  href,
  eyebrow,
  title,
  em,
  rightMeta,
  accent = "cyan",
  editing = false,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onRemove,
  children,
}: DashboardCardProps) {
  const accentColor = ACCENT_VAR[accent];
  const tint = ACCENT_TINT[accent];

  const body = (
    <div
      style={{
        position: "relative",
        background: `${tint}, var(--vessel-surface)`,
        backgroundBlendMode: "normal" as const,
        border: "1px solid var(--vessel-border)",
        borderLeft: `1px solid ${accentColor}`,
        borderRadius: 4,
        padding: "20px 22px 18px",
        transition:
          "transform 180ms cubic-bezier(0.2, 0.7, 0.3, 1), border-color 180ms, box-shadow 180ms",
        viewTransitionName: `card-${cardId}`,
        cursor: editing ? "default" : "pointer",
        boxShadow: editing ? `0 0 0 1px ${accentColor} inset` : "none",
      }}
      className="dashboard-card-surface"
    >
      {/* Edit-mode rail: reorder + remove */}
      {editing && (
        <div
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            display: "inline-flex",
            alignItems: "center",
            gap: 2,
            background: "var(--vessel-surface)",
            border: "1px solid var(--vessel-border)",
            borderRadius: 2,
            padding: 2,
            zIndex: 2,
          }}
        >
          <EditButton
            label="Move up"
            disabled={isFirst}
            onClick={onMoveUp}
            glyph="▲"
          />
          <EditButton
            label="Move down"
            disabled={isLast}
            onClick={onMoveDown}
            glyph="▼"
          />
          <EditButton
            label="Remove"
            onClick={onRemove}
            glyph="✕"
            danger
          />
        </div>
      )}

      {/* Header row: eyebrow + title + chevron */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 14,
          marginBottom: 14,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0, flex: 1 }}>
          {eyebrow && (
            <div
              style={{
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 10,
                fontWeight: 500,
                color: accentColor,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 4,
                  height: 4,
                  borderRadius: "50%",
                  background: accentColor,
                  boxShadow: `0 0 6px ${accentColor}`,
                }}
              />
              {eyebrow}
            </div>
          )}
          <h3
            style={{
              fontFamily: "var(--font-sora)",
              fontWeight: 600,
              fontSize: 20,
              lineHeight: 1.15,
              letterSpacing: "-0.005em",
              margin: 0,
              color: "var(--ink)",
            }}
          >
            {title}
            {em && (
              <em
                style={{
                  fontFamily: "var(--font-sora)",
                  fontStyle: "normal",
                  color: "var(--ink-3)",
                  fontWeight: 400,
                  marginLeft: 6,
                  fontSize: 15,
                }}
              >
                {em}
              </em>
            )}
          </h3>
        </div>
        {rightMeta ? (
          <div style={{ flexShrink: 0 }}>{rightMeta}</div>
        ) : !editing && href ? (
          <div
            aria-hidden
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 18,
              lineHeight: 1,
              color: "var(--ink-4)",
              flexShrink: 0,
              transition: "transform 200ms cubic-bezier(0.2, 0.7, 0.3, 1), color 200ms",
            }}
            className="dashboard-card-chevron"
          >
            ›
          </div>
        ) : null}
      </div>

      {/* Body */}
      <div>{children}</div>
    </div>
  );

  if (editing) {
    return (
      <div data-card-id={cardId} style={{ display: "block" }}>
        {body}
      </div>
    );
  }

  if (!href) {
    return (
      <div data-card-id={cardId} style={{ display: "block" }}>
        {body}
      </div>
    );
  }

  return (
    <Link
      href={href}
      data-card-id={cardId}
      style={{
        display: "block",
        textDecoration: "none",
        color: "inherit",
        viewTransitionName: `card-${cardId}`,
      }}
      className="dashboard-card-link"
    >
      {body}
    </Link>
  );
}

function EditButton({
  label,
  glyph,
  onClick,
  disabled,
  danger,
}: {
  label: string;
  glyph: string;
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      style={{
        fontFamily: "var(--font-jetbrains), monospace",
        fontSize: 10,
        fontWeight: 600,
        width: 22,
        height: 22,
        display: "grid",
        placeItems: "center",
        background: "transparent",
        color: disabled
          ? "var(--ink-5)"
          : danger
          ? "var(--vessel-over)"
          : "var(--ink-2)",
        border: 0,
        borderRadius: 1,
        cursor: disabled ? "default" : "pointer",
        padding: 0,
        lineHeight: 1,
        transition: "background 120ms, color 120ms",
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        e.currentTarget.style.background = danger
          ? "rgba(239, 68, 68, 0.18)"
          : "rgba(168, 85, 247, 0.18)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      {glyph}
    </button>
  );
}
