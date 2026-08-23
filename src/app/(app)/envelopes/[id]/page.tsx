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
 * Component Oracle Terminal treatment: Sora title, JetBrains Mono for
 * amounts and dates, mono caps labels with // prefix, primary CTA in
 * terminal-cyan. The big bar with the gold pacing tick is preserved
 * (semantic — pacing is a key datum). The vessel-glyph big circle
 * gets a 2px planet-color left rail.
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

  const txForEnv = TRANSACTIONS.filter((t) => t.envelope === e.id);
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
        eyebrow={`// money · envelopes · ${e.name.toLowerCase()}`}
        title={e.name}
        em="one vessel, in full."
        accent={e.planet ? "jupiter" : "cyan"}
        actions={
          <Link
            href="/envelopes"
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              background: "transparent",
              color: "var(--ink-2)",
              border: "1px solid var(--line)",
              borderRadius: 2,
              padding: "10px 16px",
              fontSize: 10.5,
              fontWeight: 600,
              letterSpacing: "0.16em",
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
          label="current"
          value={formatMoney(e.current)}
          sub={`${Math.round(pct)}% of target`}
          accent={isOver ? "neg" : undefined}
        />
        <Stat label="target" value={formatMoney(e.target)} sub="this period" />
        <Stat
          label="expected now"
          value={formatMoney(Math.round(expectedAtPace))}
          sub={`pacing day ${pacing.day} of ${pacing.total}`}
        />
        <Stat
          label={onTrack ? "on pace" : isOver ? "over" : "ahead of pace"}
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
            borderLeft: `2px solid var(--${e.planet ?? "ink-2"})`,
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
                borderRadius: 2,
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
                  fontFamily: "var(--font-jetbrains), monospace",
                  fontSize: 10.5,
                  fontWeight: 600,
                  color: `var(--${e.planet ?? "ink-3"})`,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  marginBottom: 4,
                }}
              >
                <span style={{ color: "var(--ink-4)" }}>//</span> {planetName(e.planet)} · {e.target > 0 ? "FUNDING TARGET" : "NO TARGET"}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-jetbrains), monospace",
                  fontSize: 32,
                  fontWeight: 600,
                  color: isOver ? "var(--neg)" : "var(--ink)",
                  lineHeight: 1,
                  fontFeatureSettings: '"tnum" 1, "zero" 1',
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
                background: "var(--terminal-cyan)",
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
              fontWeight: 600,
              color: "var(--ink-3)",
              marginTop: 10,
              letterSpacing: "0.10em",
              textTransform: "uppercase",
            }}
          >
            <span>$0</span>
            <span style={{ color: "var(--gold)" }}>
              ◆ DAY {pacing.day} / {pacing.total} (PACE)
            </span>
            <span>{formatMoney(e.target)}</span>
          </div>
        </div>
      </section>

      <section style={{ marginBottom: 48 }}>
        <SectionHeader
          title="Activity"
          em="this period."
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
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 13,
              color: "var(--ink-3)",
              letterSpacing: "0.04em",
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
                      fontFamily: "var(--font-sora)",
                      fontSize: 15,
                      fontWeight: 500,
                      color: "var(--ink)",
                      lineHeight: 1.2,
                    }}
                  >
                    {t.payee}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-jetbrains), monospace",
                      fontSize: 11,
                      color: "var(--ink-3)",
                      marginTop: 4,
                      letterSpacing: "0.04em",
                    }}
                  >
                    {kind.toUpperCase()} · {formatShortDate(t.date)}
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-jetbrains), monospace",
                    fontSize: 10,
                    fontWeight: 700,
                    color:
                      t.amountCents > 0
                        ? "var(--ok)"
                        : "var(--ink-3)",
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    textAlign: "right",
                  }}
                >
                  {t.amountCents > 0 ? "[+] IN" : "[−] OUT"}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-jetbrains), monospace",
                    fontSize: 16,
                    fontWeight: 500,
                    color: t.amountCents > 0 ? "var(--ok)" : "var(--ink)",
                    textAlign: "right",
                    fontFeatureSettings: '"tnum" 1, "zero" 1',
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
                fontFamily: "var(--font-sora)",
                fontSize: 14,
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
                fontFamily: "var(--font-jetbrains), monospace",
                background: "var(--terminal-cyan)",
                color: "var(--void)",
                border: 0,
                borderRadius: 2,
                padding: "10px 18px",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                textDecoration: "none",
                boxShadow: "0 0 16px rgba(45, 212, 191, 0.3)",
              }}
            >
              + Log a transaction
            </Link>
            <Link
              href={`/envelopes/${e.id}/edit`}
              style={{
                fontFamily: "var(--font-jetbrains), monospace",
                background: "transparent",
                color: "var(--ink-2)",
                border: "1px solid var(--line)",
                borderRadius: 2,
                padding: "10px 18px",
                fontSize: 10,
                fontWeight: 600,
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
                fontFamily: "var(--font-jetbrains), monospace",
                background: "transparent",
                color: "var(--ink-2)",
                border: "1px solid var(--line)",
                borderRadius: 2,
                padding: "10px 18px",
                fontSize: 10,
                fontWeight: 600,
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
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 9.5,
          fontWeight: 600,
          color: "var(--ink-3)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          marginBottom: 10,
        }}
      >
        <span style={{ color: "var(--ink-4)" }}>//</span> {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 22,
          fontWeight: 600,
          lineHeight: 1,
          color,
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
          marginTop: 6,
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
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <span
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 9.5,
            fontWeight: 600,
            color: "var(--terminal-cyan)",
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
            fontSize: 22,
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
              fontSize: 15,
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
