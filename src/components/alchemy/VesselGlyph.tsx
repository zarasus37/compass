/**
 * VesselGlyph — the planetary icon attached to every envelope.
 * Visual-only reference to the 7 classical planets (D14).
 * The actual envelope name in the UI is plain English; the glyph is
 * a color/identity marker.
 */

import * as React from "react";

export type PlanetId = "sol" | "luna" | "mars" | "mercury" | "jupiter" | "venus" | "saturn";

export const PLANET_GLYPHS: Record<PlanetId, string> = {
  sol: "☉",
  luna: "☽",
  mars: "♂",
  mercury: "☿",
  jupiter: "♃",
  venus: "♀",
  saturn: "♄",
};

/** Tailwind/hex class map — mirror the CSS variables in globals.css. */
export const PLANET_COLORS: Record<PlanetId, string> = {
  sol: "#f0c14a",
  luna: "#b8c8e0",
  mars: "#c45a3a",
  mercury: "#8ac0b8",
  jupiter: "#9a7ac0",
  venus: "#d4a578",
  saturn: "#a8b0c8",
};

export interface VesselGlyphProps {
  planet: PlanetId | null;
  /** Pixel size. Default 22. */
  size?: number;
  /** When true, render a circle behind the glyph (envelope row style). Default false. */
  inCircle?: boolean;
  /** Optional className. */
  className?: string;
}

export function VesselGlyph({ planet, size = 22, inCircle = false, className }: VesselGlyphProps) {
  if (!planet) return null;
  const glyph = PLANET_GLYPHS[planet];
  const color = PLANET_COLORS[planet];

  if (inCircle) {
    return (
      <div
        className={className}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          display: "grid",
          placeItems: "center",
          background: "var(--cosmos)",
          border: "1px solid var(--line)",
          color,
        }}
        aria-hidden
      >
        <span style={{ fontSize: size * 0.6, lineHeight: 1, fontWeight: 500 }}>{glyph}</span>
      </div>
    );
  }
  return (
    <span
      className={className}
      style={{ color, fontSize: size, lineHeight: 1, fontWeight: 500, fontFamily: "serif" }}
      aria-hidden
    >
      {glyph}
    </span>
  );
}
