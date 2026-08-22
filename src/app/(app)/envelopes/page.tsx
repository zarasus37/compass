import * as React from "react";
import { PageHead } from "@/components/alchemy/PageHead";
import { EnvelopeBarChart } from "@/components/alchemy/EnvelopeBarChart";
import { VesselGlyph, type PlanetId } from "@/components/alchemy/VesselGlyph";
import { liveEnvelopes, liveTransactions, TODAY } from "@/lib/mock";
import { formatMoney, formatMoneySigned } from "@/lib/money";
import { formatShortDate, addDays, daysBetween } from "@/lib/format";

export const dynamic = "force-dynamic";

/**
 * Envelopes — articulated deep page.
 * Per 00-DESIGN.md §7: every deep page has a title + explanation
 * block + data + insight. This page is the heart of the daily
 * budgeting experience.
 */
export default function EnvelopesPage() {
  // Live reads: the bar chart and over-limit count reflect the current
  // store state, including any allocations from the paycheck simulator.
  const ENVELOPES = liveEnvelopes();
  const TRANSACTIONS = liveTransactions();
  const overLimit = ENVELOPES.filter((e) => e.current > e.target && e.target > 0);
  const nearLimit = ENVELOPES.filter(
    (e) => e.current <= e.target && e.current >= e.target * 0.85 && e.target > 0,
  );
  const onTrack = ENVELOPES.filter(
    (e) => e.current < e.target * 0.85 || e.target === 0,
  );
  const totalBalance = ENVELOPES.reduce((s, e) => s + e.current, 0);
  const totalTarget = ENVELOPES.reduce((s, e) => s + e.target, 0);

  return (
    <div>
      <PageHead
        eyebrow="Money · Envelopes"
        title="Envelopes"
        em="each with a purpose."
        accent="gold"
        actions={
          <button
            type="button"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontFamily: "var(--font-cinzel), serif",
              background: "var(--gold)",
              color: "var(--void)",
              border: 0,
              borderRadius: 2,
              padding: "12px 22px",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              boxShadow: "0 0 16px rgba(212, 175, 82, 0.3)",
            }}
          >
            + New envelope
          </button>
        }
        explanation={
          <>
            An envelope is a small budget for one part of your life. Seven come with Compass — one for each of the basic areas (rent, groceries, utilities, joy, buffer, savings, debt). You can add more any time. Set a target for each. When the paycheck arrives, money moves in automatically. When you spend, the balance drops. When it hits 85%, the bar turns amber. When it goes over 100%, the bar shows it in iron red — your signal to slow down or adjust the target.
          </>
        }
      />

      {/* Summary strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 0,
          border: "1px solid var(--line)",
          background: "var(--surface)",
          marginBottom: 56,
        }}
      >
        <SummaryCell label="Envelopes" value={ENVELOPES.length.toString()} sub="7 planetary · 0 custom" />
        <SummaryCell
          label="Total balance"
          value={formatMoney(totalBalance)}
          sub={`of ${formatMoney(totalTarget)} target`}
        />
        <SummaryCell
          label="Needs attention"
          value={overLimit.length.toString()}
          sub={overLimit.length === 0 ? "all within target" : "over limit — review"}
          accent={overLimit.length > 0 ? "neg" : "ok"}
        />
        <SummaryCell
          label="On track"
          value={onTrack.length.toString()}
          sub={`${nearLimit.length} near limit`}
        />
      </div>

      {/* The bar chart — same as dashboard, full-width here */}
      <section style={{ marginBottom: 64 }}>
        <SectionHeader
          title="All envelopes"
          em="at a glance."
          meta="Each bar fills to the target. Red hatched = over limit."
        />
        <EnvelopeBarChart envelopes={ENVELOPES} />
      </section>

      {/* Needs attention — over limit envelopes in full detail */}
      {overLimit.length > 0 && (
        <section style={{ marginBottom: 64 }}>
          <SectionHeader
            title="Over limit"
            em="two envelopes need attention."
            accent="mars"
            meta="These spent more than the target. Open the envelope to see recent activity."
          />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            {overLimit.map((e) => (
              <EnvelopeDetail key={e.id} envelope={e} transactions={TRANSACTIONS} />
            ))}
          </div>
        </section>
      )}

      {/* All envelopes — expanded detail */}
      <section style={{ marginBottom: 64 }}>
        <SectionHeader
          title="Every envelope"
          em="with its own story."
          meta="Tap any envelope to see its recent activity, target, and history."
        />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          {ENVELOPES.map((e) => (
            <EnvelopeDetail key={e.id} envelope={e} transactions={TRANSACTIONS} compact />
          ))}
        </div>
      </section>

      {/* Insight at the bottom */}
      <section style={{ marginBottom: 0 }}>
        <div
          style={{
            background:
              "radial-gradient(ellipse at 0% 50%, rgba(196, 90, 58, 0.08) 0%, transparent 60%), var(--surface)",
            border: "1px solid var(--line)",
            borderLeft: "3px solid var(--mars)",
            borderRadius: 4,
            padding: "32px 36px",
            display: "flex",
            alignItems: "center",
            gap: 24,
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-cinzel), serif",
              fontSize: 9.5,
              color: "var(--mars)",
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              writingMode: "vertical-rl",
              transform: "rotate(180deg)",
              padding: "8px 0",
              borderRight: "1px solid var(--line-soft)",
              paddingRight: 18,
              marginRight: 4,
            }}
          >
            Insight
          </div>
          <div style={{ flex: 1 }}>
            <p
              style={{
                fontFamily: "var(--font-cormorant), serif",
                fontSize: 18,
                lineHeight: 1.55,
                color: "var(--ink-2)",
                margin: 0,
              }}
            >
              <span
                style={{
                  color: "var(--ink)",
                  fontWeight: 600,
                }}
              >
                Groceries is at 153%
              </span>{" "}
              — over by {formatMoney(21_200)}. The last 3 weeks of H-E-B transactions averaged $190 per week, so your target of $400 may be set too low. Either{" "}
              <span style={{ color: "var(--gold-glow)", fontWeight: 600 }}>raise the target to $560</span>{" "}
              to match your actual pace, or{" "}
              <span style={{ color: "var(--gold-glow)", fontWeight: 600 }}>tighten spending for the next 5 days</span>{" "}
              and let next paycheck refill it.
            </p>
            <div
              style={{
                display: "flex",
                gap: 12,
                marginTop: 20,
                fontFamily: "var(--font-cinzel), serif",
                fontSize: 10,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
              }}
            >
              <a
                href="#"
                style={{
                  color: "var(--gold)",
                  fontWeight: 600,
                  textDecoration: "none",
                  padding: "8px 16px",
                  border: "1px solid var(--gold-soft)",
                  borderRadius: 2,
                }}
              >
                Raise target to $560
              </a>
              <a
                href="#"
                style={{
                  color: "var(--ink-2)",
                  fontWeight: 500,
                  textDecoration: "none",
                  padding: "8px 16px",
                  border: "1px solid var(--line)",
                  borderRadius: 2,
                }}
              >
                See transactions
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// ---------- Subcomponents ----------

