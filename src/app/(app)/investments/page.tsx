import * as React from "react";
import { PageHead } from "@/components/alchemy/PageHead";
import { formatMoney } from "@/lib/money";

const INVESTMENTS = [
  { id: "i1", name: "Vanguard VTI",            type: "ETF",          value: 18_400_00, contrib: 200_00, return: 0.087 },
  { id: "i2", name: "Fidelity 401(k)",         type: "Retirement",   value: 42_800_00, contrib: 400_00, return: 0.114 },
  { id: "i3", name: "Ally HYSA",              type: "Savings",      value: 8_000_00,  contrib: 0,     return: 0.045 },
];

export default function InvestmentsPage() {
  const totalValue = INVESTMENTS.reduce((s, x) => s + x.value, 0);
  const totalContrib = INVESTMENTS.reduce((s, x) => s + x.contrib, 0);
  return (
    <div>
      <PageHead
        eyebrow="Money · Investments"
        title="Investments"
        em="the long-view money."
        accent="jupiter"
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
            + Add holding
          </button>
        }
        explanation={
          <>
            The money you've put away for the long view. Stocks, bonds, ETFs, retirement accounts, high-yield savings — every position with its current value, your contributions, and the return since you started. The Jupiter vessel routes money here. Compounding does the rest.
          </>
        }
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0, border: "1px solid var(--line)", background: "var(--surface)", marginBottom: 32 }}>
        <StatCell label="Total value" value={formatMoney(totalValue)} sub="across all holdings" />
        <StatCell label="Monthly contribution" value={formatMoney(totalContrib)} sub="into Jupiter" accent="gold" />
        <StatCell label="Avg return" value="9.1%" sub="weighted by holding" accent="ok" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 0, background: "var(--surface)", border: "1px solid var(--line)" }}>
        {INVESTMENTS.map((inv, i) => (
          <div
            key={inv.id}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 100px 140px 140px 100px",
              gap: 24,
              alignItems: "center",
              padding: "18px 24px",
              borderBottom: i < INVESTMENTS.length - 1 ? "1px solid var(--line-soft)" : "none",
            }}
          >
            <div>
              <div style={{ fontFamily: "var(--font-cormorant), serif", fontSize: 16, color: "var(--ink)", fontWeight: 500 }}>
                {inv.name}
              </div>
              <div style={{ fontFamily: "var(--font-cormorant), serif", fontStyle: "italic", fontSize: 13, color: "var(--ink-3)", marginTop: 2 }}>
                {inv.type} · {inv.contrib > 0 ? `${formatMoney(inv.contrib)} / paycheck` : "no contribution"}
              </div>
            </div>
            <div
              style={{
                fontFamily: "var(--font-cinzel), serif",
                fontSize: 9.5,
                color: "var(--ink-3)",
                letterSpacing: "0.22em",
                textTransform: "uppercase",
              }}
            >
              Value
            </div>
            <div style={{ fontFamily: "var(--font-italiana), var(--font-cinzel), serif", fontSize: 22, color: "var(--ink)" }}>
              {formatMoney(inv.value)}
            </div>
            <div style={{ fontFamily: "var(--font-italiana), var(--font-cinzel), serif", fontSize: 18, color: "var(--ok)" }}>
              +{(inv.return * 100).toFixed(1)}%
            </div>
            <div style={{ textAlign: "right" }}>
              <button
                type="button"
                style={{
                  fontFamily: "var(--font-cinzel), serif",
                  background: "transparent",
                  color: "var(--ink-3)",
                  border: "1px solid var(--line)",
                  borderRadius: 2,
                  padding: "5px 10px",
                  fontSize: 9.5,
                  fontWeight: 500,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                View
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCell({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: "ok" | "gold" }) {
  return (
    <div style={{ padding: "20px 24px", borderRight: "1px solid var(--line-soft)" }}>
      <div style={{ fontFamily: "var(--font-cinzel), serif", fontSize: 9.5, color: "var(--ink-3)", letterSpacing: "0.22em", textTransform: "uppercase", marginBottom: 8 }}>
        {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-italiana), var(--font-cinzel), serif",
          fontSize: 28,
          color: accent === "ok" ? "var(--ok)" : accent === "gold" ? "var(--gold)" : "var(--ink)",
        }}
      >
        {value}
      </div>
      <div style={{ fontFamily: "var(--font-cormorant), serif", fontStyle: "italic", fontSize: 12, color: "var(--ink-3)", marginTop: 4 }}>
        {sub}
      </div>
    </div>
  );
}
