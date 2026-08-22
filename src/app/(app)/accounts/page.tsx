import * as React from "react";
import { PageHead } from "@/components/alchemy/PageHead";
import { formatMoney } from "@/lib/money";
import { liveAccount } from "@/lib/mock";

export const dynamic = "force-dynamic";

export default function AccountsPage() {
  const ACCOUNT = liveAccount();
  return (
    <div>
      <PageHead
        eyebrow="Money · Accounts"
        title="Accounts"
        em="where your money lives."
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
            borderRadius: 8,
            display: "grid",
            placeItems: "center",
            background: "var(--cosmos)",
            border: "1px solid var(--line)",
            fontSize: 22,
            color: "var(--mercury)",
          }}
        >
          ⚛
        </div>
        <div>
          <div
            style={{
              fontFamily: "var(--font-italiana), var(--font-cinzel), serif",
              fontSize: 22,
              color: "var(--ink)",
            }}
          >
            {ACCOUNT.name}
          </div>
          <div
            style={{
              fontFamily: "var(--font-cormorant), serif",
              fontStyle: "italic",
              fontSize: 13,
              color: "var(--ink-3)",
            }}
          >
            {ACCOUNT.institution} · •••• {ACCOUNT.mask}
          </div>
        </div>
        <div>
          <div
            style={{
              fontFamily: "var(--font-cinzel), serif",
              fontSize: 9.5,
              color: "var(--ink-3)",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            Type
          </div>
          <div
            style={{
              fontFamily: "var(--font-cormorant), serif",
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
              fontFamily: "var(--font-cinzel), serif",
              fontSize: 9.5,
              color: "var(--ink-3)",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            Current balance
          </div>
          <div
            style={{
              fontFamily: "var(--font-italiana), var(--font-cinzel), serif",
              fontSize: 22,
              color: "var(--ink)",
            }}
          >
            {formatMoney(2_400_00)}
          </div>
        </div>
        <div
          style={{
            fontFamily: "var(--font-cinzel), serif",
            fontSize: 9.5,
            color: "var(--ink-3)",
            letterSpacing: "0.22em",
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
