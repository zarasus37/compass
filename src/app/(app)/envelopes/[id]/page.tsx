import * as React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHead } from "@/components/alchemy/PageHead";
import { VesselGlyph, type PlanetId } from "@/components/alchemy/VesselGlyph";
import { EnvelopeMiniBar } from "@/components/viz/EnvelopeMiniBar";
import { EnvelopeCadenceChart } from "@/components/viz/EnvelopeCadenceChart";
import { SinkList } from "@/components/envelopes/SinkList";
import { AddSinkForm } from "@/components/envelopes/AddSinkForm";
import { ensureUserSinksSeeded, monthlyFillCents } from "@/lib/seed-sinks";
import { recordSectionThrow, SafeSectionFallback } from "@/lib/safe-section";
import { requireUser } from "@/server/auth/user";
import { prisma } from "@/server/db";
import {
  liveEnvelopesFromDb,
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
 *
 * Cluster 7.43 — per-section error boundaries. Each major section
 * is wrapped in its own try/catch so a single bad row (a malformed
 * transaction, a null sink field, a planet-rendering downstream
 * component that doesn't handle null) cannot crash the whole page.
 * A throw in the Cadence section, for example, shows a soft
 * "Section unavailable" card for just that section while the rest
 * of the page renders normally. This is the visible-UI fix for
 * the persistent [ERR] SOMETHING BROKE card xKryptic reported
 * 2026-09-26 (error.digest 3789288087).
 *
 * Cluster 7.42 — defensive planet normalization still applies.
 * `safePlanet` is computed once at the top and threaded through
 * every section so the null-planet case doesn't surface anywhere.
 */

/**
 * SectionErrorFallback — when a section throws, render this instead
 * of letting the error bubble to (app)/error.tsx. The page stays
 * usable; only that section is dimmed. Mirrors the calm-error
 * voice: terminal-orange left rail, monospace caps, no stack
 * trace, no raw error.message exposed to the UI.
 *
 * Cluster 7.52 — aliased to the shared `SafeSectionFallback` in
 * `@/lib/safe-section`. Behavior identical to the prior
 * in-file version; one source of truth for both envelope pages.
 */
const SectionErrorFallback = SafeSectionFallback;

export default async function EnvelopeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  // Cluster 7.33b — read envelope rows from Prisma, not the in-memory
  // mock store. Bug: in production (Vercel serverless), the
  // in-memory store is per-invocation, so fresh requests couldn't
  // see env-* IDs. Same pattern as Cluster 5.2.6 (the `/envelopes`
  // list + dashboard widgets were already on this read path). This
  // page was missed.
  const ENVELOPES = await liveEnvelopesFromDb(user.id);
  const TRANSACTIONS = liveTransactions();
  const envelope = ENVELOPES.find((e) => e.id === id);

  if (!envelope) {
    notFound();
  }

  const e = envelope;

  /**
   * Helper: wrap a section's render in try/catch. Returns a function-
   * shaped renderer so we can keep the page composition linear
   * without losing the per-section isolation. Any error from
   * `render()` is caught and converted to a SectionErrorFallback.
   *
   * Cluster 7.52 — also captures the throw to the ClientError
   * table (source: "server-safe-section") so future reports
   * surface in `npx tsx scripts/show-client-errors.mjs` without
   * needing Vercel logs. Lives inside the page body so the
   * closure captures `id` + `user.id` for the capture context.
   *
   * Function declarations are hoisted within their enclosing
   * function scope, so the call sites below reference this
   * regardless of textual position.
   */
  async function safeSection(
    section: string,
    render: () => React.ReactNode | Promise<React.ReactNode>,
  ): Promise<React.ReactNode> {
    try {
      return await render();
    } catch (err) {
      recordSectionThrow(
        { pathname: `/envelopes/${id}`, envelopeId: id, userId: user.id },
        section,
        err,
      );
      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.error(`[envelope-detail] ${section} section failed:`, err);
      }
      return <SectionErrorFallback section={section} />;
    }
  }

  // Cluster 7.42 — defensive normalization. The Prisma `Envelope.planet`
  // column is nullable, and several downstream components require a
  // non-null PlanetId (or a fallback) to render the vessel glyph, the
  // cadence chart's planet color, etc. Before this normalization, a
  // click on an envelope with planet=null crashed the detail page
  // (error.digest 3789288087, the [ERR] SOMETHING BROKE card). Normalize
  // to "saturn" as the safest default — every other PlanetId mapping in
  // the app has its own meaning (jupiter = strategic, mercury =
  // transactional, etc.) and "saturn" reads as "long-cycle vessel,
  // unknown lineage" which is the right vibe for "mom added this
  // without picking a planet."
  const safePlanet = (e.planet ?? "saturn") as PlanetId;

  // Cluster 7.28 — Sinking funds for this envelope. Lazy-seed
  // the user's first visit, then read the (now populated) list.
  // This is page-level (one-shot) so every section sees the same
  // SINKS row. If the seed or read throws, the sinks section below
  // shows the fallback; the rest of the page stays intact.
  let SINKS: Awaited<ReturnType<typeof prisma.envelopeSink.findMany>> = [];
  try {
    await ensureUserSinksSeeded(user.id);
    SINKS = await prisma.envelopeSink.findMany({
      where: { envelopeId: id, isArchived: false },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
  } catch (err) {
    // Cluster 7.52 — capture to the ClientError table before
    // swallowing. Sinks being empty is non-fatal (the page
    // still renders) but the throw itself is the kind of
    // bug we want to know about without needing Vercel logs.
    recordSectionThrow(
      {
        pathname: `/envelopes/${id}`,
        envelopeId: id,
        userId: user.id,
      },
      "page-sinks-read",
      err,
    );
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.error("[envelope-detail] sinks read failed:", err);
    }
    SINKS = [];
  }

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

  // Per-envelope transaction list. liveTransactions() is the
  // in-memory mock (deferred to a DB reader in 7.41+). Even if a
  // row has a malformed date / payee, the per-row rendering is
  // wrapped in try/catch below.
  const txForEnv = TRANSACTIONS.filter((t) => t.envelope === e.id);
  const totalIn = txForEnv
    .filter((t) => t.amountCents > 0)
    .reduce((s, t) => s + t.amountCents, 0);
  const totalOut = txForEnv
    .filter((t) => t.amountCents < 0)
    .reduce((s, t) => s + Math.abs(t.amountCents), 0);
  const txCount = txForEnv.length;

  // 14-day daily-spend cadence for the chart (Cluster 3.2).
  // Oldest first, today last. Only counts as spend when amountCents < 0
  // (positive amounts are allocations / refunds, not "spend per day").
  const cadenceStart = new Date(TODAY);
  cadenceStart.setDate(cadenceStart.getDate() - 13);
  cadenceStart.setHours(0, 0, 0, 0);
  const burnCents: number[] = Array.from({ length: 14 }, (_, i) => {
    const day = new Date(cadenceStart);
    day.setDate(cadenceStart.getDate() + i);
    return txForEnv
      .filter((t) => {
        if (t.amountCents >= 0) return false;
        const td = new Date(t.date);
        return (
          td.getFullYear() === day.getFullYear() &&
          td.getMonth() === day.getMonth() &&
          td.getDate() === day.getDate()
        );
      })
      .reduce((s, t) => s + Math.abs(t.amountCents), 0);
  });

  // ── Cluster 7.43: per-section error boundaries ────────────────
  // Each section is wrapped in safeSection() so a throw in one
  // section shows a soft fallback for that section only. The page
  // header (PageHead) and the footer actions bar stay unguarded
  // because they don't depend on derived data — if they throw,
  // (app)/error.tsx catches it, which is the right behavior for a
  // totally broken page.
  const statsSection = await safeSection("Stats", () => (
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
  ));

  const vesselSection = await safeSection("Vessel", () => (
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
          borderLeft: `2px solid var(--${safePlanet})`,
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
              border: `1px solid var(--${safePlanet})`,
              boxShadow: `0 0 12px var(--${safePlanet})`,
            }}
          >
            <VesselGlyph planet={safePlanet} size={32} />
          </div>
          <div>
            <div
              style={{
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 10.5,
                fontWeight: 600,
                color: `var(--${safePlanet})`,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                marginBottom: 4,
              }}
            >
              <span style={{ color: "var(--ink-4)" }}>//</span> {planetName(safePlanet)} · {e.target > 0 ? "FUNDING TARGET" : "NO TARGET"}
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
                : `linear-gradient(90deg, var(--${safePlanet}) 0%, var(--${safePlanet}) 100%)`,
              opacity: isOver ? 0.55 : 0.9,
              boxShadow: `0 0 12px var(--${safePlanet})`,
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
  ));

  const cadenceSection = await safeSection("Cadence", () => (
    <section style={{ marginBottom: 48 }}>
      <SectionHeader
        title="Cadence"
        em="last 14 days, by day."
        meta="Match the trend against the transactions below."
      />
      <EnvelopeCadenceChart
        burnCents={burnCents}
        planet={safePlanet}
        envelopeName={e.name}
        startDate={cadenceStart}
      />
    </section>
  ));

  const sinksSection = await safeSection("Sinking funds", () => (
    <section
      style={{ marginBottom: 48 }}
      data-testid="envelope-sinks-section"
    >
      <SectionHeader
        title="Sinking funds"
        em="known-but-irregular expenses inside this vessel."
        meta={`${SINKS.length} sink${SINKS.length === 1 ? "" : "s"} · auto-fill ${formatMoney(SINKS.reduce((s, sn) => s + monthlyFillCents(sn.targetCents, sn.cadence), 0))}/mo`}
      />
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 4,
          padding: SINKS.length > 0 ? 0 : 0,
        }}
      >
        <SinkList
          envelopeId={id}
          sinks={SINKS.map((s) => ({
            id: s.id,
            name: s.name,
            targetCents: s.targetCents,
            cadence: s.cadence,
          }))}
        />
      </div>
      <AddSinkForm envelopeId={id} />
    </section>
  ));

  // Activity section: per-row try/catch so a single malformed
  // transaction can't take down the list. Uses a generator
  // pattern — each row is rendered in isolation, errors fall back
  // to a per-row error chip.
  const activitySection = await safeSection("Activity", () => (
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
            // Per-row try/catch: a malformed row renders a chip
            // rather than crashing the list.
            try {
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
            } catch (rowErr) {
              // Cluster 7.52 — capture per-row throws too. Same
              // context as the section catches, plus the row's
              // own id when available. The dedup key includes
              // the row index so a single bad row's spam is
              // distinguishable from a section's spam.
              recordSectionThrow(
                {
                  pathname: `/envelopes/${id}`,
                  envelopeId: id,
                  userId: user.id,
                },
                `activity-row-${i}-${t?.id ?? "?"}`,
                rowErr,
              );
              return (
                <div
                  key={t.id ?? `bad-${i}`}
                  style={{
                    padding: "12px 24px",
                    background: "var(--surface)",
                    borderBottom: i < txForEnv.length - 1 ? "1px solid var(--line-soft)" : "none",
                    fontFamily: "var(--font-jetbrains), monospace",
                    fontSize: 11,
                    color: "var(--ink-3)",
                  }}
                >
                  [WARN] transaction row couldn&apos;t render
                </div>
              );
            }
          })}
        </div>
      )}
    </section>
  ));

  // Footer action bar: simple Links, low-risk. Kept unguarded
  // because they don't depend on derived data — if they throw,
  // (app)/error.tsx is the right escalation.
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

      {statsSection}
      {vesselSection}
      {cadenceSection}
      {sinksSection}
      {activitySection}

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

