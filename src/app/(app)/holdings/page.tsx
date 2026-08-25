import * as React from "react";
import { PageHead } from "@/components/alchemy/PageHead";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

/**
 * Holdings — long-view money (was /investments, renamed per the
 * Cluster 4.0 site restructure).
 *
 * The rename clarifies the difference between *positions* (what you
 * own: stocks, ETFs, retirement accounts, high-yield savings) and
 * *goals* (what you're saving for, tracked on /goals). Emergency Fund
 * and Invest are now goal types on /goals; the actual positions live
 * here.
 *
 * Component Oracle Terminal treatment: mono caps, jupiter accent,
 * terminal CTA. The 308 redirect from /investments → /holdings is in
 * next.config.ts so the old URL still works as a deep link.
 */

const HOLDINGS = [
  { id: "h1", name: "Vanguard VTI",            type: "ETF",          value: 18_400_00, contrib: 200_00, return: 0.087 },
  { id: "h2", name: "Fidelity 401(k)",         type: "Retirement",   value: 42_800_00, contrib: 400_00, return: 0.114 },
  { id: "h3", name: "Ally HYSA",              type: "Savings",      value: 8_000_00,  contrib: 0,     return: 0.045 },
];

export default function HoldingsPage() {
  const totalValue = HOLDINGS.reduce((s, x) => s + x.value, 0);
  const totalContrib = HOLDINGS.reduce((s, x) => s + x.contrib, 0);
  return (
    <div>
      <PageHead
        eyebrow="// ledger · holdings"
        title="Holdings"
        em="the long-view money."
        accent="jupiter"
        actions={
          <button
            type="button"
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
              cursor: "pointer",
              boxShadow: "0 0 16px rgba(45, 212, 191, 0.3)",
            }}
          >
            + Add holding
          </button>
        }
        explanation={
          <>
            The positions you actually own — stocks, bonds, ETFs, retirement accounts, high-yield savings. Every position with its current value, your contributions, and the return since you started. The Jupiter vessel routes money here when allocation runs. Compounding does the rest.
          </>
        }
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0, border: "1px solid var(--line)", background: "var(--surface)", marginBottom: 32 }}>
        <StatCell label="total value" value={formatMoney(totalValue)} sub="across all holdings" />
        <StatCell label="monthly contribution" value={formatMoney(totalContrib)} sub="into Jupiter" accent="cyan" />
        <StatCell label="avg return" value="9.1%" sub="weighted by holding" accent="ok" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 0, background: "var(--surface)", border: "1px solid var(--line)" }}>
        {HOLDINGS.map((inv, i) => (
          <div
            key={inv.id}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 100px 140px 140px 100px",
              gap: 24,
              alignItems: "center",
              padding: "18px 24px",
              borderBottom: i < HOLDINGS.length - 1 ? "1px solid var(--line-soft)" : "none",
            }}
          >
            <div>
              <div style={{ fontFamily: "var(--font-sora)", fontSize: 16, fontWeight: 500, color: "var(--ink)" }}>
                {inv.name}
              </div>
              <div style={{ fontFamily: "var(--font-jetbrains), monospace", fontSize: 10.5, color: "var(--ink-3)", marginTop: 2, letterSpacing: "0.04em" }}>
                {inv.type.toUpperCase()} · {inv.contrib > 0 ? `${formatMoney(inv.contrib)} / CHECK` : "NO CONTRIBUTION"}
              </div>
            </div>
            <div
              style={{
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 9.5,
                fontWeight: 600,
                color: "var(--ink-3)",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
              }}
            >
              <span style={{ color: "var(--ink-4)" }}>//</span> Value
            </div>
            <div style={{ fontFamily: "var(--font-jetbrains), monospace", fontSize: 22, fontWeight: 600, color: "var(--ink)", fontFeatureSettings: '"tnum" 1, "zero" 1' }}>
              {formatMoney(inv.value)}
            </div>
            <div style={{ fontFamily: "var(--font-jetbrains), monospace", fontSize: 18, color: "var(--ok)", fontWeight: 600, fontFeatureSettings: '"tnum" 1' }}>
              +{(inv.return * 100).toFixed(1)}%
            </div>
            <div style={{ textAlign: "right" }}>
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
                View
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCell({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: "ok" | "cyan" }) {
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
          color: accent === "ok" ? "var(--ok)" : accent === "cyan" ? "var(--terminal-cyan)" : "var(--ink)",
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
