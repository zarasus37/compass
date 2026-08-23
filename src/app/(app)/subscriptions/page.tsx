import * as React from "react";
import { PageHead } from "@/components/alchemy/PageHead";
import { formatMoney } from "@/lib/money";

const SUBS = [
  { id: "s1", name: "Spectrum Internet",      amount: 75_00,  lastUsed: "in use",   status: "active" as const },
  { id: "s2", name: "NYTimes",                amount: 17_00,  lastUsed: "63 days",  status: "review" as const },
  { id: "s3", name: "Headspace",              amount: 12_99,  lastUsed: "78 days",  status: "review" as const },
  { id: "s4", name: "iCloud+ 200GB",          amount: 2_99,   lastUsed: "in use",   status: "active" as const },
  { id: "s5", name: "ChatGPT Plus",           amount: 20_00,  lastUsed: "in use",   status: "active" as const },
  { id: "s6", name: "Spotify",                amount: 10_99,  lastUsed: "in use",   status: "active" as const },
];

export default function SubscriptionsPage() {
  const total = SUBS.reduce((s, x) => s + x.amount, 0);
  const recoverable = SUBS.filter((x) => x.status === "review").reduce((s, x) => s + x.amount, 0);
  return (
    <div>
      <PageHead
        eyebrow="// money · subscriptions"
        title="Subscriptions"
        em="the small charges that add up."
        accent="venus"
        explanation={
          <>
            Every recurring charge Compass can see, in one place. Active ones are billed to the vessel you assigned. Review ones haven't been used in over 60 days — your call whether to keep or kill them. Recoverable total is the money you'd save if you canceled everything in review.
          </>
        }
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0, border: "1px solid var(--line)", background: "var(--surface)", marginBottom: 32 }}>
        <StatCell label="active" value={SUBS.filter((s) => s.status === "active").length.toString()} sub="billed this period" />
        <StatCell label="review" value={SUBS.filter((s) => s.status === "review").length.toString()} sub="60+ days unused" accent="warn" />
        <StatCell label="recoverable" value={formatMoney(recoverable)} sub="if you cancel the reviews" accent="ok" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 0, background: "var(--surface)", border: "1px solid var(--line)" }}>
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
              <div style={{ fontFamily: "var(--font-jetbrains), monospace", fontSize: 10.5, color: "var(--ink-3)", marginTop: 2, letterSpacing: "0.04em" }}>
                LAST USED · {s.lastUsed}
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
    </div>
  );
}

function StatCell({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: "warn" | "ok" }) {
  return (
    <div style={{ padding: "20px 24px", borderRight: "1px solid var(--line-soft)" }}>
      <div style={{ fontFamily: "var(--font-jetbrains), monospace", fontSize: 9.5, fontWeight: 600, color: "var(--ink-3)", letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 8 }}>
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
