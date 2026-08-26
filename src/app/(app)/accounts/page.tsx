import * as React from "react";
import { PageHead } from "@/components/alchemy/PageHead";
import { formatMoney } from "@/lib/money";
import { liveAccountsFromDb } from "@/lib/mock";
import { requireUser } from "@/server/auth/user";

export const dynamic = "force-dynamic";

/**
 * Accounts — articulated deep page.
 *
 * Component Oracle Terminal treatment: Sora title, JetBrains Mono
 * for amounts, mono caps labels. Mercury (planet) accent for the
 * account card border (semantic).
 *
 * Cluster 5.2.6 widget switch: the page now reads from Prisma
 * (`liveAccountsFromDb`) instead of the in-memory `ACCOUNT_SEED`.
 * The page surfaces two lists:
 *   1. The canonical account(s) (source="seed") — what the user
 *      set up as their primary bank. The 7-vessel plan treats
 *      this as the source of every paycheck and the destination
 *      of every envelope spend.
 *   2. The projection accounts (name startsWith "[identity] ") —
 *      the income, asset, and debt rows that the onboarding chat
 *      captured. These show up here as a secondary list so the
 *      user can see what the chat materialized.
 *
 * Also fixed: the prior version hardcoded `formatMoney(2_400_00)`
 * for the balance cell (the next paycheck amount, not the account
 * balance). The new version reads `account.balanceCents` from
 * the DB row.
 */
export default async function AccountsPage() {
  const user = await requireUser();
  const { canonical, projected } = await liveAccountsFromDb(user.id);
  const ACCOUNT = canonical[0] ?? null;
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

      {ACCOUNT && (
        <AccountRow
          name={ACCOUNT.name}
          institution={ACCOUNT.institution ?? ""}
          mask={ACCOUNT.mask ?? ""}
          type={ACCOUNT.type}
          balanceCents={ACCOUNT.balanceCents}
          badge="Manual · mock"
        />
      )}

      {projected.length > 0 && (
        <>
          <div
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 10.5,
              fontWeight: 600,
              color: "var(--mercury)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              margin: "48px 0 16px",
            }}
          >
            <span style={{ color: "var(--ink-4)" }}>//</span> From the onboarding chat
          </div>
          <p
            style={{
              fontFamily: "var(--font-sora)",
              fontSize: 13.5,
              color: "var(--ink-3)",
              marginBottom: 24,
              lineHeight: 1.5,
            }}
          >
            These are the income sources, assets, and debts you shared in the onboarding chat. They live alongside your canonical account as separate rows so the chat's data is visible without overwriting the seed.
          </p>
          {projected.map((a) => (
            <ProjectedAccountRow
              key={a.id}
              name={a.name}
              institution={a.institution ?? ""}
              type={a.type}
              balanceCents={a.balanceCents}
            />
          ))}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// AccountRow — the primary canonical account card.
// ---------------------------------------------------------------------------

function AccountRow({
  name,
  institution,
  mask,
  type,
  balanceCents,
  badge,
}: {
  name: string;
  institution: string;
  mask: string;
  type: string;
  balanceCents: number;
  badge: string;
}) {
  return (
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
          {name}
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
          {institution} · •••• {mask}
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
          {type}
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
          {formatMoney(balanceCents)}
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
        {badge}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ProjectedAccountRow — the secondary rows from the onboarding chat.
// Denser layout (3 cols), different accent.
// ---------------------------------------------------------------------------

function ProjectedAccountRow({
  name,
  institution,
  type,
  balanceCents,
}: {
  name: string;
  institution: string;
  type: string;
  balanceCents: number;
}) {
  // Debts have negative balances; render them in the neg (vessel-over)
  // color so the user can see at a glance which rows are liabilities.
  const isLiability = balanceCents < 0;
  const balanceColor = isLiability ? "var(--vessel-over)" : "var(--ink)";
  return (
    <div
      style={{
        background: "var(--vessel-surface, var(--surface))",
        border: "1px solid var(--vessel-border, var(--line))",
        borderLeft: `2px solid var(--mercury)`,
        borderRadius: 4,
        padding: "20px 24px",
        display: "grid",
        gridTemplateColumns: "1fr 200px 140px",
        gap: 24,
        alignItems: "center",
        marginBottom: 8,
      }}
    >
      <div>
        <div
          style={{
            fontFamily: "var(--font-sora)",
            fontSize: 16,
            fontWeight: 500,
            color: "var(--ink)",
          }}
        >
          {name}
        </div>
        <div
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 10.5,
            color: "var(--ink-3)",
            marginTop: 4,
            letterSpacing: "0.04em",
          }}
        >
          {institution || "from identity"}
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
            fontSize: 14,
            color: "var(--ink-2)",
            textTransform: "capitalize",
          }}
        >
          {type}
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
            fontSize: 18,
            fontWeight: 600,
            color: balanceColor,
            fontFeatureSettings: '"tnum" 1, "zero" 1',
          }}
        >
          {formatMoney(balanceCents)}
        </div>
      </div>
    </div>
  );
}
