"use client";

/**
 * DashboardCard — the atomic card primitive for the scrollable dashboard.
 *
 * Pattern (mom-grade, locked):
 *  - In VIEW mode: the entire card is a single tap-through target. The
 *    href routes to a deep-dive tab where the user sees the full data
 *    set (transactions, calendar, envelopes, etc.). A subtle chevron
 *    on the right edge signals "more here". The whole card scales down
 *    1% on :active for tactile feedback.
 *  - In EDIT mode: the Link is replaced with a div; the card shows
 *    reorder controls (up/down) on the left and a remove (X) on the
 *    right. The content remains visible so the user can see what
 *    they're reordering.
 *
 * The card renders a "view-transition-name" so the browser can
 * smoothly hand off to the destination page if both sides opt in.
 * Falls back to a simple slide-in animation where view transitions
 * aren't supported.
 */

import * as React from "react";
import Link from "next/link";

export type CardAccent = "gold" | "warn" | "neg" | "ok" | "jupiter" | "saturn" | "venus" | "luna" | "mercury" | "mars" | "sol";

export interface DashboardCardProps {
  /** Stable id used by the dashboard grid for reorder / hide. */
  cardId: string;
  /** Destination for the tap-through. Required in view mode. */
  href?: string;
  /** Small caps eyebrow above the title. */
  eyebrow?: string;
  /** Card title (Italiana, prominent). */
  title: string;
  /** Tail phrase in italic after the title, e.g. "tomorrow.". */
  em?: string;
  /** Right-side meta — e.g. a small status pill, an amount, a date. */
  rightMeta?: React.ReactNode;
  /** Accent color for the eyebrow + the left border / top tint. */
  accent?: CardAccent;
  /** Edit mode — show reorder + remove controls instead of tap-through. */
  editing?: boolean;
  /** First card? (hide the "up" button in the edit rail). */
  isFirst?: boolean;
  /** Last card? (hide the "down" button). */
  isLast?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onRemove?: () => void;
  /** The card's body. */
  children: React.ReactNode;
}

const ACCENT_BORDER: Record<CardAccent, string> = {
  gold: "var(--gold)",
  warn: "var(--warn)",
  neg: "var(--neg)",
  ok: "var(--ok)",
  jupiter: "var(--jupiter)",
  saturn: "var(--saturn)",
  venus: "var(--venus)",
  luna: "var(--luna)",
  mercury: "var(--mercury)",
  mars: "var(--mars)",
  sol: "var(--sol)",
};

const ACCENT_TINT: Record<CardAccent, string> = {
  gold: "rgba(212, 175, 82, 0.10)",
  warn: "rgba(212, 160, 80, 0.10)",
  neg: "rgba(196, 90, 58, 0.12)",
  ok: "rgba(106, 176, 136, 0.10)",
  jupiter: "rgba(154, 122, 192, 0.12)",
  saturn: "rgba(168, 176, 200, 0.12)",
  venus: "rgba(212, 165, 120, 0.12)",
  luna: "rgba(184, 200, 224, 0.12)",
  mercury: "rgba(138, 192, 184, 0.12)",
  mars: "rgba(196, 90, 58, 0.12)",
  sol: "rgba(240, 193, 74, 0.10)",
};

export function DashboardCard({
  cardId,
  href,
  eyebrow,
  title,
  em,
  rightMeta,
  accent = "gold",
  editing = false,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onRemove,
  children,
}: DashboardCardProps) {
  const accentColor = ACCENT_BORDER[accent];
  const tint = ACCENT_TINT[accent];

  const body = (
    <div
      style={{
        position: "relative",
        background: `radial-gradient(ellipse at 0% 0%, ${tint} 0%, transparent 55%), var(--surface)`,
        border: "1px solid var(--line)",
        borderLeft: `2px solid ${accentColor}`,
        borderRadius: 4,
        padding: "26px 28px 24px",
        transition:
          "transform 180ms cubic-bezier(0.2, 0.7, 0.3, 1), border-color 180ms, box-shadow 180ms",
        viewTransitionName: `card-${cardId}`,
        cursor: editing ? "default" : "pointer",
        boxShadow: editing ? "0 0 0 1px var(--gold) inset" : "none",
      }}
      className="dashboard-card-surface"
    >
      {/* Edit-mode rail: reorder + remove */}
      {editing && (
        <div
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            background: "var(--cosmos-2)",
            border: "1px solid var(--line)",
            borderRadius: 2,
            padding: 2,
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
          gap: 16,
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0, flex: 1 }}>
          {eyebrow && (
            <div
              style={{
                fontFamily: "var(--font-cinzel), serif",
                fontSize: 10,
                fontWeight: 600,
                color: accentColor,
                letterSpacing: "0.24em",
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
              fontFamily: "var(--font-italiana), var(--font-cinzel), serif",
              fontWeight: 400,
              fontSize: 26,
              lineHeight: 1.1,
              letterSpacing: "0.005em",
              margin: 0,
              color: "var(--ink)",
            }}
          >
            {title}
            {em && (
              <em
                style={{
                  fontFamily: "var(--font-cormorant), serif",
                  fontStyle: "italic",
                  color: "var(--ink-3)",
                  fontWeight: 500,
                  marginLeft: 6,
                  fontSize: 18,
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
              fontFamily: "var(--font-cinzel), serif",
              fontSize: 22,
              lineHeight: 1,
              color: "var(--ink-3)",
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
        fontFamily: "var(--font-cinzel), serif",
        fontSize: 11,
        fontWeight: 600,
        width: 24,
        height: 24,
        display: "grid",
        placeItems: "center",
        background: "transparent",
        color: disabled
          ? "var(--ink-5)"
          : danger
          ? "var(--neg)"
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
          ? "rgba(196, 90, 58, 0.18)"
          : "rgba(212, 175, 82, 0.18)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      {glyph}
    </button>
  );
}
