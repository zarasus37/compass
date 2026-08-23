import * as React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHead } from "@/components/alchemy/PageHead";
import { VesselGlyph } from "@/components/alchemy/VesselGlyph";
import { EnvelopeMiniBar } from "@/components/viz/EnvelopeMiniBar";
import {
  liveEnvelopes,
  liveTransactions,
  TODAY,
  PERIOD_START,
  PERIOD_END,
} from "@/lib/mock";
import { formatMoney, formatMoneySigned } from "@/lib/money";
import { formatShortDate, dayOfPeriod, periodLength } from "@/lib/format";

export const dynamic = "force-dynamic";

/**
 * Envelope detail — Cluster 1.10.
 *
 * The drill-down view for a single envelope. Shows the live data
 * (current / target / per-period / pace) plus the per-envelope
 * transaction list, so the visual (the bar) and the data (the rows)
 * are right next to each other.
 *
 * The pacing line tells the user at a glance whether they're
 * "ahead of pace" (gold tick is left of where the bar fills) or
 * "behind" (right of). The transaction list shows what came in
 * (allocations) and what went out (spends) in the current period.
 */
export default function EnvelopeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = React.use(params);
  const ENVELOPES = liveEnvelopes();
  const TRANSACTIONS = liveTransactions();
  const envelope = ENVELOPES.find((e) => e.id === id);

  if (!envelope) {
    notFound();
  }

  const e = envelope;
  const pct = e.target > 0 ? Math.min((e.current / e.target) * 100, 100) : 0;
  const isOver = e.current > e.target && e.target > 0;
  const overage = isOver ? e.current - e.target : 0;
  const pacing = {
    day: dayOfPeriod(TODAY, PERIOD_START, PERIOD_END),
    total: periodLength(PERIOD_START, PERIOD_END),
  };
  const pacingPct = (pacing.day / pacing.total) * 100;
  const expectedAtPace = e.target * (pacingPct / 100);
  const onTrack = e.current <= expectedAtPace;
  const diff = e.current - expectedAtPace;

  // Filter transactions for this envelope
  const txForEnv = TRANSACTIONS.filter((t) => t.envelope === e.id);
  // Compute totals
  const totalIn = txForEnv
    .filter((t) => t.amountCents > 0)
    .reduce((s, t) => s + t.amountCents, 0);
  const totalOut = txForEnv
    .filter((t) => t.amountCents < 0)
    .reduce((s, t) => s + Math.abs(t.amountCents), 0);
  const txCount = txForEnv.length;

  return (
    <div>
      <PageHead
        eyebrow={`Money · Envelopes · ${e.name}`}
        title={e.name}
        em="one vessel, in full."
        accent="jupiter"
        actions={
          <Link
            href="/envelopes"
            style={{
              fontFamily: "var(--font-cinzel), serif",
              background: "transparent",
              color: "var(--ink-2)",
              border: "1px solid var(--line)",
              borderRadius: 2,
              padding: "10px 16px",
              fontSize: 10.5,
              fontWeight: 500,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              textDecoration: "none",
            }}
          >
            ← All envelopes
          </Link>
        }
        explanation={
          <>
            The single vessel for {e.name}. The bar shows current versus target, the gold tick is where you should be by day {pacing.day} of {pacing.total}. The transactions below are everything that's hit this envelope this period — what's come in (allocations, refunds) and what's gone out (spends).
          </>
        }
      />

      {/* Stat strip */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 0,
          border: "1px solid var(--line)",
          background: "var(--surface)",
          marginBottom: 32,
        }}
      >
        <Stat
          label="Current"
          value={formatMoney(e.current)}
          sub={`${Math.round(pct)}% of target`}
          accent={isOver ? "neg" : undefined}
        />
        <Stat
          label="Target"
          value={formatMoney(e.target)}
          sub={`this period`}
        />
        <Stat
          label="Expected now"
          value={formatMoney(Math.round(expectedAtPace))}
          sub={`pacing day ${pacing.day} of ${pacing.total}`}
        />
        <Stat
          label={onTrack ? "On pace" : isOver ? "Over" : "Ahead of pace"}
          value={
            isOver
              ? `+${formatMoney(overage)}`
              : `${formatMoneySigned(Math.round(-diff))}`
          }
          sub={
            isOver
              ? "over the target"
              : onTrack
              ? "tracking well"
              : "ahead of the gold tick"
          }
          accent={isOver ? "neg" : onTrack ? "ok" : undefined}
        />
      </section>

      {/* The big bar — chart next to data. */}
      <section style={{ marginBottom: 48 }}>
        <SectionHeader
          title="The vessel"
          em="current vs target."
          meta="Gold tick = pacing (where you should be)."
        />
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 4,
            padding: "32px 36px",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "60px 1fr",
              gap: 24,
              alignItems: "center",
              marginBottom: 24,
            }}
          >
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                background: "var(--cosmos)",
                border: `1px solid var(--${e.planet ?? "ink-2"})`,
                boxShadow: `0 0 12px var(--${e.planet ?? "ink-2"})`,
              }}
            >
              <VesselGlyph planet={e.planet} size={32} />
            </div>
            <div>
              <div
                style={{
                  fontFamily: "var(--font-cinzel), serif",
                  fontSize: 10.5,
                  color: `var(--${e.planet ?? "ink-3"})`,
                  letterSpacing: "0.28em",
                  textTransform: "uppercase",
                  marginBottom: 4,
                }}
              >
                {planetName(e.planet)} · {e.target > 0 ? "funding target" : "no target"}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-italiana), var(--font-cinzel), serif",
                  fontSize: 36,
                  color: isOver ? "var(--neg)" : "var(--ink)",
                  lineHeight: 1,
                }}
              >
                {formatMoney(e.current)}
              </div>
            </div>
          </div>
          {/* Custom bar with pacing tick — bigger than the row version. */}
          <div
            style={{
              position: "relative",
              height: 28,
              background: "var(--cosmos)",
              border: "1px solid var(--line-soft)",
              borderRadius: 3,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: 0,
                width: `${Math.min(100, pct)}%`,
                background: isOver
                  ? "repeating-linear-gradient(45deg, var(--neg) 0px, var(--neg) 6px, transparent 6px, transparent 12px)"
                  : `linear-gradient(90deg, var(--${e.planet ?? "ink-2"}) 0%, var(--${e.planet ?? "ink-2"}) 100%)`,
                opacity: isOver ? 0.55 : 0.9,
                boxShadow: `0 0 12px var(--${e.planet ?? "ink-2"})`,
              }}
            />
            {/* Pacing tick */}
            <div
              style={{
                position: "absolute",
                top: -4,
                bottom: -4,
                left: `${Math.min(100, pacingPct)}%`,
                width: 3,
                background: "var(--gold)",
                boxShadow: "0 0 8px var(--gold)",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: 4,
                left: `${Math.min(100, pacingPct) - 2}%`,
                transform: "translateX(-50%)",
                width: 0,
                height: 0,
                borderLeft: "5px solid transparent",
                borderRight: "5px solid transparent",
                borderTop: "6px solid var(--gold)",
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 10,
              color: "var(--ink-3)",
              marginTop: 10,
            }}
          >
            <span>$0</span>
            <span style={{ color: "var(--gold)" }}>
              ◆ day {pacing.day} of {pacing.total} (pace)
            </span>
            <span>{formatMoney(e.target)}</span>
          </div>
        </div>
      </section>

      {/* Transaction list — chart next to data, the rows ARE the data
          the bar visualizes. */}
      <section style={{ marginBottom: 48 }}>
        <SectionHeader
          title="Activity"
          em={`this period.`}
          meta={`${txCount} transaction${txCount === 1 ? "" : "s"} · ${formatMoney(totalIn)} in, ${formatMoney(totalOut)} out`}
        />
        {txForEnv.length === 0 ? (
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: 4,
              padding: "40px 32px",
              textAlign: "center",
              fontFamily: "var(--font-cormorant), serif",
              fontStyle: "italic",
              fontSize: 15,
              color: "var(--ink-3)",
            }}
          >
            Nothing has hit this vessel yet this period.
          </div>
        ) : (
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: 4,
              overflow: "hidden",
            }}
          >
            {txForEnv.map((t, i) => {
              const kind = t.source === "allocation"
                ? "Allocation"
                : t.isIncome
                ? "Refund"
                : "Spend";
              return (
              <div
                key={t.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 120px 140px",
                  alignItems: "center",
                  gap: 20,
                  padding: "16px 24px",
                  borderBottom: i < txForEnv.length - 1 ? "1px solid var(--line-soft)" : "none",
                }}
              >
                <div>
                  <div
                    style={{
                      fontFamily: "var(--font-italiana), var(--font-cinzel), serif",
                      fontSize: 16,
                      color: "var(--ink)",
                      lineHeight: 1.2,
                    }}
                  >
                    {t.payee}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-cormorant), serif",
                      fontStyle: "italic",
                      fontSize: 12.5,
                      color: "var(--ink-3)",
                      marginTop: 4,
                    }}
                  >
                    {kind} · {formatShortDate(t.date)}
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-cinzel), serif",
                    fontSize: 9.5,
                    color:
                      t.amountCents > 0
                        ? "var(--ok)"
                        : "var(--ink-3)",
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                    textAlign: "right",
                  }}
                >
                  {t.amountCents > 0 ? "in" : "out"}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-italiana), var(--font-cinzel), serif",
                    fontSize: 18,
                    color: t.amountCents > 0 ? "var(--ok)" : "var(--ink)",
                    textAlign: "right",
                    fontFeatureSettings: '"tnum" 1',
                  }}
                >
                  {formatMoneySigned(t.amountCents)}
                </div>
              </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Edit / actions */}
      <section>
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 4,
            padding: "24px 28px",
            display: "flex",
            alignItems: "center",
            gap: 20,
          }}
        >
          <div style={{ flex: 1 }}>
            <p
              style={{
                fontFamily: "var(--font-cormorant), serif",
                fontStyle: "italic",
                fontSize: 15,
                color: "var(--ink-2)",
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              You can adjust the target any time. The bar above updates immediately — the plan runs on the new number the next time a paycheck lands.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <Link
              href="/transactions/new"
              style={{
                fontFamily: "var(--font-cinzel), serif",
                background: "var(--gold)",
                color: "var(--void)",
                border: 0,
                borderRadius: 2,
                padding: "10px 18px",
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                textDecoration: "none",
              }}
            >
              + Log a transaction
            </Link>
            <Link
              href={`/envelopes/${e.id}/edit`}
              style={{
                fontFamily: "var(--font-cinzel), serif",
                background: "transparent",
                color: "var(--ink-2)",
                border: "1px solid var(--line)",
                borderRadius: 2,
                padding: "10px 18px",
                fontSize: 10,
                fontWeight: 500,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                textDecoration: "none",
              }}
            >
              Edit
            </Link>
            <Link
              href={`/envelopes/${e.id}/edit-target`}
              style={{
                fontFamily: "var(--font-cinzel), serif",
                background: "transparent",
                color: "var(--ink-2)",
                border: "1px solid var(--line)",
                borderRadius: 2,
                padding: "10px 18px",
                fontSize: 10,
                fontWeight: 500,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                textDecoration: "none",
              }}
            >
              Edit target
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: "ok" | "warn" | "neg";
}) {
  const color =
    accent === "neg"
      ? "var(--neg)"
      : accent === "warn"
      ? "var(--warn)"
      : accent === "ok"
      ? "var(--ok)"
      : "var(--ink)";
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
          fontSize: 22,
          lineHeight: 1,
          color,
          fontFeatureSettings: '"tnum" 1',
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontFamily: "var(--font-cormorant), serif",
          fontStyle: "italic",
          fontSize: 12.5,
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
        marginBottom: 20,
        paddingBottom: 14,
        borderBottom: "1px solid var(--line)",
      }}
    >
      <h2
        style={{
          fontFamily: "var(--font-italiana), var(--font-cinzel), serif",
          fontWeight: 400,
          fontSize: 26,
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
            fontFamily: "var(--font-cormorant), serif",
            fontStyle: "italic",
            fontSize: 12.5,
            color: "var(--ink-3)",
          }}
        >
          {meta}
        </div>
      )}
    </div>
  );
}

function planetName(planet: string | null | undefined): string {
  const names: Record<string, string> = {
    sol: "Sol · Rent",
    luna: "Luna · Groceries",
    mars: "Mars · Buffer",
    mercury: "Mercury · Utilities",
    jupiter: "Jupiter · Savings",
    venus: "Venus · Joy",
    saturn: "Saturn · Debt",
  };
  return (planet && names[planet]) || "Envelope";
}
