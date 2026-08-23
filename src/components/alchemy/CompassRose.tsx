/**
 * CompassRose — the small Compass logo used in the masthead.
 * A simplified 8-pointed star with concentric circles.
 * Per v7 the full Mandala is reserved for the Period page; the
 * logo is this minimal symbolic version.
 */

import * as React from "react";

export interface CompassRoseProps {
  /** Pixel size. Default 36. */
  size?: number;
  /** Color. Default "currentColor" (inherits). */
  color?: string;
  /** Optional className. */
  className?: string;
}

export function CompassRose({ size = 36, color = "currentColor", className }: CompassRoseProps) {
  return (
    <svg
      viewBox="0 0 40 40"
      width={size}
      height={size}
      className={className}
      fill="none"
      stroke={color}
      strokeWidth="0.8"
      style={{ filter: "drop-shadow(0 0 6px rgba(212, 175, 82, 0.4))" }}
    >
      <circle cx="20" cy="20" r="18" opacity="0.5" />
      <circle cx="20" cy="20" r="13" opacity="0.3" />
      <path d="M 20 3 L 21.6 18.4 L 20 20 L 18.4 18.4 Z" fill={color} />
      <path d="M 20 37 L 21.6 21.6 L 20 20 L 18.4 21.6 Z" fill={color} opacity="0.7" />
      <path d="M 3 20 L 18.4 18.4 L 20 20 L 18.4 21.6 Z" fill={color} opacity="0.85" />
      <path d="M 37 20 L 21.6 18.4 L 20 20 L 21.6 21.6 Z" fill={color} opacity="0.85" />
      <path d="M 8 8 L 18 18 L 20 20 L 18 18 Z" fill={color} opacity="0.4" />
      <path d="M 32 8 L 22 18 L 20 20 L 22 18 Z" fill={color} opacity="0.4" />
      <path d="M 8 32 L 18 22 L 20 20 L 18 22 Z" fill={color} opacity="0.4" />
      <path d="M 32 32 L 22 22 L 20 20 L 22 22 Z" fill={color} opacity="0.4" />
      <circle cx="20" cy="20" r="2" fill={color} />
    </svg>
  );
}
