/**
 * SpendingTrendsCard — last-N-days top expenses (Cluster 7.29).
 *
 * Two-column ranked list on /insights:
 *   - Left  (40%): "By envelope" — top 5 envelopes by total spend
 *   - Right (60%): "By payee" — top 10 merchants by total spend
 *
 * Pure presentational. The aggregation runs server-side via
 * `loadSpendingTrends`. No client-side fetch — the data is passed
 * in as a prop so SSR renders the full card without a hydration
 * gap.
 *
 * Component Oracle Terminal treatment: Sora title, JetBrains Mono
 * for amounts, mono caps headers with // prefix. Reuses
 * `var(--vessel-*)` design tokens. Renders the planet glyph next
 * to each envelope row via `VesselGlyph`.
 *
 * No fake timestamps. No fake amounts. The `pending_no_expenses`
 * status renders honestly ("no expenses logged yet — start
 * logging").
 */

import * as React from "react";
import { formatMoneyCompact, formatMoneySigned } from "@/lib/money";
import {
  VesselGlyph,
  PLANET_COLORS,
  type PlanetId,
} from "@/components/alchemy/VesselGlyph";
import type {
  SpendingTrends,
  SpendingTrendBucket,
  PayeeTrendBucket,
} from "@/lib/forecast/spending-trends";

export interface SpendingTrendsCardProps {
  data: SpendingTrends;
  /** Override the destination link (defaults to /transactions). */
  href?: string;
}

const MAX_TOP_ENVELOPES = 5;
const MAX_TOP_PAYEES = 10;

