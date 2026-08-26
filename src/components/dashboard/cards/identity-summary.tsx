/**
 * IdentitySummaryCard — the dashboard card that surfaces the
 * onboarding chat's data.
 *
 * Cluster 5.2. Renders a visual-first summary of the user's
 * FinancialIdentity:
 *   - Hero: primary income (e.g. "$1,820 biweekly from Primary")
 *   - Right column: total debts + top goal progress (mini bars)
 *   - Below: 1-3 growth-oriented suggestions (v1 = click-throughs)
 *   - CTA: "Finish onboarding" (incomplete) or "Edit identity" (complete)
 *
 * Visual treatment per the user memory "Visual-first UI for data
 * display" — a single bar showing the income/debt/savings split
 * is the visual centerpiece, not a list of text rows. The
 * suggestions are clickable pills that route to the relevant deep
 * page (v1 of the "headline numbers need growth-oriented
 * suggestions" pattern).
 *
 * When the user has no identity yet, shows a calm "Complete
 * onboarding" empty state (no rows, no numbers).
 */

import Link from "next/link";
import type { IdentitySummary } from "@/lib/identity/identity-summary";

export function IdentitySummaryCard({ data }: { data: IdentitySummary | null }) {
  // Empty state — no identity yet.
  if (!data) {
    return <IdentityEmptyState />;
  }
  // Partial state — identity exists but not completed.
  if (!data.completed) {
    return <IdentityPartialState data={data} />;
  }
  return <IdentityFullView data={data} />;
}

function IdentityEmptyState() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
        padding: "8px 4px 4px",
      }}
    >
      <p
        style={{
          margin: 0,
          fontFamily: "var(--font-sora)",
          fontSize: 14,
          lineHeight: 1.55,
          color: "var(--ink-2, #c8d1dd)",
        }}
      >
        Your dashboard will show what you told the advisor — income, debts, goals — once you complete onboarding.
      </p>
      <Link
        href="/onboarding"
        style={{
          alignSelf: "flex-start",
          padding: "8px 16px",
          background: "var(--vessel-accent)",
          color: "var(--vessel-dark)",
          textDecoration: "none",
          border: "1px solid var(--vessel-accent)",
          borderRadius: 6,
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
        }}
      >
        Start the conversation →
      </Link>
    </div>
  );
}

function IdentityPartialState({ data }: { data: IdentitySummary }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: "8px 4px 4px",
      }}
    >
      {data.primaryIncome?.amountDollars ? (
        <PartialIncomeLine data={data} />
      ) : (
        <p
          style={{
            margin: 0,
            fontFamily: "var(--font-sora)",
            fontSize: 14,
            color: "var(--ink-2, #c8d1dd)",
          }}
        >
          You started onboarding — pick up where you left off.
        </p>
      )}
      <Link
        href="/onboarding"
        style={{
          alignSelf: "flex-start",
          padding: "6px 14px",
          background: "var(--vessel-surface)",
          color: "var(--ink-1, #f5f7fa)",
          textDecoration: "none",
          border: "1px solid var(--vessel-border)",
          borderRadius: 6,
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
        }}
      >
        Resume onboarding →
      </Link>
    </div>
  );
}

function PartialIncomeLine({ data }: { data: IdentitySummary }) {
  const inc = data.primaryIncome!;
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
      <span
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 10,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--ink-3, #a4b1c2)",
        }}
      >
        // partial · income so far
      </span>
      <span
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 18,
          fontWeight: 600,
          color: "var(--ink-1, #f5f7fa)",
        }}
      >
        {formatDollars(inc.amountDollars ?? 0)}
      </span>
      <span
        style={{
          fontFamily: "var(--font-sora)",
          fontSize: 12,
          color: "var(--ink-3, #a4b1c2)",
        }}
      >
        {inc.cadence ?? ""} · {inc.label}
      </span>
    </div>
  );
}

