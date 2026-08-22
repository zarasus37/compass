import * as React from "react";
import { PageHead } from "@/components/alchemy/PageHead";
import { liveGoals, liveTransactions, NEXT_PAY_DATE, TODAY } from "@/lib/mock";
import { formatShortDate } from "@/lib/format";
import { VesselGlyph, type PlanetId } from "@/components/alchemy/VesselGlyph";

export const dynamic = "force-dynamic";

/**
 * Calendar — articulated deep page.
 * The almanac. Month view with paydays, goal targets, and a moon
 * phase panel. The day-of-week header carries a planetary glyph
 * (subtle visual reference — never labeled in copy).
 */
export default function CalendarPage() {
  const GOALS = liveGoals();
  const TRANSACTIONS = liveTransactions();
  // Mock: showing September 2025 with current period dates
  const month = "September";
  const year = 2025;
  const firstDay = 1; // Sep 1, 2025 was a Monday
  const daysInMonth = 30;

  // Paydays for this period (mock): Sep 4, Sep 18
  const paydays = [4, 18];
  // Goal target date: Sep 26 (from GOALS)
  const goalTarget = 26;
  // Today marker
  const today = 22;

  return (
    <div>
      <PageHead
        eyebrow="Overview · Calendar"
        title="The Calendar"
        em={`${month} ${year}.`}
        accent="luna"
        explanation={
          <>
            Every pay period, every goal target, every transaction has a date. This is the whole month on one page. Paydays are gold. Goal targets are purple. Today is silver. The little dots are days with transactions — they're the rhythm of your spending. Click any day to see what happened.
          </>
        }
      />

      <section
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 4,
          padding: 32,
          marginBottom: 56,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: 6,
          }}
        >
          {(["sol", "luna", "mars", "mercury", "jupiter", "venus", "saturn"] as PlanetId[]).map(
            (p, i) => (
              <div
                key={i}
                style={{
                  textAlign: "center",
                  fontFamily: "var(--font-cinzel), serif",
                  fontSize: 10,
                  color: "var(--ink-3)",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  padding: "8px 0 12px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <span style={{ color: "var(--gold)", fontSize: 14, lineHeight: 1 }}>
                  {<VesselGlyph planet={p} size={14} />}
                </span>
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][i]}
              </div>
            ),
          )}

          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const isPayday = paydays.includes(day);
            const isGoal = day === goalTarget;
            const isToday = day === today;
            const date = new Date(year, 8, day);
            const txCount = TRANSACTIONS.filter(
              (t) => t.date.getMonth() === date.getMonth() && t.date.getDate() === date.getDate(),
            ).length;
            return (
              <div
                key={i}
                style={{
                  aspectRatio: "1",
                  border: `1px solid ${
                    isToday
                      ? "var(--luna)"
                      : isPayday
                      ? "var(--gold)"
                      : isGoal
                      ? "var(--jupiter)"
                      : "var(--line-soft)"
                  }`,
                  background: isToday
                    ? "radial-gradient(circle, rgba(184, 200, 224, 0.18), transparent 80%)"
                    : isPayday
                    ? "radial-gradient(circle, rgba(212, 175, 82, 0.18), transparent 80%)"
                    : isGoal
                    ? "radial-gradient(circle, rgba(154, 122, 192, 0.15), transparent 80%)"
                    : "var(--cosmos)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 2,
                  fontFamily: "var(--font-jetbrains), monospace",
                  fontSize: 13,
                  color: isToday
                    ? "var(--luna)"
                    : isPayday
                    ? "var(--gold-glow)"
                    : "var(--ink-2)",
                  position: "relative",
                  boxShadow:
                    isPayday
                      ? "0 0 12px rgba(212, 175, 82, 0.2)"
                      : isToday
                      ? "0 0 12px rgba(184, 200, 224, 0.2)"
                      : "none",
                  fontWeight: 500,
                }}
              >
                {isPayday && (
                  <span
                    style={{
                      fontSize: 8,
                      color: "var(--gold)",
                      letterSpacing: 0,
                    }}
                  >
                    PAY
                  </span>
                )}
                {isGoal && (
                  <span
                    style={{
                      fontSize: 8,
                      color: "var(--jupiter)",
                      letterSpacing: 0,
                    }}
                  >
                    GOAL
                  </span>
                )}
                {day}
                {txCount > 0 && (
                  <div
                    style={{
                      display: "flex",
                      gap: 2,
                      marginTop: 2,
                    }}
                  >
                    {Array.from({ length: Math.min(txCount, 4) }, (_, j) => (
                      <div
                        key={j}
                        style={{
                          width: 3,
                          height: 3,
                          borderRadius: "50%",
                          background:
                            isPayday
                              ? "var(--gold)"
                              : isToday
                              ? "var(--luna)"
                              : "var(--ink-3)",
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div
          style={{
            display: "flex",
            gap: 24,
            marginTop: 24,
            paddingTop: 20,
            borderTop: "1px solid var(--line-soft)",
            fontFamily: "var(--font-cormorant), serif",
            fontSize: 14,
            color: "var(--ink-3)",
            flexWrap: "wrap",
          }}
        >
          <Legend swatch="var(--gold)" label="Payday (2 this month)" />
          <Legend swatch="var(--jupiter)" label="Goal target · Emergency Fund" />
          <Legend swatch="var(--luna)" label="Today" />
          <Legend dot label="Day with transactions" />
        </div>
      </section>

      {/* Moon phase panel */}
      <section>
        <SectionHeader title="Moon" em="the month's counsel." />
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 4,
            padding: 32,
            display: "flex",
            alignItems: "center",
            gap: 32,
          }}
        >
          <svg width="80" height="80" viewBox="0 0 80 80">
            <defs>
              <radialGradient id="mp-glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#dde6f0" stopOpacity="1" />
                <stop offset="60%" stopColor="#b8c8e0" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#b8c8e0" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx="40" cy="40" r="32" fill="url(#mp-glow)" />
            <circle cx="40" cy="40" r="24" fill="#dde6f0" />
            <path d="M 40 16 A 24 24 0 0 1 40 64 A 12 24 0 0 0 40 16" fill="#0a0e1f" opacity="0.85" />
          </svg>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontFamily: "var(--font-cinzel), serif",
                fontSize: 9.5,
                color: "var(--ink-3)",
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              Moon phase
            </div>
            <div
              style={{
                fontFamily: "var(--font-italiana), var(--font-cinzel), serif",
                fontSize: 28,
                color: "var(--ink)",
                marginBottom: 6,
              }}
            >
              First Quarter
            </div>
            <p
              style={{
                fontFamily: "var(--font-cormorant), serif",
                fontSize: 15,
                color: "var(--ink-2)",
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              A good week to make decisions and stick to them. Decisions made in the first quarter tend to carry momentum. The body's vessel fills with light.
            </p>
          </div>
          <div
            style={{
              fontFamily: "var(--font-cinzel), serif",
              fontSize: 10,
              color: "var(--ink-3)",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              textAlign: "right",
            }}
          >
            Next full
            <div
              style={{
                fontFamily: "var(--font-italiana), var(--font-cinzel), serif",
                fontSize: 18,
                color: "var(--ink)",
                marginTop: 6,
              }}
            >
              Sep 12
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Legend({
  swatch,
  label,
  dot,
}: {
  swatch?: string;
  label: string;
  dot?: boolean;
}) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {swatch ? (
        <span
          style={{
            display: "inline-block",
            width: 12,
            height: 12,
            background: `${swatch}33`,
            border: `1px solid ${swatch}`,
          }}
        />
      ) : (
        <span
          style={{
            display: "inline-block",
            width: 4,
            height: 4,
            borderRadius: "50%",
            background: "var(--gold)",
          }}
        />
      )}
      {label}
    </span>
  );
}

function SectionHeader({
  title,
  em,
  meta,
}: {
  title: string;
  em?: string;
  meta?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        marginBottom: 28,
        paddingBottom: 16,
        borderBottom: "1px solid var(--line)",
        position: "relative",
      }}
    >
      <h2
        style={{
          fontFamily: "var(--font-italiana), var(--font-cinzel), serif",
          fontWeight: 400,
          fontSize: 30,
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
              marginLeft: 8,
            }}
          >
            {em}
          </em>
        )}
      </h2>
      {meta && (
        <div
          style={{
            fontFamily: "var(--font-cinzel), serif",
            fontSize: 10,
            color: "var(--ink-3)",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            maxWidth: 380,
            textAlign: "right",
          }}
        >
          {meta}
        </div>
      )}
      <span
        aria-hidden
        style={{
          position: "absolute",
          bottom: -1,
          left: 0,
          width: 80,
          height: 1,
          background: "var(--gold)",
          boxShadow: "0 0 8px var(--gold)",
        }}
      />
    </div>
  );
}