// ──────────────────────────────────────────────────────────────────────
// In-file helpers (Stat, SectionHeader, planetName) — Cluster 1.10
// primitives that the page still owns locally rather than moving to
// the components/alchemy directory. Kept here so the section
// refactor in 7.43 doesn't fan out imports.
// ──────────────────────────────────────────────────────────────────────

function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "neg" | "ok" | undefined;
}) {
  return (
    <div
      style={{
        padding: "20px 24px",
        borderRight: "1px solid var(--line)",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 9.5,
          fontWeight: 600,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--ink-3)",
          marginBottom: 8,
        }}
      >
        {label}
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
                : "var(--ink)",
          fontFeatureSettings: '"tnum" 1, "zero" 1',
          letterSpacing: "-0.01em",
        }}
      >
        {value}
      </div>
      {sub ? (
        <div
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 10.5,
            color: "var(--ink-3)",
            marginTop: 4,
            letterSpacing: "0.05em",
          }}
        >
          {sub}
        </div>
      ) : null}
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
    <header
      style={{
        display: "flex",
        alignItems: "baseline",
        justifyContent: "space-between",
        gap: 16,
        marginBottom: 14,
      }}
    >
      <div>
        <h2
          style={{
            fontFamily: "var(--font-sora)",
            fontSize: 17,
            fontWeight: 600,
            color: "var(--ink)",
            margin: 0,
            letterSpacing: "-0.005em",
          }}
        >
          {title}
        </h2>
        {em ? (
          <p
            style={{
              fontFamily: "var(--font-sora)",
              fontSize: 12,
              color: "var(--ink-3)",
              margin: "2px 0 0",
              fontStyle: "italic",
            }}
          >
            {em}
          </p>
        ) : null}
      </div>
      {meta ? (
        <div
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 10,
            color: "var(--ink-3)",
            letterSpacing: "0.06em",
            textAlign: "right",
            maxWidth: 360,
          }}
        >
          {meta}
        </div>
      ) : null}
    </header>
  );
}

function planetName(p: PlanetId): string {
  return p.charAt(0).toUpperCase() + p.slice(1);
}