import * as React from "react";
import { PageHead } from "@/components/alchemy/PageHead";
import { formatMoney } from "@/lib/money";
import { detectSubscriptions, type DetectedSubscription } from "@/lib/detect-subscriptions";

export const dynamic = "force-dynamic";

/**
 * Subscriptions — recurring charges, detected from real transactions.
 *
 * Cluster 2.x (must-have utilities): the user wants "subscription &
 * bill detection" — automated systems flag recurring patterns. We
 * ship the detection now: the `detectSubscriptions` engine scans the
 * live transaction history for payees that hit the same amount at
 * regular intervals (every 14 / 30 / 31 days) and surfaces them
 * here. Each row is either "active" (last used within 30 days) or
 * "review" (60+ days since last use).
 *
 * Component Oracle Terminal treatment: mono caps, venus accent,
 * terminal CTA.
 */
export default function SubscriptionsPage() {
  const SUBS: DetectedSubscription[] = detectSubscriptions();
  const active = SUBS.filter((s) => s.status === "active");
  const review = SUBS.filter((s) => s.status === "review");
  const totalActive = active.reduce((s, x) => s + x.amount, 0);
  const totalReview = review.reduce((s, x) => s + x.amount, 0);
  const recoverable = totalReview;

  return (
    <div>
      <PageHead
        eyebrow="// money · subscriptions"
        title="Subscriptions"
        em="the small charges that add up."
        accent="venus"
        explanation={
          <>
            Every recurring charge Compass can detect in your transaction history, in one place. Detection looks for payees hitting the same amount at regular intervals (14 / 30 / 31 days). Active ones are billed to the vessel you assigned. Review ones haven't been used in over 60 days — your call whether to keep or kill them. The recoverable total is the money you'd save by canceling everything in review.
          </>
        }
      />

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
    </div>
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