function SummaryCell({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: "ok" | "neg";
}) {
  return (
    <div
      style={{
        padding: "20px 24px",
        borderRight: "1px solid var(--line-soft)",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-cinzel), serif",
          fontSize: 9.5,
          color: "var(--ink-3)",
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          marginBottom: 10,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-italiana), var(--font-cinzel), serif",
          fontSize: 28,
          lineHeight: 1,
          color:
            accent === "neg"
              ? "var(--neg)"
              : accent === "ok"
              ? "var(--ok)"
              : "var(--ink)",
          fontFeatureSettings: '"tnum" 1',
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 10.5,
          color: "var(--ink-3)",
          marginTop: 6,
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
  accent = "gold",
}: {
  title: string;
  em?: string;
  meta?: string;
  accent?: "gold" | "mars" | "jupiter";
}) {
  const accentColor =
    accent === "mars" ? "var(--mars)" : accent === "jupiter" ? "var(--jupiter)" : "var(--gold)";
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
          background: accentColor,
          boxShadow: `0 0 8px ${accentColor}`,
        }}
      />
    </div>
  );
}

function EnvelopeDetail({
  envelope,
  transactions,
  compact = false,
}: {
  envelope: ReturnType<typeof liveEnvelopes>[number];
  transactions: ReturnType<typeof liveTransactions>;
  compact?: boolean;
}) {
  const e = envelope;
  const pct = e.target > 0 ? Math.min((e.current / e.target) * 100, 100) : 0;
  const isOver = e.current > e.target && e.target > 0;
  const daysLeft = Math.max(0, daysBetween(TODAY, addDays(TODAY, 5))); // mock: 5 days left in period
  const recentTx = transactions.filter((t) => t.envelope === e.id).slice(0, compact ? 2 : 3);
  const overage = isOver ? e.current - e.target : 0;

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: 4,
        padding: "24px 28px 22px",
        position: "relative",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 18,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              background: "var(--cosmos)",
              border: "1px solid var(--line)",
              position: "relative",
            }}
          >
            <VesselGlyph planet={e.planet} size={22} />
            <span
              aria-hidden
              style={{
                position: "absolute",
                inset: -3,
                borderRadius: "50%",
                border: "1px dashed var(--line-soft)",
              }}
            />
          </div>
          <div>
            <div
              style={{
                fontFamily: "var(--font-italiana), var(--font-cinzel), serif",
                fontSize: 22,
                color: "var(--ink)",
              }}
            >
              {e.name}
            </div>
            <div
              style={{
                fontFamily: "var(--font-cormorant), serif",
                fontStyle: "italic",
                fontSize: 13,
                color: "var(--ink-3)",
                marginTop: 2,
              }}
            >
              {planetName(e.planet)}
            </div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div
            style={{
              fontFamily: "var(--font-italiana), var(--font-cinzel), serif",
              fontSize: 24,
              color: isOver ? "var(--neg)" : pct >= 0.85 ? "var(--warn)" : "var(--ink)",
              fontFeatureSettings: '"tnum" 1',
            }}
          >
            {formatMoney(e.current)}
          </div>
          <div
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 11,
              color: "var(--ink-3)",
              marginTop: 2,
            }}
          >
            of {formatMoney(e.target)} · {Math.round(pct)}%
          </div>
        </div>
      </div>

      {/* Bar */}
      <div
        style={{
          position: "relative",
          height: 6,
          background: "var(--cosmos)",
          border: "1px solid var(--line-soft)",
          overflow: "hidden",
          marginBottom: 16,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: "0 auto 0 0",
            width: `${pct}%`,
            background: isOver ? "var(--neg)" : pct >= 0.85 ? "var(--warn)" : "var(--ok)",
            boxShadow:
              isOver
                ? "0 0 8px var(--neg)"
                : pct >= 0.85
                ? "0 0 8px var(--warn)"
                : "0 0 8px var(--ok)",
          }}
        />
        {isOver && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "repeating-linear-gradient(45deg, transparent 0, transparent 4px, rgba(6,8,15,0.3) 4px, rgba(6,8,15,0.3) 8px)",
              pointerEvents: "none",
            }}
          />
        )}
      </div>

      {/* Quick stats */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontFamily: "var(--font-cormorant), serif",
          fontSize: 13,
          color: "var(--ink-2)",
          paddingBottom: compact ? 0 : 16,
          borderBottom: compact ? "none" : "1px solid var(--line-soft)",
          marginBottom: compact ? 0 : 16,
        }}
      >
        <span>
          <b style={{ color: "var(--ink)", fontWeight: 600 }}>{daysLeft}</b> days left in period
        </span>
        <span>
          {isOver ? (
            <b style={{ color: "var(--neg)", fontWeight: 600 }}>+{formatMoney(overage)} over</b>
          ) : (
            <b style={{ color: "var(--ok)", fontWeight: 600 }}>{formatMoney(e.target - e.current)} left</b>
          )}
        </span>
      </div>

      {/* Recent activity */}
      {!compact && recentTx.length > 0 && (
        <div>
          <div
            style={{
              fontFamily: "var(--font-cinzel), serif",
              fontSize: 9.5,
              color: "var(--ink-3)",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            Recent activity
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {recentTx.map((t) => (
              <div
                key={t.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: 13,
                  padding: "8px 0",
                  borderBottom: "1px solid var(--line-soft)",
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: "var(--font-cormorant), serif",
                      color: "var(--ink)",
                      fontSize: 14,
                    }}
                  >
                    {t.payee}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-jetbrains), monospace",
                      fontSize: 10.5,
                      color: "var(--ink-3)",
                      marginTop: 2,
                    }}
                  >
                    {formatShortDate(t.date)} {t.isAuto ? "· auto" : ""}
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-jetbrains), monospace",
                    fontSize: 13,
                    color: t.amountCents > 0 ? "var(--gold)" : "var(--ink)",
                    fontFeatureSettings: '"tnum" 1',
                  }}
                >
                  {formatMoneySigned(t.amountCents)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function planetName(planet: PlanetId | null): string {
  switch (planet) {
    case "sol":
      return "the foundation — your fixed costs";
    case "luna":
      return "the daily — what feeds the body";
    case "mars":
      return "the wall — your safety buffer";
    case "mercury":
      return "the wiring — utilities, comms";
    case "jupiter":
      return "the long view — savings, growth";
    case "venus":
      return "the joy — pleasure, beauty, gathering";
    case "saturn":
      return "the debt — past time, paid down";
    default:
      return "custom envelope";
  }
}
