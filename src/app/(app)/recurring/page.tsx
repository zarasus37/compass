import * as React from "react";
import { PageHead } from "@/components/alchemy/PageHead";
import { formatMoney } from "@/lib/money";
import {
  liveBills,
  TODAY,
  PERIOD_START,
  PERIOD_END,
} from "@/lib/mock";
import { billsDueInPeriod } from "@/lib/store";
import { BillPaidToggle } from "@/components/recurring/BillPaidToggle";
import { formatShortDate } from "@/lib/format";

export const dynamic = "force-dynamic";

/**
 * Recurring bills — articulated deep page (Cluster 1.8).
 *
 * Live data: each bill is in the in-memory store. The page reads the
 * current set on every render and bins them into the active pay period
 * (biweekly, per D17). The "Paid / Unpaid" toggle is a server action
 * that flips `paidAt` on the bill — clicking writes through to the
 * store, the page re-renders, and the calendar + Plan-My-Next-Check
 * panels on the dashboard both pick up the new state.
 *
 * In Cluster 1.6 the "+ Add bill" button gets a real form modal that
 * appends to the bill list; for 1.8 we surface the seed data so the
 * Plan My Next Check + calendar warnings have something to consume.
 */
export default function RecurringPage() {
  const BILLS = liveBills();
  const total = BILLS.reduce((s, b) => s + b.amountCents, 0);

  // Bin each bill to the current pay period
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
    <div>
      <PageHead
        eyebrow="Plan · Recurring bills"
        title="Recurring Bills"
        em="the charges that show up every month."
        accent="mercury"
        actions={
          <button
            type="button"
            style={{
              fontFamily: "var(--font-cinzel), serif",
              background: "var(--gold)",
              color: "var(--void)",
              border: 0,
              borderRadius: 2,
              padding: "12px 22px",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            + Add bill
          </button>
        }
        explanation={
          <>
            The bills that show up on a schedule — rent, internet, subscriptions, debt payments. Compass turns each one into a recurring transaction that lands in the right vessel. The total here is the predictable part of your month. The rest is up to you.
          </>
        }
      />

      {/* Period summary strip */}
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
          label="Total recurring"
          value={formatMoney(total)}
          sub={`${BILLS.length} bills`}
        />
        <SummaryCell
          label="Due this period"
          value={formatMoney(dueCentsThisPeriod + paidCentsThisPeriod)}
          sub={`${dueThisPeriod.length} unpaid · ${paidThisPeriod.length} paid`}
          accent={dueThisPeriod.length > 0 ? "warn" : "ok"}
        />
        <SummaryCell
          label="Period coverage"
          value={`${due.length} of ${BILLS.length}`}
          sub="bills hit this period"
        />
        <SummaryCell
          label="Autopay"
          value={`${BILLS.filter((b) => b.autopay).length} of ${BILLS.length}`}
          sub="set to auto-draft"
        />
      </div>

      {/* DUE THIS PERIOD — actionable */}
      {dueThisPeriod.length > 0 && (
        <BillSection
          title="Due this period"
          em="before your next paycheck."
          accent="warn"
          bills={dueThisPeriod.map((d) => d.bill)}
          dueDates={Object.fromEntries(dueThisPeriod.map((d) => [d.bill.id, d.dueDate]))}
        />
      )}

      {/* PAID THIS PERIOD — confirmation */}
      {paidThisPeriod.length > 0 && (
        <BillSection
          title="Paid this period"
          em="cleared from this paycheck."
          accent="ok"
          bills={paidThisPeriod.map((d) => d.bill)}
          dueDates={Object.fromEntries(paidThisPeriod.map((d) => [d.bill.id, d.dueDate]))}
        />
      )}

      {/* NEXT PERIOD OR LATER */}
      {notThisPeriod.length > 0 && (
        <BillSection
          title="Not this period"
          em="due later this month or next period."
          accent="ink-3"
          bills={notThisPeriod}
          dueDates={{}}
        />
      )}
    </div>
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
  bills: ReturnType<typeof liveBills>;
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
        </h2>
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
                  fontFamily: "var(--font-italiana), var(--font-cinzel), serif",
                  fontSize: 18,
                  color: "var(--ink)",
                  lineHeight: 1.1,
                }}
              >
                {b.name}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-cormorant), serif",
                  fontStyle: "italic",
                  fontSize: 13,
                  color: "var(--ink-3)",
                  marginTop: 4,
                }}
              >
                {b.autopay ? "Autopay on" : "Manual pay"} · Due day {b.dueDay}
                {dueDates[b.id] && ` · ${formatShortDate(dueDates[b.id]!)}`}
              </div>
            </div>
            <div
              style={{
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 13,
                color: "var(--ink-3)",
              }}
            >
              {b.paidAt ? "Paid" : "Unpaid"}
            </div>
            <div
              style={{
                fontFamily: "var(--font-italiana), var(--font-cinzel), serif",
                fontSize: 18,
                color: "var(--ink)",
                textAlign: "right",
                fontFeatureSettings: '"tnum" 1',
              }}
            >
              {formatMoney(b.amountCents)}
            </div>
            <div
              style={{
                fontFamily: "var(--font-cinzel), serif",
                fontSize: 9.5,
                color: accentColor,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                textAlign: "right",
              }}
            >
              {b.paidAt
                ? formatShortDate(new Date(b.paidAt))
                : `Day ${b.dueDay}`}
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
          fontSize: 26,
          lineHeight: 1,
          color:
            accent === "warn"
              ? "var(--warn)"
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
