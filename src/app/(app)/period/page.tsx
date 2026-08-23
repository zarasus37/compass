import * as React from "react";
import { PageHead } from "@/components/alchemy/PageHead";
import { Mandala } from "@/components/alchemy/Mandala";
import { VesselGlyph } from "@/components/alchemy/VesselGlyph";
import {
  TODAY,
  PERIOD_START,
  PERIOD_END,
  NEXT_PAY_DATE,
  liveEnvelopes,
  liveTransactions,
} from "@/lib/mock";
import { formatMoney, formatMoneySigned } from "@/lib/money";
import {
  formatPeriodRange,
  formatShortDate,
  dayOfPeriod,
  periodLength,
  addDays,
  daysBetween,
} from "@/lib/format";

export const dynamic = "force-dynamic";

/**
 * Period — articulated deep page.
 *
 * Component Oracle Terminal treatment: mono caps section headers
 * with // prefix, JetBrains Mono for amounts and the day counter,
 * Sora for section titles and the "days until paycheck" headline.
 * Today highlight in gold (semantic). The Mandala is preserved as
 * the visual centerpiece (it shows the period arc), but with
 * terminal styling around it.
 */
export default function PeriodPage() {
  const ENVELOPES = liveEnvelopes();
  const TRANSACTIONS = liveTransactions();

  const totalDays = periodLength(PERIOD_START, PERIOD_END);
  const day = dayOfPeriod(TODAY, PERIOD_START, PERIOD_END);
  const daysToPay = Math.max(0, daysBetween(TODAY, NEXT_PAY_DATE));
  const daysAfterPay = Math.max(0, daysBetween(NEXT_PAY_DATE, PERIOD_END));
  const totalIncome = TRANSACTIONS.filter((t) => t.amountCents > 0).reduce((s, t) => s + t.amountCents, 0);
  const totalExpense = TRANSACTIONS.filter((t) => t.amountCents < 0).reduce((s, t) => s + t.amountCents, 0);
  const totalDistill = ENVELOPES.reduce((s, e) => s + e.target, 0);
  const projectedBalance = 240_000 - totalDistill;

  return (
    <div>
      <PageHead
        eyebrow={`// period ${Math.ceil((TODAY.getTime() - PERIOD_START.getTime()) / (14 * 86400000)) + 1} of Q3`}
        title="This Period"
        em={`${formatPeriodRange(PERIOD_START, PERIOD_END)}`}
        accent="cyan"
        actions={
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 6,
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 9.5,
                fontWeight: 600,
                color: "var(--ink-3)",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
              }}
            >
              <span style={{ color: "var(--ink-4)" }}>//</span> Day
            </div>
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
                  fontWeight: 600,
                  fontSize: 48,
                  color: "var(--terminal-cyan)",
                  fontFeatureSettings: '"tnum" 1, "zero" 1',
                }}
              >
                {day}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-jetbrains), monospace",
                  fontSize: 18,
                  color: "var(--ink-3)",
                  fontFeatureSettings: '"tnum" 1',
                }}
              >
                of {totalDays}
              </span>
            </div>
          </div>
        }
        explanation={
          <>
            A period is the slice between two paychecks. Everything that happens in this period — every dollar in, every dollar out, every envelope that fills or empties — is what defines your financial life right now. The needle in the compass below points to today. The colors around the rim are the seven envelopes, each with its own direction. The next paycheck is the one event that will refill them all — and you can see exactly how it'll be distributed.
          </>
        }
      />

      {/* Mandala — the full alchemical compass */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1.2fr",
          gap: 64,
          alignItems: "center",
          marginBottom: 80,
          padding: "32px 0",
          borderTop: "1px solid var(--line)",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <div style={{ display: "grid", placeItems: "center" }}>
          <Mandala
            size={420}
            dayOfPeriod={day}
            totalDays={totalDays}
            todayPlanet="saturn"
          />
          <div
            style={{
              marginTop: 12,
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 10,
              fontWeight: 600,
              color: "var(--gold)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            <span style={{ color: "var(--ink-4)" }}>//</span> The compass · day {day} of {totalDays}
          </div>
        </div>
        <div>
          <div
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 10.5,
              fontWeight: 600,
              color: "var(--terminal-cyan)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              marginBottom: 16,
            }}
          >
            <span style={{ color: "var(--ink-4)" }}>//</span> Where the money goes this period
          </div>
          <h3
            style={{
              fontFamily: "var(--font-sora)",
              fontSize: 32,
              margin: "0 0 16px",
              fontWeight: 600,
              lineHeight: 1.15,
              letterSpacing: "-0.01em",
              color: "var(--ink)",
            }}
          >
            {daysToPay} days until the next paycheck
          </h3>
          <p
            style={{
              fontFamily: "var(--font-sora)",
              fontSize: 16,
              lineHeight: 1.55,
              color: "var(--ink-2)",
              margin: "0 0 24px",
            }}
          >
            On <b style={{ color: "var(--ink)" }}>{formatShortDate(NEXT_PAY_DATE)}</b> the paycheck arrives. Then it will be distributed across the seven envelopes according to your active plan — no confirm, no friction. After the distribution, the period continues for {daysAfterPay} more days on what the envelopes can cover.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 0,
              border: "1px solid var(--line)",
              background: "var(--surface)",
            }}
          >
            <PeriodStat label="period income" value={formatMoney(totalIncome)} accent="cyan" sub={`Paycheck ${formatShortDate(TODAY)}`} />
            <PeriodStat label="period spending" value={formatMoneySigned(totalExpense)} sub={`${totalDays - day} days left`} />
            <PeriodStat label="allocated" value={formatMoney(totalDistill)} sub="across 7 envelopes" />
            <PeriodStat label="projected carry" value={formatMoney(projectedBalance)} sub="after next paycheck" accent={projectedBalance < 0 ? "neg" : "ok"} />
          </div>
        </div>
      </section>

      {/* Full allocation breakdown */}
      <section style={{ marginBottom: 64 }}>
        <SectionHeader title="Will be distributed" em="when the next paycheck arrives." />
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 4,
            padding: 4,
          }}
        >
          {ENVELOPES.map((e, i) => {
            const pct = totalDistill > 0 ? Math.round((e.target / totalDistill) * 100) : 0;
            return (
              <div
                key={e.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "44px 1fr 100px 2fr 120px",
                  alignItems: "center",
                  gap: 24,
                  padding: "16px 24px",
                  borderBottom: i < ENVELOPES.length - 1 ? "1px solid var(--line-soft)" : "none",
                  fontSize: 15,
                }}
              >
                <VesselGlyph planet={e.planet} size={24} inCircle />
                <div
                  style={{
                    fontFamily: "var(--font-sora)",
                    fontSize: 16,
                    fontWeight: 500,
                    color: "var(--ink)",
                  }}
                >
                  {e.name}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-jetbrains), monospace",
                    fontSize: 14,
                    color: "var(--ink)",
                    fontFeatureSettings: '"tnum" 1, "zero" 1',
                    fontWeight: 500,
                  }}
                >
                  {formatMoney(e.target)}
                </div>
                <div
                  style={{
                    position: "relative",
                    height: 6,
                    background: "var(--cosmos)",
                    border: "1px solid var(--line-soft)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      inset: "0 auto 0 0",
                      width: `${pct}%`,
                      background: "var(--gold)",
                      boxShadow: "0 0 8px var(--gold)",
                    }}
                  />
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-jetbrains), monospace",
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--ink-3)",
                    letterSpacing: "0.14em",
                    textAlign: "right",
                  }}
                >
                  {pct}%
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Day-by-day timeline */}
      <section style={{ marginBottom: 64 }}>
        <SectionHeader title="Day by day" em="what's happened this period." />
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 4,
            padding: 24,
            display: "grid",
            gridTemplateColumns: "repeat(14, 1fr)",
            gap: 6,
          }}
        >
          {Array.from({ length: totalDays }, (_, i) => {
            const date = addDays(PERIOD_START, i);
            const isToday = i + 1 === day;
            const isPast = i + 1 < day;
            const txCount = TRANSACTIONS.filter((t) => t.date.getTime() === date.getTime()).length;
            return (
              <div
                key={i}
                style={{
                  aspectRatio: "1",
                  border: `1px solid ${isToday ? "var(--gold)" : "var(--line-soft)"}`,
                  background: isToday
                    ? "rgba(201, 164, 92, 0.10)"
                    : isPast
                    ? "var(--cosmos)"
                    : "transparent",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 2,
                  fontSize: 11,
                  fontFamily: "var(--font-jetbrains), monospace",
                  fontFeatureSettings: '"tnum" 1',
                  color: isToday ? "var(--gold)" : isPast ? "var(--ink-2)" : "var(--ink-4)",
                  fontWeight: isToday ? 700 : 500,
                }}
              >
                <div style={{ fontSize: 8, color: "var(--ink-3)" }}>{formatShortDate(date).split(" ")[0]}</div>
                <div>{i + 1}</div>
                {txCount > 0 && (
                  <div
                    style={{
                      width: 4,
                      height: 4,
                      borderRadius: "50%",
                      background: isToday ? "var(--gold)" : "var(--gold-soft)",
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
        <div
          style={{
            display: "flex",
            gap: 24,
            marginTop: 16,
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 10.5,
            color: "var(--ink-3)",
            letterSpacing: "0.10em",
            textTransform: "uppercase",
          }}
        >
          <span>
            <span
              style={{
                display: "inline-block",
                width: 8,
                height: 8,
                background: "var(--gold)",
                borderRadius: "50%",
                marginRight: 6,
                verticalAlign: "middle",
              }}
            />
            Today
          </span>
          <span>
            <span
              style={{
                display: "inline-block",
                width: 4,
                height: 4,
                background: "var(--gold)",
                borderRadius: "50%",
                marginRight: 6,
                verticalAlign: "middle",
              }}
            />
            Has transactions
          </span>
        </div>
      </section>

      {/* Closing balance walk */}
      <section>
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 4,
            padding: 32,
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 9.5,
              fontWeight: 600,
              color: "var(--ink-3)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              marginBottom: 20,
            }}
          >
            <span style={{ color: "var(--ink-4)" }}>//</span> Closing balance · this period
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              fontFamily: "var(--font-sora)",
              fontSize: 16,
              color: "var(--ink-2)",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontFamily: "var(--font-jetbrains), monospace",
                  fontSize: 11,
                  color: "var(--ink-3)",
                  letterSpacing: "0.10em",
                  textTransform: "uppercase",
                }}
              >
                Start
              </div>
              <div
                style={{
                  fontFamily: "var(--font-jetbrains), monospace",
                  fontSize: 22,
                  fontWeight: 600,
                  marginTop: 4,
                  fontFeatureSettings: '"tnum" 1, "zero" 1',
                }}
              >
                {formatMoney(2_400)}
              </div>
            </div>
            <div style={{ flex: 1, textAlign: "center", color: "var(--gold)" }}>→</div>
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontFamily: "var(--font-jetbrains), monospace",
                  fontSize: 11,
                  color: "var(--ok)",
                  letterSpacing: "0.10em",
                  textTransform: "uppercase",
                }}
              >
                + Income
              </div>
              <div
                style={{
                  fontFamily: "var(--font-jetbrains), monospace",
                  fontSize: 22,
                  fontWeight: 600,
                  marginTop: 4,
                  color: "var(--ok)",
                  fontFeatureSettings: '"tnum" 1, "zero" 1',
                }}
              >
                {formatMoney(2_400)}
              </div>
            </div>
            <div style={{ flex: 1, textAlign: "center", color: "var(--mars)" }}>→</div>
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontFamily: "var(--font-jetbrains), monospace",
                  fontSize: 11,
                  color: "var(--mars)",
                  letterSpacing: "0.10em",
                  textTransform: "uppercase",
                }}
              >
                − Spending
              </div>
              <div
                style={{
                  fontFamily: "var(--font-jetbrains), monospace",
                  fontSize: 22,
                  fontWeight: 600,
                  marginTop: 4,
                  color: "var(--mars)",
                  fontFeatureSettings: '"tnum" 1, "zero" 1',
                }}
              >
                {formatMoneySigned(-1_003_78)}
              </div>
            </div>
            <div style={{ flex: 1, textAlign: "center", color: "var(--gold)" }}>→</div>
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontFamily: "var(--font-jetbrains), monospace",
                  fontSize: 11,
                  color: "var(--gold)",
                  letterSpacing: "0.10em",
                  textTransform: "uppercase",
                }}
              >
                Projected
              </div>
              <div
                style={{
                  fontFamily: "var(--font-jetbrains), monospace",
                  fontSize: 28,
                  fontWeight: 700,
                  marginTop: 4,
                  color: "var(--gold)",
                  fontFeatureSettings: '"tnum" 1, "zero" 1',
                }}
              >
                {formatMoney(3_796_22)}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function PeriodStat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: "cyan" | "ok" | "neg" | "gold";
}) {
  return (
    <div
      style={{
        padding: "16px 20px",
        borderRight: "1px solid var(--line-soft)",
        borderBottom: "1px solid var(--line-soft)",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 9.5,
          fontWeight: 600,
          color: "var(--ink-3)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          marginBottom: 8,
        }}
      >
        <span style={{ color: "var(--ink-4)" }}>//</span> {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 22,
          fontWeight: 600,
          color:
            accent === "neg"
              ? "var(--neg)"
              : accent === "ok"
              ? "var(--ok)"
              : accent === "gold"
              ? "var(--gold)"
              : accent === "cyan"
              ? "var(--terminal-cyan)"
              : "var(--ink)",
          fontFeatureSettings: '"tnum" 1, "zero" 1',
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 10.5,
          color: "var(--ink-3)",
          marginTop: 4,
          letterSpacing: "0.04em",
        }}
      >
        {sub}
      </div>
    </div>
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
  const accentColor = "var(--terminal-cyan)";
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
