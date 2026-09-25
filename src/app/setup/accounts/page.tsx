/**
 * /setup/accounts — Step 2 of the setup wizard.
 *
 * Cluster 7.36 — capture the user's account balances. The default
 * checking account is auto-created in step 1. User can edit balances
 * or add new accounts (savings, credit card).
 *
 * For v1: keep it simple — one form per account, + "Add another" button
 * via a small client-side piece.
 */
import { redirect } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/server/auth/user";
import { getOrCreateSetupState, isSetupActivated, type WizardStep } from "@/lib/setup/state";
import { SetupProgress } from "@/components/setup/SetupProgress";
import { prisma } from "@/server/db";
import { saveAccountsAction } from "../actions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AccountsPage() {
  const user = await requireUser();
  if (await isSetupActivated(user.id)) redirect("/");

  const state = await getOrCreateSetupState(user.id);
  if (state.completedStep < 1) redirect("/setup/pay-schedule");

  const accounts = await prisma.account.findMany({
    where: { userId: user.id },
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });

  return (
    <div>
      <SetupProgress completedStep={state.completedStep} currentStep={2 as WizardStep} />
      <header style={{ marginBottom: 24 }}>
        <span style={eyebrowStyle}>// step 2 of 5</span>
        <h1 style={h1Style}>Accounts</h1>
        <p style={pStyle}>
          Where the money lives. Edit each account's current balance — checking, savings, credit card,
          anything you want Compass to know about.
        </p>
      </header>

      <form action={saveAccountsAction} style={{ display: "grid", gap: 20 }}>
        {accounts.length === 0 ? (
          <p style={{ ...pStyle, color: "var(--ink-3)" }}>
            No accounts yet. Step 1 should have created your primary checking account. Go back and try
            again.
          </p>
        ) : (
          accounts.map((acc) => (
            <div
              key={acc.id}
              data-testid={`account-${acc.id}`}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 180px",
                gap: 16,
                alignItems: "center",
                padding: 16,
                background: "var(--surface)",
                border: "1px solid var(--line)",
                borderRadius: 6,
              }}
            >
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
                  {acc.name}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-jetbrains), monospace",
                    fontSize: 10,
                    color: "var(--ink-4)",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                  }}
                >
                  {acc.type}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{
                    fontFamily: "var(--font-jetbrains), monospace",
                    fontSize: 16,
                    color: "var(--ink-2)",
                  }}
                >
                  $
                </span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  name={`balance_${acc.id}`}
                  defaultValue={acc.currentBalance / 100}
                  data-testid={`account-balance-${acc.id}`}
                  style={{
                    flex: 1,
                    padding: "10px 12px",
                    background: "var(--background)",
                    border: "1px solid var(--line)",
                    borderRadius: 6,
                    color: "var(--ink)",
                    fontFamily: "var(--font-jetbrains), monospace",
                    fontSize: 16,
                  }}
                />
              </div>
            </div>
          ))
        )}

        <div
          style={{
            display: "flex",
            gap: 12,
            marginTop: 16,
            paddingTop: 16,
            borderTop: "1px solid var(--line-soft)",
          }}
        >
          <Link href="/setup/pay-schedule" style={navBtnStyle("ghost")}>
            ← Back
          </Link>
          <button type="submit"
          data-testid="accounts-submit" style={navBtnStyle("primary")}>
            Continue →
          </button>
        </div>
      </form>
    </div>
  );
}

const eyebrowStyle: React.CSSProperties = {
  fontFamily: "var(--font-jetbrains), monospace",
  fontSize: 10,
  color: "var(--vessel-accent)",
  letterSpacing: "0.14em",
  textTransform: "uppercase",
};
const h1Style: React.CSSProperties = {
  fontFamily: "var(--font-sora)",
  fontSize: 28,
  fontWeight: 700,
  color: "var(--ink)",
  margin: "4px 0 8px",
};
const pStyle: React.CSSProperties = {
  fontFamily: "var(--font-sora)",
  fontSize: 14,
  color: "var(--ink-3)",
  lineHeight: 1.6,
  margin: 0,
};
function navBtnStyle(variant: "primary" | "ghost"): React.CSSProperties {
  if (variant === "primary") {
    return {
      marginLeft: "auto",
      padding: "12px 24px",
      background: "var(--vessel-accent)",
      color: "var(--background)",
      border: "none",
      borderRadius: 6,
      fontFamily: "var(--font-jetbrains), monospace",
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      cursor: "pointer",
    };
  }
  return {
    padding: "12px 24px",
    background: "transparent",
    color: "var(--ink-2)",
    border: "1px solid var(--line)",
    borderRadius: 6,
    fontFamily: "var(--font-jetbrains), monospace",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    textDecoration: "none",
  };
}
