import * as React from "react";
import Link from "next/link";
import { PageHead } from "@/components/alchemy/PageHead";
import { formatMoney } from "@/lib/money";
import {
  liveBillsFromDb,
  TODAY,
  PERIOD_START,
  PERIOD_END,
} from "@/lib/mock";
import { billsDueInPeriod } from "@/lib/store";
import { BillPaidToggle } from "@/components/recurring/BillPaidToggle";
import { formatShortDate } from "@/lib/format";
import { detectSubscriptions, type DetectedSubscription } from "@/lib/detect-subscriptions";
import { requireUser } from "@/server/auth/user";

export const dynamic = "force-dynamic";

/**
 * Obligations — the merged Recurring + Subscriptions view.
 *
 * Cluster 4.0 (xKryptic 2026-08-25): the old 3-chapter nav had
 * `// Money · Recurring` and `// Money · Subscriptions` as siblings.
 * They were two halves of the same question ("what repeats every
 * month?") — one hand-curated, one detected. The 4-chapter nav
 * collapses both into a single chapter `// LEDGER · Obligations`
 * with two tabs.
 *
 *   ?tab=bills  (default) — Recurring bills (curated list with
 *                          paid/unpaid toggles, due-day timeline)
 *   ?tab=subs            — Detected subscriptions (active vs review)
 *
 * The 308 redirects from /recurring and /subscriptions into the
 * matching tab live in next.config.ts, so old deep links still work.
 *
 * Component Oracle Terminal treatment: mono caps, terminal CTA, OK /
 * WARN status markers. Each tab owns its own stats strip and list.
 */

type TabKey = "bills" | "subs";

