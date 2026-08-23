/**
 * Mandala — the central alchemical compass on the dashboard.
 * In v7 the dashboard uses the bar chart as the main viz, with the
 * mandala as a small symbolic logo. The full mandala is reserved for
 * the Period page where the user can dwell on the visualization.
 *
 * Props let callers scale the size and the data binding.
 */

import * as React from "react";

export interface Planet {
  id: "sol" | "luna" | "mars" | "mercury" | "jupiter" | "venus" | "saturn";
  glyph: string;
  cx: number;
  cy: number;
  r: number;
  fill: string;
  stroke: string;
}

const PLANETS: Planet[] = [
  { id: "sol",     glyph: "☉", cx: 230, cy: 60,  r: 20, fill: "url(#sun-glow)",  stroke: "#d4af52" },
  { id: "luna",    glyph: "☽", cx: 363, cy: 124, r: 16, fill: "url(#moon-glow)", stroke: "#b8c8e0" },
  { id: "mars",    glyph: "♂", cx: 396, cy: 268, r: 16, fill: "rgba(196, 90, 58, 0.15)", stroke: "#c45a3a" },
  { id: "mercury", glyph: "☿", cx: 304, cy: 383, r: 16, fill: "rgba(138, 192, 184, 0.12)", stroke: "#8ac0b8" },
  { id: "jupiter", glyph: "♃", cx: 156, cy: 383, r: 16, fill: "rgba(154, 122, 192, 0.12)", stroke: "#9a7ac0" },
  { id: "venus",   glyph: "♀", cx: 64,  cy: 268, r: 16, fill: "rgba(212, 165, 120, 0.12)", stroke: "#d4a578" },
  { id: "saturn",  glyph: "♄", cx: 97,  cy: 124, r: 16, fill: "rgba(106, 112, 138, 0.15)", stroke: "#6a708a" },
];

export interface MandalaProps {
  /** 1-460. Default 360. */
  size?: number;
  /** Day number to show in the center. 0 hides the readout. */
  dayOfPeriod?: number;
  /** Total days in the period. Default 14. */
  totalDays?: number;
  /** Which planet the compass needle points to. Default "saturn". */
  todayPlanet?: Planet["id"];
  /** Show the Latin band on the outer rim. Default true. */
  showLatin?: boolean;
  /** Show the IN/OUT hands. Default true. */
  showHands?: boolean;
  /** Optional className for the wrapper. */
  className?: string;
}

const TEXT_CIRCLE = "M 230,40 a 190,190 0 1,1 0,380 a 190,190 0 1,1 0,-380";