function IdentityFullView({ data }: { data: IdentitySummary }) {
  const inc = data.primaryIncome;
  const hasGoals = data.topGoals.length > 0;
  const hasDebts = data.topDebts.length > 0;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        padding: "4px 4px 4px",
      }}
    >
      {/* Hero row: primary income + visual split bar. */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: 16,
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
          <span
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 10,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--ink-3, #a4b1c2)",
            }}
          >
            // primary income
          </span>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
            <span
              style={{
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 26,
                fontWeight: 700,
                color: "var(--vessel-accent)",
                fontFeatureSettings: '"tnum", "zero"',
              }}
            >
              {formatDollars(inc?.amountDollars ?? 0)}
            </span>
            <span
              style={{
                fontFamily: "var(--font-sora)",
                fontSize: 13,
                color: "var(--ink-2, #c8d1dd)",
              }}
            >
              {inc?.cadence ?? ""}
              {inc?.label ? ` · ${inc.label}` : ""}
            </span>
          </div>
        </div>
        <CashFlowBar
          income={data.totalMonthlyIncomeDollars}
          debt={data.totalMonthlyMinPaymentDollars}
          goals={data.topGoals.reduce(
            (s, g) => s + ((g.perPaycheckDollars ?? 0) * 26) / 12,
            0,
          )}
        />
      </div>

      {/* Secondary row: debts + top goal. */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: hasGoals && hasDebts ? "1fr 1fr" : "1fr",
          gap: 14,
        }}
      >
        {hasDebts ? <DebtsColumn debts={data.topDebts} total={data.totalDebtDollars} /> : null}
        {hasGoals ? <GoalsColumn goals={data.topGoals} /> : null}
      </div>

      {/* Suggestions (growth-oriented, click-throughs). */}
      {data.suggestions.length > 0 ? <SuggestionsColumn suggestions={data.suggestions} /> : null}

      {/* Cluster 5.2.5: projection status footer. Shows how many
          production rows (Account / Bill / Goal) the identity
          was projected into. Visible only when the projection
          actually ran (counts > 0). */}
      {data.projection.accounts + data.projection.bills + data.projection.goals > 0 ? (
        <ProjectionFooter projection={data.projection} />
      ) : null}

      {/* CTA. */}
      <Link
        href={data.ctaHref}
        style={{
          alignSelf: "flex-start",
          marginTop: 2,
          padding: "6px 14px",
          background: "transparent",
          color: "var(--ink-2, #c8d1dd)",
          textDecoration: "none",
          border: "1px solid var(--vessel-border)",
          borderRadius: 6,
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
        }}
      >
        {data.ctaLabel} →
      </Link>
    </div>
  );
}

function ProjectionFooter({
  projection,
}: {
  projection: { accounts: number; bills: number; goals: number };
}) {
  const total = projection.accounts + projection.bills + projection.goals;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "8px 12px",
        background: "var(--vessel-dark)",
        border: "1px solid var(--vessel-border)",
        borderRadius: 6,
        fontFamily: "var(--font-jetbrains), monospace",
        fontSize: 10,
        letterSpacing: "0.06em",
      }}
    >
      <span
        style={{
          background: "var(--vessel-accent-soft)",
          color: "var(--vessel-accent)",
          padding: "2px 8px",
          borderRadius: 3,
          fontWeight: 700,
          fontSize: 9.5,
          letterSpacing: "0.1em",
        }}
      >
        [OK] PROJECTED
      </span>
      <span style={{ color: "var(--ink-2, #c8d1dd)" }}>
        {projection.accounts} acct · {projection.bills} bill · {projection.goals} goal
      </span>
      <span style={{ color: "var(--ink-3, #a4b1c2)", marginLeft: "auto", fontSize: 9.5 }}>
        {total} rows
      </span>
    </div>
  );
}

function CashFlowBar({
  income,
  debt,
  goals,
}: {
  income: number;
  debt: number;
  goals: number;
}) {
  const total = Math.max(1, income);
  const debtPct = Math.min(100, Math.round((debt / total) * 100));
  const goalsPct = Math.min(100, Math.round((goals / total) * 100));
  const freePct = Math.max(0, 100 - debtPct - goalsPct);
  return (
    <div
      aria-label="Monthly cash flow split"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        minWidth: 180,
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 9,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--ink-3, #a4b1c2)",
          textAlign: "right",
        }}
      >
        // cash flow / mo
      </span>
      <div
        style={{
          display: "flex",
          height: 10,
          borderRadius: 4,
          overflow: "hidden",
          border: "1px solid var(--vessel-border)",
          background: "var(--vessel-dark)",
        }}
      >
        <div style={{ width: `${debtPct}%`, background: "var(--vessel-over)" }} />
        <div style={{ width: `${goalsPct}%`, background: "var(--vessel-accent)" }} />
        <div
          style={{ width: `${freePct}%`, background: "var(--ink-3, #a4b1c2)" }}
        />
      </div>
      <div
        style={{
          display: "flex",
          gap: 10,
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 9,
          letterSpacing: "0.04em",
          color: "var(--ink-3, #a4b1c2)",
          justifyContent: "flex-end",
        }}
      >
        <span>debt {debtPct}%</span>
        <span>goals {goalsPct}%</span>
        <span>free {freePct}%</span>
      </div>
    </div>
  );
}