export default async function ObligationsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const tab: TabKey = params.tab === "subs" ? "subs" : "bills";
  // Cluster 5.2.6 widget switch: requireUser (not optional) so
  // the page has the userId to scope the Prisma read. The
  // (app) layout already redirects unauthenticated users to /login
  // so this is mostly a TypeScript guard.
  const user = await requireUser();

  return (
    <div>
      <PageHead
        eyebrow="// ledger · obligations"
        title="Obligations"
        em="every repeating charge, in one place."
        accent="cyan"
        actions={
          tab === "bills" ? (
            <Link
              href="/recurring/new"
              style={{
                fontFamily: "var(--font-jetbrains), monospace",
                background: "var(--terminal-cyan)",
                color: "var(--void)",
                border: 0,
                borderRadius: 2,
                padding: "12px 22px",
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                textDecoration: "none",
                boxShadow: "0 0 16px rgba(45, 212, 191, 0.3)",
              }}
            >
              + Add bill
            </Link>
          ) : null
        }
        explanation={
          tab === "bills" ? (
            <>
              The bills that show up on a schedule — rent, internet, debt payments. Compass turns each one into a recurring transaction that lands in the right envelope. The total here is the predictable part of the month.
            </>
          ) : (
            <>
              Every recurring charge Compass can detect in your transaction history, in one place. Detection looks for payees hitting the same amount at regular intervals (14 / 30 / 31 days). Active ones are billed to the vessel you assigned. Review ones haven't been used in over 60 days.
            </>
          )
        }
      />

      <TabSwitcher current={tab} />

      {tab === "bills" ? <BillsTab userId={user.id} /> : <SubsTab />}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Tab switcher — terminal-style segmented control.
// The two tabs are routed via the `tab` query param so deep links work
// and the Back button does the right thing.
// ──────────────────────────────────────────────────────────────────────

function TabSwitcher({ current }: { current: TabKey }) {
  const tabBase: React.CSSProperties = {
    flex: 1,
    padding: "12px 18px",
    textAlign: "center",
    textDecoration: "none",
    fontFamily: "var(--font-jetbrains), monospace",
    fontSize: 10.5,
    fontWeight: 700,
    letterSpacing: "0.20em",
    textTransform: "uppercase",
    transition: "all 140ms",
    cursor: "pointer",
  };
  return (
    <nav
      aria-label="Obligations view"
      style={{
        display: "flex",
        gap: 0,
        border: "1px solid var(--line)",
        borderRadius: 2,
        background: "var(--surface)",
        marginBottom: 24,
        overflow: "hidden",
      }}
    >
      <Link
        href="/obligations?tab=bills"
        aria-current={current === "bills" ? "page" : undefined}
        style={{
          ...tabBase,
          background: current === "bills" ? "var(--cosmos-2)" : "transparent",
          color:
            current === "bills" ? "var(--terminal-cyan)" : "var(--ink-3)",
          borderRight: "1px solid var(--line)",
          borderTop: current === "bills" ? "2px solid var(--terminal-cyan)" : "2px solid transparent",
        }}
      >
        // Bills
      </Link>
      <Link
        href="/obligations?tab=subs"
        aria-current={current === "subs" ? "page" : undefined}
        style={{
          ...tabBase,
          background: current === "subs" ? "var(--cosmos-2)" : "transparent",
          color:
            current === "subs" ? "var(--terminal-cyan)" : "var(--ink-3)",
          borderTop: current === "subs" ? "2px solid var(--terminal-cyan)" : "2px solid transparent",
        }}
      >
        // Subscriptions
      </Link>
    </nav>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Bills tab — direct port of the old /recurring page content.
// Cluster 5.2.6 widget switch: BILLS now come from Prisma (via
// liveBillsFromDb) instead of the in-memory BILLS_SEED. The first
// call lazily seeds the 6 canonical rows (ensureUserBillsSeeded).
// ──────────────────────────────────────────────────────────────────────

/**
 * The shape BillSection + BillsTimeline need from a bill. Both
 * are now DB-shaped (the data comes from liveBillsFromDb which
 * has `cadence` plus everything the legacy `Bill` type had). The
 * two consumers (BillSection + BillsTimeline) only need the
 * subset below — using a structural type here means the
 * `billsDueInPeriod(...)` engine can still return its legacy
 * `Bill[]` for the engine-internal math and we don't have to
 * rewrite the engine.
 */
type BillView = Awaited<ReturnType<typeof liveBillsFromDb>>[number];

async function BillsTab({ userId }: { userId: string }) {
  const BILLS = await liveBillsFromDb(userId);
  const total = BILLS.reduce((s, b) => s + b.amountCents, 0);
  const due = billsDueInPeriod(BILLS, PERIOD_START, PERIOD_END);
  const dueThisPeriod = due.filter((d) => !d.paidThisPeriod);
  const paidThisPeriod = due.filter((d) => d.paidThisPeriod);
  const notThisPeriod = BILLS.filter(
    (b) => !due.some((d) => d.bill.id === b.id),
  );
  const dueCentsThisPeriod = dueThisPeriod.reduce(
    (s, d) => s + d.bill.amountCents,
    0,
  );
  const paidCentsThisPeriod = paidThisPeriod.reduce(
    (s, d) => s + d.bill.amountCents,
    0,
  );

  return (
    <>
      <BillsTimeline bills={BILLS} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 0,
          border: "1px solid var(--line)",
          background: "var(--surface)",
          marginBottom: 32,
        }}
      >
        <SummaryCell
          label="total recurring"
          value={formatMoney(total)}
          sub={`${BILLS.length} bills`}
        />
        <SummaryCell
          label="due this period"
          value={formatMoney(dueCentsThisPeriod + paidCentsThisPeriod)}
          sub={`${dueThisPeriod.length} unpaid · ${paidThisPeriod.length} paid`}
          accent={dueThisPeriod.length > 0 ? "warn" : "ok"}
        />
        <SummaryCell
          label="period coverage"
          value={`${due.length} of ${BILLS.length}`}
          sub="bills hit this period"
        />
        <SummaryCell
          label="autopay"
          value={`${BILLS.filter((b) => b.autopay).length} of ${BILLS.length}`}
          sub="set to auto-draft"
        />
      </div>

      {dueThisPeriod.length > 0 && (
        <BillSection
          title="Due this period"
          em="before your next check."
          accent="warn"
          bills={dueThisPeriod.map((d) => d.bill as BillView)}
          dueDates={Object.fromEntries(dueThisPeriod.map((d) => [d.bill.id, d.dueDate]))}
        />
      )}

      {paidThisPeriod.length > 0 && (
        <BillSection
          title="Paid this period"
          em="cleared from this paycheck."
          accent="ok"
          bills={paidThisPeriod.map((d) => d.bill as BillView)}
          dueDates={Object.fromEntries(paidThisPeriod.map((d) => [d.bill.id, d.dueDate]))}
        />
      )}

      {notThisPeriod.length > 0 && (
        <BillSection
          title="Not this period"
          em="due later this month or next period."
          accent="ink-3"
          bills={notThisPeriod as BillView[]}
          dueDates={{}}
        />
      )}
    </>
  );
}

function BillSection({
  title,
  em,
  accent,
  bills,
  dueDates,
}: {
  title: string;
  em: string;
  accent: "warn" | "ok" | "ink-3";
  bills: BillView[];
  dueDates: Record<string, Date>;
}) {
  const accentColor =
    accent === "warn"
      ? "var(--warn)"
      : accent === "ok"
      ? "var(--ok)"
      : "var(--ink-3)";

  return (
    <section style={{ marginBottom: 48 }}>
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
              fontSize: 24,
              margin: 0,
              color: "var(--ink)",
              letterSpacing: "-0.01em",
            }}
          >
            {title}
          </h2>
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
        </div>
        <span
          aria-hidden
          style={{
            display: "inline-block",
            width: 80,
            height: 1,
            background: accentColor,
            boxShadow: `0 0 8px ${accentColor}`,
          }}
        />
      </div>
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 4,
          overflow: "hidden",
        }}
      >
        {bills.map((b, i) => (
          <div
            key={b.id}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 100px 130px 100px 140px",
              alignItems: "center",
              gap: 20,
              padding: "16px 24px",
              borderBottom:
                i < bills.length - 1 ? "1px solid var(--line-soft)" : "none",
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: "var(--font-sora)",
                  fontSize: 16,
                  fontWeight: 500,
                  color: "var(--ink)",
                  lineHeight: 1.2,
                }}
              >
                {b.name}
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
                {b.autopay ? "AUTOPAY" : "MANUAL"} · DAY {b.dueDay}
                {dueDates[b.id] && ` · ${formatShortDate(dueDates[b.id]!)}`}
              </div>
            </div>
            <div
              style={{
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: b.paidAt ? "var(--ok)" : "var(--ink-2)",
              }}
            >
              {b.paidAt ? "[OK] Paid" : "Unpaid"}
            </div>
            <div
              style={{
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 16,
                color: "var(--ink)",
                textAlign: "right",
                fontFeatureSettings: '"tnum" 1, "zero" 1',
                fontWeight: 500,
              }}
            >
              {formatMoney(b.amountCents)}
            </div>
            <div
              style={{
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 10,
                fontWeight: 600,
                color: accentColor,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                textAlign: "right",
              }}
            >
              {b.paidAt
                ? formatShortDate(new Date(b.paidAt))
                : `DAY ${b.dueDay}`}
            </div>
            <div style={{ textAlign: "right" }}>
              <BillPaidToggle billId={b.id} initialPaid={b.paidAt !== null} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SummaryCell({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: "warn" | "ok";
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
          lineHeight: 1,
          color:
            accent === "warn"
              ? "var(--warn)"
              : accent === "ok"
              ? "var(--ok)"
              : "var(--ink)",
          fontFeatureSettings: '"tnum" 1, "zero" 1',
          fontWeight: 600,
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

function BillsTimeline({ bills }: { bills: BillView[] }) {
  const maxAmount = Math.max(...bills.map((b) => b.amountCents), 1);
  const minR = 4;
  const maxR = 12;

  return (
    <section
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: 4,
        padding: "20px 24px 16px",
        marginBottom: 32,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 10,
            fontWeight: 600,
            color: "var(--terminal-cyan)",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}
        >
          <span style={{ color: "var(--ink-4)" }}>//</span> Due day, month at a glance
        </div>
        <div
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 11,
            color: "var(--ink-3)",
            letterSpacing: "0.02em",
          }}
        >
          Each dot is a bill, sized by amount. Gold tick = today.
        </div>
      </div>
      <svg
        viewBox="0 0 620 80"
        width="100%"
        height="80"
        style={{ display: "block" }}
        role="img"
        aria-label="Bills by due day, sized by amount"
      >
        {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => {
          const x = 20 + ((d - 1) * (580 / 30));
          const showLabel = d === 1 || d === 15 || d === 31 || d % 5 === 0;
          return (
            <g key={d}>
              <line
                x1={x}
                x2={x}
                y1={28}
                y2={66}
                stroke="var(--line-soft)"
                strokeWidth={0.5}
                opacity={0.6}
              />
              {showLabel && (
                <text
                  x={x}
                  y={78}
                  textAnchor="middle"
                  fontFamily="var(--font-jetbrains), monospace"
                  fontSize={7.5}
                  fill="var(--ink-3)"
                  letterSpacing={0.5}
                >
                  {d}
                </text>
              )}
            </g>
          );
        })}
        <line
          x1={20 + ((TODAY.getDate() - 1) * (580 / 30))}
          x2={20 + ((TODAY.getDate() - 1) * (580 / 30))}
          y1={20}
          y2={70}
          stroke="var(--gold)"
          strokeWidth={1.2}
          strokeDasharray="2 2"
          opacity={0.7}
        />
        <text
          x={20 + ((TODAY.getDate() - 1) * (580 / 30))}
          y={14}
          textAnchor="middle"
          fontFamily="var(--font-jetbrains), monospace"
          fontSize={7}
          fill="var(--gold)"
          letterSpacing={1}
        >
          NOW
        </text>
        {bills.map((b) => {
          const day = Math.min(31, Math.max(1, b.dueDay));
          const x = 20 + ((day - 1) * (580 / 30));
          const r = minR + (maxR - minR) * Math.sqrt(b.amountCents / maxAmount);
          const isPaid = b.paidAt !== null;
          return (
            <g key={b.id}>
              <circle
                cx={x}
                cy={46}
                r={r}
                fill={isPaid ? "var(--ok)" : "var(--mercury)"}
                opacity={isPaid ? 0.7 : 0.95}
                stroke={isPaid ? "var(--ok)" : "var(--terminal-cyan-dim)"}
                strokeWidth={0.5}
              />
              <title>{`${b.name} · day ${b.dueDay} · ${formatMoney(b.amountCents)}${isPaid ? " · paid" : ""}`}</title>
            </g>
          );
        })}
      </svg>
    </section>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Subscriptions tab — direct port of the old /subscriptions content.
// ──────────────────────────────────────────────────────────────────────

function SubsTab() {
  const SUBS: DetectedSubscription[] = detectSubscriptions();
  const active = SUBS.filter((s) => s.status === "active");
  const review = SUBS.filter((s) => s.status === "review");
  const totalActive = active.reduce((s, x) => s + x.amount, 0);
  const totalReview = review.reduce((s, x) => s + x.amount, 0);
  const recoverable = totalReview;

  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr 1fr",
          gap: 0,
          border: "1px solid var(--line)",
          background: "var(--surface)",
          marginBottom: 32,
        }}
      >
        <StatCell label="detected" value={SUBS.length.toString()} sub="from transactions" />
        <StatCell label="active" value={active.length.toString()} sub="billed this period" />
        <StatCell label="review" value={review.length.toString()} sub="60+ days unused" accent="warn" />
        <StatCell
          label="recoverable"
          value={formatMoney(recoverable)}
          sub="if you cancel the reviews"
          accent="ok"
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 0,
          background: "var(--surface)",
          border: "1px solid var(--line)",
        }}
      >
        {SUBS.length === 0 && (
          <div
            style={{
              padding: 32,
              textAlign: "center",
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 12,
              color: "var(--ink-3)",
              letterSpacing: "0.04em",
            }}
          >
            [OK] No recurring patterns detected yet. Add more transactions and we'll surface them.
          </div>
        )}
        {SUBS.map((s, i) => (
          <div
            key={s.id}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 120px 140px 160px",
              gap: 24,
              alignItems: "center",
              padding: "14px 24px",
              borderBottom: i < SUBS.length - 1 ? "1px solid var(--line-soft)" : "none",
            }}
          >
            <div>
              <div style={{ fontFamily: "var(--font-sora)", fontSize: 16, color: "var(--ink)", fontWeight: 500 }}>
                {s.name}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-jetbrains), monospace",
                  fontSize: 10.5,
                  color: "var(--ink-3)",
                  marginTop: 2,
                  letterSpacing: "0.04em",
                }}
              >
                {s.status === "review"
                  ? `LAST USED · ${s.lastUsedDays} days ago`
                  : "LAST USED · in use"}{" · "}
                <span style={{ color: "var(--venus)" }}>DETECTED</span>
              </div>
            </div>
            <div
              style={{
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 18,
                color: "var(--ink)",
                textAlign: "right",
                fontFeatureSettings: '"tnum" 1, "zero" 1',
                fontWeight: 500,
              }}
            >
              {formatMoney(s.amount)}
            </div>
            <div
              style={{
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 10,
                fontWeight: 700,
                color: s.status === "review" ? "var(--warn)" : "var(--ok)",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                textAlign: "right",
              }}
            >
              {s.status === "review" ? "[WARN] Review" : "[OK] Active"}
            </div>
            <div style={{ textAlign: "right" }}>
              {s.status === "review" ? (
                <button
                  type="button"
                  style={{
                    fontFamily: "var(--font-jetbrains), monospace",
                    background: "transparent",
                    color: "var(--warn)",
                    border: "1px solid var(--warn)",
                    borderRadius: 2,
                    padding: "5px 10px",
                    fontSize: 9.5,
                    fontWeight: 700,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
              ) : (
                <button
                  type="button"
                  style={{
                    fontFamily: "var(--font-jetbrains), monospace",
                    background: "transparent",
                    color: "var(--ink-3)",
                    border: "1px solid var(--line)",
                    borderRadius: 2,
                    padding: "5px 10px",
                    fontSize: 9.5,
                    fontWeight: 600,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                  }}
                >
                  Edit
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: 16,
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 10,
          color: "var(--ink-4)",
          letterSpacing: "0.04em",
          textAlign: "right",
        }}
      >
        {SUBS.length > 0 && (
          <>
            TOTAL MONTHLY · {formatMoney(totalActive + totalReview)} ·
            ACTIVE {formatMoney(totalActive)} · REVIEW {formatMoney(totalReview)}
          </>
        )}
      </div>
    </>
  );
}

function StatCell({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: "warn" | "ok";
}) {
  return (
    <div style={{ padding: "20px 24px", borderRight: "1px solid var(--line-soft)" }}>
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
          fontSize: 24,
          fontWeight: 600,
          color: accent === "warn" ? "var(--warn)" : accent === "ok" ? "var(--ok)" : "var(--ink)",
          fontFeatureSettings: '"tnum" 1, "zero" 1',
        }}
      >
        {value}
      </div>
      <div style={{ fontFamily: "var(--font-jetbrains), monospace", fontSize: 10.5, color: "var(--ink-3)", marginTop: 4, letterSpacing: "0.04em" }}>
        {sub}
      </div>
    </div>
  );
}