export function Mandala({
  size = 360,
  dayOfPeriod = 0,
  totalDays = 14,
  todayPlanet = "saturn",
  showLatin = true,
  showHands = true,
  className,
}: MandalaProps) {
  // Compute needle endpoint based on today planet position.
  const planet = PLANETS.find((p) => p.id === todayPlanet) ?? PLANETS[6];
  if (!planet) {
    throw new Error("Mandala planets list is empty");
  }
  const angle = Math.atan2(planet.cx - 230, 230 - planet.cy);
  const tipR = 76;
  const tipX = 230 + tipR * Math.sin(angle);
  const tipY = 230 - tipR * Math.cos(angle);
  const oppositeX = 230 - tipR * Math.sin(angle);
  const oppositeY = 230 + tipR * Math.cos(angle);

  return (
    <svg
      viewBox="0 0 460 460"
      width={size}
      height={size}
      className={className}
      style={{ filter: "drop-shadow(0 0 24px rgba(212, 175, 82, 0.18))" }}
    >
      <defs>
        <radialGradient id="cosmos-bg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#1a2042" stopOpacity="0.7" />
          <stop offset="60%" stopColor="#11172e" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#0a0e1f" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="sun-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f0d480" stopOpacity="1" />
          <stop offset="50%" stopColor="#d4af52" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#a8853a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="moon-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#dde6f0" stopOpacity="1" />
          <stop offset="60%" stopColor="#b8c8e0" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#b8c8e0" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="gold-stroke" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#d4af52" />
          <stop offset="50%" stopColor="#f0d480" />
          <stop offset="100%" stopColor="#a8853a" />
        </linearGradient>
      </defs>

      <circle cx="230" cy="230" r="220" fill="url(#cosmos-bg)" />

      {/* Outer ring */}
      <circle cx="230" cy="230" r="215" fill="none" stroke="url(#gold-stroke)" strokeWidth="0.6" opacity="0.5" />
      <circle cx="230" cy="230" r="195" fill="none" stroke="#a8853a" strokeWidth="0.4" opacity="0.4" />
      <circle cx="230" cy="230" r="190" fill="none" stroke="#d4af52" strokeWidth="0.5" opacity="0.6" />

      {/* Latin band */}
      {showLatin && (
        <text
          fontFamily="Cinzel, serif"
          fontSize="8"
          fill="#a8853a"
          letterSpacing="3"
          fontWeight="500"
          opacity="0.7"
        >
          <textPath href={`#${TEXT_CIRCLE_ID}`} startOffset="0%">
            ·  VISITA  INTERIORA  TERRAE  ·  RECTIFICANDO  INVENIES  ·
          </textPath>
        </text>
      )}
      <path id={TEXT_CIRCLE_ID} d={TEXT_CIRCLE} fill="none" />

      {/* Cardinal markers */}
      <g fill="#d4af52">
        <circle cx="230" cy="22" r="2.5" />
        <circle cx="438" cy="230" r="2.5" />
        <circle cx="230" cy="438" r="2.5" />
        <circle cx="22" cy="230" r="2.5" />
      </g>

      {/* Planetary ring */}
      <circle cx="230" cy="230" r="170" fill="none" stroke="#a8853a" strokeWidth="0.3" strokeDasharray="1 3" opacity="0.5" />

      {/* Planets */}
      {PLANETS.map((p) => (
        <g key={p.id} transform={`translate(${p.cx} ${p.cy})`}>
          <circle cx="0" cy="0" r={p.r} fill={p.fill} stroke={p.stroke} strokeWidth="0.5" />
          <text
            x="0"
            y="0"
            textAnchor="middle"
            dominantBaseline="central"
            fontFamily="serif"
            fontSize={p.id === "sol" ? "28" : "22"}
            fill={p.id === "saturn" ? "#dde6f0" : p.stroke}
            fontWeight="500"
          >
            {p.glyph}
          </text>
        </g>
      ))}

      {/* Inner geometry */}
      <circle cx="230" cy="230" r="120" fill="none" stroke="#a8853a" strokeWidth="0.3" opacity="0.4" />
      <circle cx="230" cy="230" r="100" fill="none" stroke="#a8853a" strokeWidth="0.3" opacity="0.3" />
      <circle cx="200" cy="200" r="65" fill="none" stroke="#d4af52" strokeWidth="0.4" opacity="0.4" />
      <circle cx="260" cy="200" r="65" fill="none" stroke="#b8c8e0" strokeWidth="0.4" opacity="0.4" />

      {/* IN/OUT hands */}
      {showHands && (
        <>
          <g transform="translate(40, 230)">
            <path
              d="M 0 0 Q 14 -10 26 -5 L 38 -2 Q 48 0 46 7 L 36 10 Q 22 12 10 7 Z"
              fill="none"
              stroke="#d4af52"
              strokeWidth="0.6"
              opacity="0.7"
            />
            <text x="-4" y="3" textAnchor="end" fontFamily="Cinzel, serif" fontSize="8" fill="#a8853a" letterSpacing="1.5" fontWeight="600">
              IN
            </text>
          </g>
          <g transform="translate(420, 230) scale(-1, 1)">
            <path
              d="M 0 0 Q 14 -10 26 -5 L 38 -2 Q 48 0 46 7 L 36 10 Q 22 12 10 7 Z"
              fill="none"
              stroke="#d4af52"
              strokeWidth="0.6"
              opacity="0.7"
            />
            <text x="-4" y="3" textAnchor="end" fontFamily="Cinzel, serif" fontSize="8" fill="#a8853a" letterSpacing="1.5" fontWeight="600">
              OUT
            </text>
          </g>
        </>
      )}

      {/* 8-pointed star (compass rose) */}
      <g>
        <path d="M 230 110 L 238 225 L 230 230 L 222 225 Z" fill="#d4af52" opacity="0.9" />
        <path d="M 230 350 L 238 235 L 230 230 L 222 235 Z" fill="#d4af52" opacity="0.5" />
        <path d="M 110 230 L 225 222 L 230 230 L 225 238 Z" fill="#d4af52" opacity="0.7" />
        <path d="M 350 230 L 235 222 L 230 230 L 235 238 Z" fill="#d4af52" opacity="0.7" />
        <path d="M 152 152 L 222 222 L 230 230 L 222 222 Z" fill="#a8853a" opacity="0.4" />
        <path d="M 308 152 L 238 222 L 230 230 L 238 222 Z" fill="#a8853a" opacity="0.4" />
        <path d="M 152 308 L 222 238 L 230 230 L 222 238 Z" fill="#a8853a" opacity="0.4" />
        <path d="M 308 308 L 238 238 L 230 230 L 238 238 Z" fill="#a8853a" opacity="0.4" />
      </g>

      {/* Compass needle — points to today's planet */}
      <g>
        <line x1="230" y1="230" x2={tipX} y2={tipY} stroke="#c45a3a" strokeWidth="1.8" strokeLinecap="round" />
        <polygon
          points={`${tipX},${tipY} ${tipX - 5},${tipY - 6} ${tipX + 6},${tipY - 3}`}
          fill="#c45a3a"
        />
        <line
          x1="230"
          y1="230"
          x2={oppositeX}
          y2={oppositeY}
          stroke="#8a8770"
          strokeWidth="0.6"
          strokeLinecap="round"
          strokeDasharray="2 3"
          opacity="0.6"
        />
      </g>

      {/* Center hub */}
      <circle cx="230" cy="230" r="14" fill="#0a0e1f" stroke="#d4af52" strokeWidth="0.6" />
      <circle cx="230" cy="230" r="11" fill="none" stroke="#a8853a" strokeWidth="0.4" opacity="0.6" />

      {/* Day readout */}
      {dayOfPeriod > 0 && (
        <>
          <text
            x="230"
            y="223"
            textAnchor="middle"
            fontFamily="Cinzel, serif"
            fontSize="6.5"
            fill="#a8853a"
            letterSpacing="1.5"
            fontWeight="600"
          >
            DAY
          </text>
          <text
            x="230"
            y="237"
            textAnchor="middle"
            fontFamily="Italiana, Cinzel, serif"
            fontSize="16"
            fill="#f0d480"
            fontWeight="500"
          >
            {dayOfPeriod}
          </text>
          <text
            x="230"
            y="248"
            textAnchor="middle"
            fontFamily="JetBrains Mono, monospace"
            fontSize="5.5"
            fill="#8a8770"
          >
            of {totalDays}
          </text>
        </>
      )}

      {/* Moon (bottom) */}
      <g transform="translate(230, 410)">
        <circle cx="0" cy="0" r="14" fill="url(#moon-glow)" />
        <path d="M 0 -10 A 10 10 0 1 0 0 10 A 7 7 0 1 1 0 -10" fill="#0a0e1f" opacity="0.6" />
        <text x="0" y="2" textAnchor="middle" dominantBaseline="central" fontFamily="serif" fontSize="14" fill="#dde6f0">
          ☽
        </text>
      </g>
    </svg>
  );
}

const TEXT_CIRCLE_ID = "mandala-text-circle";
