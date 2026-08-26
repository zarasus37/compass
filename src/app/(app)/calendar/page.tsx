import * as React from "react";
import { PageHead } from "@/components/alchemy/PageHead";
import {
  liveGoals,
  liveTransactions,
  liveBills,
  liveBillsFromDb,
  liveSnapshot,
  NEXT_PAY_DATE,
  TODAY,
  PERIOD_START,
  PERIOD_END,
} from "@/lib/mock";
import { billsDueInPeriod } from "@/lib/store";
import { formatShortDate, formatPeriodRange } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { VesselGlyph, type PlanetId } from "@/components/alchemy/VesselGlyph";
import { requireUser } from "@/server/auth/user";

export const dynamic = "force-dynamic";

/**
 * Calendar — articulated deep page.
 *
 * Component Oracle Terminal treatment: Sora title, JetBrains Mono
 * for amounts, mono caps headers with // prefix. Paydays (gold) and
 * Goal targets (jupiter) preserved as semantic colors. The bills-due
 * warning card uses terminal markers.
 *
 * Cluster 5.2.6 widget switch: BILLS now come from Prisma (the
 * Bill table) instead of the in-memory BILLS_SEED. The first
 * call lazily seeds the 6 canonical rows for the user.
 */
export default async function CalendarPage() {
  const user = await requireUser();
  const GOALS = liveGoals();
  const TRANSACTIONS = liveTransactions();
  const BILLS = await liveBillsFromDb(user.id);
  const SNAPSHOT = liveSnapshot();
  const month = "September";
  const year = 2025;
  const firstDay = 1;
  const daysInMonth = 30;
  const paydays = [4, 18];
  const goalTarget = 26;
  const today = 22;

  const billsDue = billsDueInPeriod(BILLS, PERIOD_START, PERIOD_END);
  const unpaidBills = billsDue.filter((d) => !d.paidThisPeriod);
  const paidBills = billsDue.filter((d) => d.paidThisPeriod);
  const totalBillsCents = billsDue.reduce((s, d) => s + d.bill.amountCents, 0);
  const nextPaycheckCents = SNAPSHOT.nextPaycheckCents;
  const billsExceed = totalBillsCents > nextPaycheckCents;

  return (
    <div>
      <PageHead
        eyebrow="// overview · calendar"
        title="The Calendar"
        em={`${month} ${year}.`}
        accent="cyan"
        explanation={
          <>
            Every pay period, every goal target, every transaction has a date. This is the whole month on one page. Paydays are gold. Goal targets are purple. Today is silver. The little dots are days with transactions — they're the rhythm of your spending. Click any day to see what happened.
          </>
        }
      />

      {billsDue.length > 0 && (
        <section
          style={{
            background: billsExceed
              ? "var(--surface)"
              : "var(--surface)",
            border: "1px solid var(--line)",
            borderLeft: `2px solid ${billsExceed ? "var(--neg)" : "var(--gold)"}`,
            borderRadius: 4,
            padding: "20px 28px",
            marginBottom: 40,
            display: "flex",
            alignItems: "center",
            gap: 20,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 2,
              display: "grid",
              placeItems: "center",
              background: billsExceed ? "rgba(239, 68, 68, 0.10)" : "rgba(201, 164, 92, 0.10)",
              color: billsExceed ? "var(--neg)" : "var(--gold)",
              border: `1px solid ${billsExceed ? "var(--neg)" : "var(--gold)"}`,
              fontSize: 12,
              fontFamily: "var(--font-jetbrains), monospace",
              fontWeight: 700,
              flexShrink: 0,
              lineHeight: 1,
              letterSpacing: "0.04em",
            }}
            aria-hidden
          >
            {billsExceed ? "[WARN]" : "$"}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 9.5,
                fontWeight: 700,
                color: billsExceed ? "var(--neg)" : "var(--gold)",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              <span style={{ color: "var(--ink-4)" }}>//</span>{" "}
              {billsExceed
                ? "Bills exceed this paycheck"
                : `Bills due before your next paycheck`}
            </div>
            <div
              style={{
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 22,
                fontWeight: 600,
                color: "var(--ink)",
                lineHeight: 1.15,
                fontFeatureSettings: '"tnum" 1, "zero" 1',
              }}
            >
              {formatMoney(totalBillsCents)}{" "}
              <span
                style={{
                  fontFamily: "var(--font-jetbrains), monospace",
                  fontWeight: 400,
                  color: "var(--ink-3)",
                  fontSize: 12,
                  letterSpacing: "0.04em",
                }}
              >
                across {billsDue.length} bill{billsDue.length === 1 ? "" : "s"} · {formatPeriodRange(PERIOD_START, PERIOD_END)}
              </span>
            </div>
            <div
              style={{
                fontFamily: "var(--font-sora)",
                fontSize: 13.5,
                color: "var(--ink-2)",
                marginTop: 8,
                lineHeight: 1.5,
              }}
            >
              {billsExceed ? (
                <>
                  That&apos;s more than your next paycheck of {formatMoney(nextPaycheckCents)}. Pull from Buffer or extend the timeline.
                </>
              ) : (
                <>
                  Next paycheck: {formatMoney(nextPaycheckCents)}. {unpaidBills.length} unpaid · {paidBills.length} already cleared for this period.{" "}
                  <a
                    href="/obligations?tab=bills"
                    style={{ color: "var(--gold)", textDecoration: "none", fontWeight: 600 }}
                  >
                    Open Obligations →
                  </a>
                </>
              )}
            </div>
          </div>
        </section>
      )}

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
                  fontFamily: "var(--font-jetbrains), monospace",
                  fontSize: 9.5,
                  fontWeight: 600,
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
                {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][i]}
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
                      ? "var(--gold)"
                      : isPayday
                      ? "var(--gold)"
                      : isGoal
                      ? "var(--jupiter)"
                      : "var(--line-soft)"
                  }`,
                  background: isToday
                    ? "rgba(201, 164, 92, 0.10)"
                    : isPayday
                    ? "rgba(201, 164, 92, 0.05)"
                    : isGoal
                    ? "rgba(196, 181, 253, 0.05)"
                    : "var(--cosmos)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 2,
                  fontFamily: "var(--font-jetbrains), monospace",
                  fontSize: 13,
                  color: isToday
                    ? "var(--gold-glow)"
                    : isPayday
                    ? "var(--gold-glow)"
                    : "var(--ink-2)",
                  position: "relative",
                  fontFeatureSettings: '"tnum" 1',
                  fontWeight: isToday ? 700 : 500,
                }}
              >
                {isPayday && (
                  <span
                    style={{
                      fontSize: 7,
                      color: "var(--gold)",
                      letterSpacing: 0.5,
                      fontWeight: 700,
                    }}
                  >
                    PAY
                  </span>
                )}
                {isGoal && (
                  <span
                    style={{
                      fontSize: 7,
                      color: "var(--jupiter)",
                      letterSpacing: 0.5,
                      fontWeight: 700,
                    }}
                  >
                    GOAL
                  </span>
                )}
                {day}
                {txCount > 0 && (
                  <div style={{ display: "flex", gap: 2, marginTop: 2 }}>
                    {Array.from({ length: Math.min(txCount, 4) }, (_, j) => (
                      <div
                        key={j}
                        style={{
                          width: 3,
                          height: 3,
                          borderRadius: "50%",
                          background: isToday
                            ? "var(--gold)"
                            : isPayday
                            ? "var(--gold)"
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
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 10.5,
            color: "var(--ink-3)",
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            flexWrap: "wrap",
          }}
        >
          <Legend swatch="var(--gold)" label="Payday (2 this month)" />
          <Legend swatch="var(--jupiter)" label="Goal target · Emergency Fund" />
          <Legend swatch="var(--gold)" label="Today" />
          <Legend dot label="Day with transactions" />
        </div>
      </section>

      {/* Moon phase panel */}
      <section>
        <SectionHeader title="Moon" em="the month's counsel." accent="luna" />
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
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 9.5,
                fontWeight: 600,
                color: "var(--ink-3)",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              <span style={{ color: "var(--ink-4)" }}>//</span> Moon phase
            </div>
            <div
              style={{
                fontFamily: "var(--font-sora)",
                fontSize: 24,
                fontWeight: 600,
                color: "var(--ink)",
                marginBottom: 6,
                letterSpacing: "-0.005em",
              }}
            >
              First Quarter
            </div>
            <p
              style={{
                fontFamily: "var(--font-sora)",
                fontSize: 14,
                color: "var(--ink-2)",
                lineHeight: 1.55,
                margin: 0,
              }}
            >
              A good week to make decisions and stick to them. Decisions made in the first quarter tend to carry momentum. The body's vessel fills with light.
            </p>
          </div>
          <div
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 10,
              fontWeight: 600,
              color: "var(--ink-3)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              textAlign: "right",
            }}
          >
            <span style={{ color: "var(--ink-4)" }}>//</span> Next full
            <div
              style={{
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 18,
                fontWeight: 600,
                color: "var(--ink)",
                marginTop: 6,
                fontFeatureSettings: '"tnum" 1',
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
            borderRadius: 1,
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
  accent = "cyan",
}: {
  title: string;
  em?: string;
  meta?: string;
  accent?: "cyan" | "luna" | "gold";
}) {
  const accentColor =
    accent === "luna"
      ? "var(--luna)"
      : accent === "gold"
      ? "var(--gold)"
      : "var(--terminal-cyan)";
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
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <span
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 9.5,
            fontWeight: 600,
            color: accentColor,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}
        >
          <span style={{ color: "var(--ink-4)" }}>//</span>
        </span>
        <h2
          style={{
            fontFamily: "var(--font-sora)",
            fontWeight: 600,
            fontSize: 26,
            letterSpacing: "-0.01em",
            margin: 0,
            color: "var(--ink)",
          }}
        >
          {title}
        </h2>
        {em && (
          <span
            style={{
              fontFamily: "var(--font-sora)",
              fontWeight: 400,
              fontSize: 16,
              color: "var(--ink-3)",
            }}
          >
            {em}
          </span>
        )}
      </div>
      {meta && (
        <div
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 10,
            color: "var(--ink-3)",
            letterSpacing: "0.10em",
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
          background: accentColor,
          boxShadow: `0 0 8px ${accentColor}`,
        }}
      />
    </div>
  );
}