function DebtsColumn({
  debts,
  total,
}: {
  debts: NonNullable<IdentitySummary["topDebts"]>;
  total: number;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: "10px 12px",
        background: "var(--vessel-dark)",
        border: "1px solid var(--vessel-border)",
        borderRadius: 6,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
        <span
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 9.5,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--ink-3, #a4b1c2)",
          }}
        >
          // debt total
        </span>
        <span
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 13,
            fontWeight: 600,
            color: "var(--vessel-over)",
            fontFeatureSettings: '"tnum", "zero"',
          }}
        >
          {formatDollars(total)}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {debts.map((d, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 10.5,
            }}
          >
            <span
              aria-hidden
              style={{
                width: 6,
                height: 6,
                borderRadius: 9999,
                background: "var(--vessel-over)",
                opacity: 0.7,
              }}
            />
            <span style={{ color: "var(--ink-1, #f5f7fa)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {d.label}
            </span>
            <span style={{ color: "var(--ink-2, #c8d1dd)" }}>{formatDollars(d.balanceDollars)}</span>
            <span style={{ color: "var(--ink-3, #a4b1c2)" }}>{d.aprPercent.toFixed(2)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function GoalsColumn({ goals }: { goals: NonNullable<IdentitySummary["topGoals"]> }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: "10px 12px",
        background: "var(--vessel-dark)",
        border: "1px solid var(--vessel-border)",
        borderRadius: 6,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
        <span
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 9.5,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--ink-3, #a4b1c2)",
          }}
        >
          // top goals
        </span>
        <span
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 10,
            color: "var(--ink-3, #a4b1c2)",
          }}
        >
          {goals.length} tracked
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {goals.map((g, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 10.5,
            }}
          >
            <span
              aria-hidden
              style={{
                width: 6,
                height: 6,
                borderRadius: 9999,
                background:
                  g.goalType === "EMERGENCY"
                    ? "var(--vessel-watch)"
                    : g.goalType === "INVEST"
                      ? "var(--jupiter, #c9a45c)"
                      : "var(--vessel-accent)",
                opacity: 0.85,
              }}
            />
            <span
              style={{
                color: "var(--ink-1, #f5f7fa)",
                flex: 1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {g.label}
            </span>
            <span style={{ color: "var(--ink-2, #c8d1dd)" }}>
              {formatDollars(g.targetDollars)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SuggestionsColumn({
  suggestions,
}: {
  suggestions: NonNullable<IdentitySummary["suggestions"]>;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 9.5,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--ink-3, #a4b1c2)",
        }}
      >
        // grow it
      </span>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        {suggestions.map((s, i) => (
          <Link
            key={i}
            href={s.href}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 12px",
              background: "var(--vessel-surface)",
              color: "var(--ink-1, #f5f7fa)",
              textDecoration: "none",
              border: "1px solid var(--vessel-border)",
              borderLeft: `3px solid ${
                s.accent === "vessel-watch"
                  ? "var(--vessel-watch)"
                  : s.accent === "vessel-over"
                    ? "var(--vessel-over)"
                    : "var(--vessel-accent)"
              }`,
              borderRadius: 6,
              transition: "background 0.15s, border-color 0.15s",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 9,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color:
                  s.accent === "vessel-watch"
                    ? "var(--vessel-watch)"
                    : s.accent === "vessel-over"
                      ? "var(--vessel-over)"
                      : "var(--vessel-accent)",
                flexShrink: 0,
              }}
            >
              {s.label}
            </span>
            <span
              style={{
                fontFamily: "var(--font-sora)",
                fontSize: 12.5,
                lineHeight: 1.4,
                flex: 1,
              }}
            >
              {s.text}
            </span>
            <span
              style={{
                color: "var(--ink-3, #a4b1c2)",
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 12,
                flexShrink: 0,
              }}
              aria-hidden
            >
              →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function formatDollars(dollars: number): string {
  return `$${Math.round(dollars).toLocaleString("en-US")}`;
}