export function SpendingTrendsCard({
  data,
  href = "/transactions",
}: SpendingTrendsCardProps) {
  const isPending = data.status === "pending_no_expenses";

  // Honest pending state — no fake data, no fake total.
  if (isPending) {
    return (
      <section
        data-testid="spending-trends-card"
        data-status={data.status}
        style={{
          background: "var(--vessel-surface)",
          border: "1px solid var(--vessel-border)",
          borderRadius: 4,
          padding: 24,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 6,
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 10.5,
              fontWeight: 600,
              color: "var(--vessel-accent)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            <span style={{ color: "var(--ink-4)" }}>//</span> spend ·{" "}
            {data.windowDays}d
          </div>
          <span
            data-testid="spending-trends-pill"
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 9.5,
              fontWeight: 600,
              color: "var(--ink-3)",
              letterSpacing: "0.16em",
              textTransform: "uppercase",
            }}
          >
            [OK] NO DATA
          </span>
        </div>
        <h3
          style={{
            fontFamily: "var(--font-sora)",
            fontSize: 22,
            fontWeight: 600,
            margin: "0 0 8px",
            color: "var(--ink)",
            letterSpacing: "-0.005em",
          }}
        >
          Top expenses, last {data.windowDays} days
        </h3>
        <p
          data-testid="spending-trends-empty"
          style={{
            fontFamily: "var(--font-sora)",
            fontSize: 13.5,
            color: "var(--ink-3)",
            marginBottom: 0,
            lineHeight: 1.5,
          }}
        >
          No expenses logged in the last {data.windowDays} days. Use the{" "}
          <span style={{ color: "var(--vessel-accent)" }}>+</span> button
          in the top bar, or visit{" "}
          <a
            href={href}
            style={{ color: "var(--vessel-accent)", textDecoration: "underline" }}
          >
            {href}
          </a>{" "}
          to add one.
        </p>
      </section>
    );
  }

  // Trim to the displayed N.
  const envList = data.byEnvelope.slice(0, MAX_TOP_ENVELOPES);
  const payeeList = data.byPayee.slice(0, MAX_TOP_PAYEES);

  return (
    <section
      data-testid="spending-trends-card"
      data-status={data.status}
      data-window-days={data.windowDays}
      data-window-start={data.windowStart}
      data-window-end={data.windowEnd}
      data-total-spent-cents={data.totalSpentCents}
      data-transaction-count={data.transactionCount}
      style={{
        background: "var(--vessel-surface)",
        border: "1px solid var(--vessel-border)",
        borderRadius: 4,
        padding: 24,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 6,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 10.5,
            fontWeight: 600,
            color: "var(--vessel-accent)",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}
        >
          <span style={{ color: "var(--ink-4)" }}>//</span> spend ·{" "}
          {data.windowDays}d
        </div>
        <span
          data-testid="spending-trends-pill"
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 9.5,
            fontWeight: 600,
            color: "var(--vessel-accent)",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
          }}
        >
          [OK] LAST {data.windowDays}D
        </span>
      </div>
      <h3
        style={{
          fontFamily: "var(--font-sora)",
          fontSize: 22,
          fontWeight: 600,
          margin: "0 0 4px",
          color: "var(--ink)",
          letterSpacing: "-0.005em",
        }}
      >
        Top expenses, last {data.windowDays} days
      </h3>
      <p
        style={{
          fontFamily: "var(--font-sora)",
          fontSize: 13.5,
          color: "var(--ink-3)",
          margin: "0 0 18px",
          lineHeight: 1.5,
        }}
      >
        Ranked by where the money went. Window:{" "}
        <span
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 12,
            color: "var(--ink-2)",
          }}
        >
          {data.windowStart} → {data.windowEnd}
        </span>
        . Total spent:{" "}
        <span
          data-testid="spending-trends-total"
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 13,
            color: "var(--vessel-accent)",
            fontWeight: 600,
          }}
        >
          −{formatMoneyCompact(data.totalSpentCents)}
        </span>{" "}
        across {data.transactionCount} transaction
        {data.transactionCount === 1 ? "" : "s"}.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 3fr",
          gap: 24,
        }}
      >
        {/* By envelope */}
        <div data-testid="spending-trends-by-envelope">
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
            <span style={{ color: "var(--ink-4)" }}>//</span> by envelope
          </div>
          {envList.length === 0 ? (
            <p
              data-testid="spending-trends-by-envelope-empty"
              style={{
                fontFamily: "var(--font-sora)",
                fontSize: 12,
                color: "var(--ink-3)",
                padding: "12px 0",
              }}
            >
              No expenses linked to an envelope.
            </p>
          ) : (
            <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
              {envList.map((b, i) => (
                <RankedEnvelopeRow
                  key={b.envelopeId ?? "uncategorized"}
                  rank={i + 1}
                  bucket={b}
                  totalSpentCents={data.totalSpentCents}
                />
              ))}
            </ul>
          )}
        </div>

        {/* By payee */}
        <div data-testid="spending-trends-by-payee">
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
            <span style={{ color: "var(--ink-4)" }}>//</span> by payee
          </div>
          {payeeList.length === 0 ? (
            <p
              data-testid="spending-trends-by-payee-empty"
              style={{
                fontFamily: "var(--font-sora)",
                fontSize: 12,
                color: "var(--ink-3)",
                padding: "12px 0",
              }}
            >
              No payees in the window.
            </p>
          ) : (
            <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
              {payeeList.map((b, i) => (
                <RankedPayeeRow
                  key={b.payee}
                  rank={i + 1}
                  bucket={b}
                  totalSpentCents={data.totalSpentCents}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

function RankedEnvelopeRow({
  rank,
  bucket,
  totalSpentCents,
}: {
  rank: number;
  bucket: SpendingTrendBucket;
  totalSpentCents: number;
}) {
  const pct =
    totalSpentCents > 0
      ? Math.round((bucket.totalCents / totalSpentCents) * 100)
      : 0;
  const planetColor = bucket.planet
    ? PLANET_COLORS[bucket.planet as PlanetId]
    : "var(--ink-3)";
  return (
    <li
      data-testid={`spending-row-env-${bucket.envelopeId ?? "uncategorized"}`}
      data-rank={rank}
      data-total-cents={bucket.totalCents}
      data-transaction-count={bucket.transactionCount}
      data-pct={pct}
      style={{
        display: "grid",
        gridTemplateColumns: "20px 1fr auto auto",
        gap: 10,
        alignItems: "center",
        padding: "8px 0",
        borderBottom: "1px solid var(--vessel-border)",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 10,
          color: "var(--ink-4)",
          textAlign: "right",
        }}
      >
        {rank}.
      </span>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          minWidth: 0,
        }}
      >
        <span
          aria-hidden
          style={{
            display: "inline-block",
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: planetColor,
            flex: "0 0 auto",
          }}
        />
        {bucket.planet && (
          <VesselGlyph planet={bucket.planet} size={12} />
        )}
        <span
          style={{
            fontFamily: "var(--font-sora)",
            fontSize: 13,
            color: "var(--ink)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {bucket.name}
        </span>
      </span>
      <span
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 12,
          color: "var(--ink)",
          fontFeatureSettings: '"tnum" 1, "zero" 1',
          textAlign: "right",
        }}
      >
        {formatMoneySigned(-bucket.totalCents)}
      </span>
      <span
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 10,
          color: "var(--ink-3)",
          letterSpacing: "0.04em",
          minWidth: 40,
          textAlign: "right",
        }}
      >
        {pct}%
      </span>
    </li>
  );
}

function RankedPayeeRow({
  rank,
  bucket,
  totalSpentCents,
}: {
  rank: number;
  bucket: PayeeTrendBucket;
  totalSpentCents: number;
}) {
  const pct =
    totalSpentCents > 0
      ? Math.round((bucket.totalCents / totalSpentCents) * 100)
      : 0;
  return (
    <li
      data-testid={`spending-row-payee-${bucket.payee.replace(/\s+/g, "_")}`}
      data-rank={rank}
      data-total-cents={bucket.totalCents}
      data-transaction-count={bucket.transactionCount}
      data-pct={pct}
      style={{
        display: "grid",
        gridTemplateColumns: "20px 1fr auto auto auto",
        gap: 10,
        alignItems: "center",
        padding: "8px 0",
        borderBottom: "1px solid var(--vessel-border)",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 10,
          color: "var(--ink-4)",
          textAlign: "right",
        }}
      >
        {rank}.
      </span>
      <span
        style={{
          fontFamily: "var(--font-sora)",
          fontSize: 13,
          color: "var(--ink)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {bucket.payee}
      </span>
      <span
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 10,
          color: "var(--ink-3)",
          minWidth: 36,
          textAlign: "right",
        }}
      >
        {bucket.transactionCount} tx
      </span>
      <span
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 12,
          color: "var(--ink)",
          fontFeatureSettings: '"tnum" 1, "zero" 1',
          textAlign: "right",
        }}
      >
        {formatMoneySigned(-bucket.totalCents)}
      </span>
      <span
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 10,
          color: "var(--ink-3)",
          letterSpacing: "0.04em",
          minWidth: 40,
          textAlign: "right",
        }}
      >
        {pct}%
      </span>
    </li>
  );
}
