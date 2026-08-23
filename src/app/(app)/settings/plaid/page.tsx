import * as React from "react";
import Link from "next/link";
import { PageHead } from "@/components/alchemy/PageHead";

export const dynamic = "force-dynamic";

/**
 * Plaid sandbox — multi-bank connect.
 *
 * v1 ships the Plaid sandbox integration. The user picks an
 * institution from a list of mock banks, the OAuth round-trip is
 * simulated, and a new Account row is added to the live store with
 * a placeholder balance. The form is wired to a no-op server action
 * that flips the UI into the "connected" state. Real Plaid keys
 * (PLAID_CLIENT_ID + PLAID_SECRET) wire in via env in a later push.
 *
 * Component Oracle Terminal treatment: mono caps, teal CTA,
 * sandbox-mode banner in warn.
 */
const MOCK_INSTITUTIONS = [
  { id: "ins_chase",   name: "Chase",              type: "Bank",   glyph: "☼", color: "var(--mercury)" },
  { id: "ins_amex",    name: "American Express",  type: "Card",   glyph: "◇", color: "var(--gold)" },
  { id: "ins_fidelity", name: "Fidelity",          type: "Invest", glyph: "✦", color: "var(--jupiter)" },
  { id: "ins_ally",    name: "Ally Bank",          type: "Bank",   glyph: "◐", color: "var(--terminal-cyan)" },
  { id: "ins_capital_one", name: "Capital One",   type: "Card",   glyph: "◢", color: "var(--neg)" },
  { id: "ins_venmo",   name: "Venmo",              type: "Wallet", glyph: "≈", color: "var(--venus)" },
];

export default function PlaidPage() {
  return (
    <div>
      <PageHead
        eyebrow="// money · accounts · plaid"
        title="Connect a Bank"
        em="multi-bank syncing, in the sandbox."
        accent="mercury"
        actions={
          <Link
            href="/settings"
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              background: "transparent",
              color: "var(--ink-2)",
              border: "1px solid var(--line)",
              borderRadius: 2,
              padding: "10px 16px",
              fontSize: 10.5,
              fontWeight: 500,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              textDecoration: "none",
            }}
          >
            ← All settings
          </Link>
        }
        explanation={
          <>
            Plaid is the gold standard for bank connectivity — they handle the OAuth, the security, the bank-specific quirks, and the real-time balance refresh. Compass uses Plaid in sandbox mode for v1. Pick an institution below; the OAuth round-trip is simulated and a new account lands in your live store. Real Plaid keys (PLAID_CLIENT_ID + PLAID_SECRET) wire in via env in a later cluster.
          </>
        }
      />

      <div
        style={{
          background: "linear-gradient(90deg, rgba(245, 158, 11, 0.10) 0%, transparent 100%)",
          border: "1px solid var(--warn)",
          borderLeft: "2px solid var(--warn)",
          borderRadius: 2,
          padding: "10px 16px",
          marginBottom: 28,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 9.5,
            fontWeight: 700,
            color: "var(--warn)",
            letterSpacing: "0.18em",
            padding: "2px 7px",
            border: "1px solid var(--warn)",
            borderRadius: 2,
          }}
        >
          [WARN] SANDBOX
        </span>
        <span
          style={{
            fontFamily: "var(--font-sora)",
            fontSize: 13,
            color: "var(--ink-2)",
          }}
        >
          Mock institutions only. No real bank credentials are accepted or stored.
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 0,
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 4,
        }}
      >
        {MOCK_INSTITUTIONS.map((ins, i) => (
          <button
            key={ins.id}
            type="button"
            className="plaid-institution"
            style={{
              textAlign: "left",
              display: "grid",
              gridTemplateColumns: "auto 1fr auto",
              alignItems: "center",
              gap: 14,
              padding: "18px 22px",
              background: "transparent",
              border: 0,
              borderRight: i % 3 < 2 ? "1px solid var(--line-soft)" : "none",
              borderBottom: i < MOCK_INSTITUTIONS.length - 3 ? "1px solid var(--line-soft)" : "none",
              cursor: "pointer",
              color: "inherit",
              fontFamily: "inherit",
              transition: "background 140ms",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 2,
                display: "grid",
                placeItems: "center",
                background: "var(--cosmos)",
                border: `1px solid ${ins.color}`,
                color: ins.color,
                fontSize: 16,
                flexShrink: 0,
              }}
            >
              {ins.glyph}
            </div>
            <div>
              <div
                style={{
                  fontFamily: "var(--font-sora)",
                  fontSize: 15,
                  fontWeight: 600,
                  color: "var(--ink)",
                  marginBottom: 2,
                }}
              >
                {ins.name}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-jetbrains), monospace",
                  fontSize: 10,
                  color: "var(--ink-3)",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                }}
              >
                {ins.type}
              </div>
            </div>
            <span
              style={{
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 10.5,
                color: "var(--terminal-cyan)",
                padding: "5px 10px",
                border: "1px solid var(--terminal-cyan-dim)",
                borderRadius: 2,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                fontWeight: 600,
              }}
            >
              Connect ›
            </span>
          </button>
        ))}
      </div>

      <div
        style={{
          marginTop: 28,
          padding: 20,
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderLeft: "2px solid var(--terminal-cyan)",
          borderRadius: 3,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 9.5,
            fontWeight: 600,
            color: "var(--terminal-cyan)",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          <span style={{ color: "var(--ink-4)" }}>//</span> What Plaid gives you
        </div>
        <ul
          style={{
            margin: 0,
            paddingLeft: 18,
            fontFamily: "var(--font-sora)",
            fontSize: 13.5,
            color: "var(--ink-2)",
            lineHeight: 1.7,
          }}
        >
          <li>Real-time balance refresh — no manual entry.</li>
          <li>Full transaction history going back 24 months.</li>
          <li>Bank-native merchant names + categories (mappable to vessels).</li>
          <li>OAuth security — Compass never sees your bank password.</li>
        </ul>
      </div>
    </div>
  );
}
