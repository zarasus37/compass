import * as React from "react";
import { PageHead } from "@/components/alchemy/PageHead";
import { formatMoney } from "@/lib/money";
import { liveAccount } from "@/lib/mock";

export const dynamic = "force-dynamic";

/**
 * Accounts — articulated deep page.
 *
 * Component Oracle Terminal treatment: Sora title, JetBrains Mono
 * for amounts, mono caps labels. Mercury (planet) accent for the
 * account card border (semantic).
 */
export default function AccountsPage() {
  const ACCOUNT = liveAccount();
  return (
    <div>
      <PageHead
        eyebrow="// money · accounts"
        title="Accounts"
        em="where your money lives."
        accent="mercury"
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
            + Connect account
          </button>
        }
        explanation={
          <>
            These are the places your money actually lives — checking, savings, credit cards, cash. Compass reads the balance (or you enter it manually) and treats the account as the source of every paycheck and the destination of every envelope spend. In v1 this is a manual mock — connect a real bank via Plaid in a future cluster.
          </>
        }
      />

      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderLeft: "2px solid var(--mercury)",
          borderRadius: 4,
          padding: 32,
          display: "grid",
          gridTemplateColumns: "60px 1fr 200px 140px 140px",
          gap: 24,
          alignItems: "center",
        }}
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 2,
            display: "grid",
            placeItems: "center",
            background: "var(--cosmos)",
            border: "1px solid var(--mercury)",
            fontSize: 22,
            color: "var(--mercury)",
          }}
        >
          ⚛
        </div>
        <div>
          <div
            style={{
              fontFamily: "var(--font-sora)",
              fontSize: 20,
              fontWeight: 600,
              color: "var(--ink)",
              letterSpacing: "-0.005em",
            }}
          >
            {ACCOUNT.name}
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
            {ACCOUNT.institution} · •••• {ACCOUNT.mask}
          </div>
        </div>
        <div>
          <div
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 9.5,
              fontWeight: 600,
              color: "var(--ink-3)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            <span style={{ color: "var(--ink-4)" }}>//</span> Type
          </div>
          <div
            style={{
              fontFamily: "var(--font-sora)",
              fontSize: 15,
              color: "var(--ink-2)",
              textTransform: "capitalize",
            }}
          >
            {ACCOUNT.type}
          </div>
        </div>
        <div>
          <div
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 9.5,
              fontWeight: 600,
              color: "var(--ink-3)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            <span style={{ color: "var(--ink-4)" }}>//</span> Balance
          </div>
          <div
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 22,
              fontWeight: 600,
              color: "var(--ink)",
              fontFeatureSettings: '"tnum" 1, "zero" 1',
            }}
          >
            {formatMoney(2_400_00)}
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
            textAlign: "right",
          }}
        >
          Manual · mock
        </div>
      </div>
    </div>
  );
}
