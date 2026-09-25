/**
 * /setup/bills — Step 4 of the setup wizard.
 *
 * Cluster 7.36 — bills in the system. For v1, bills are user-editable
 * (amount, due day) or removable. Adding NEW bills from the wizard
 * is deferred to the post-activation /obligations page (which has
 * more space for the add-bill UI). The wizard focuses on confirming
 * the existing bills and surfacing the picture.
 *
 * If the user has no bills (typical mom scenario), the form shows
 * an empty state with a "Skip — no recurring bills" CTA.
 */
import { redirect } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/server/auth/user";
import { getOrCreateSetupState, isSetupActivated, type WizardStep } from "@/lib/setup/state";
import { SetupProgress } from "@/components/setup/SetupProgress";
import { prisma } from "@/server/db";
import { saveBillsAction } from "../actions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CADENCE_LABEL: Record<string, string> = {
  weekly: "weekly",
  biweekly: "biweekly",
  semi_monthly: "twice a month",
  monthly: "monthly",
  quarterly: "quarterly",
  annual: "annual",
};

export default async function BillsPage() {
  const user = await requireUser();
  if (await isSetupActivated(user.id)) redirect("/");

  const state = await getOrCreateSetupState(user.id);
  if (state.completedStep < 3) redirect("/setup/envelopes");

  const bills = await prisma.bill.findMany({
    where: { userId: user.id },
    orderBy: { dueDay: "asc" },
  });

  return (
    <div>
      <SetupProgress completedStep={state.completedStep} currentStep={4 as WizardStep} />
      <header style={{ marginBottom: 24 }}>
        <span style={eyebrowStyle}>// step 4 of 5</span>
        <h1 style={h1Style}>Bills</h1>
        <p style={pStyle}>
          Recurring obligations — the things that hit every period. Adjust amounts or due days, or
          remove bills you don't want Compass to track.
        </p>
      </header>

      <form action={saveBillsAction} style={{ display: "grid", gap: 12 }}>
        {bills.length === 0 ? (
          <div
            data-testid="bills-empty"
            style={{
              padding: 32,
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderLeft: "3px solid var(--vessel-accent)",
              borderRadius: 6,
              textAlign: "center",
            }}
          >
            <h3
              style={{
                fontFamily: "var(--font-sora)",
                fontSize: 16,
                fontWeight: 600,
                color: "var(--ink)",
                margin: "0 0 8px",
              }}
            >
              No recurring bills yet
            </h3>
            <p
              style={{
                fontFamily: "var(--font-sora)",
                fontSize: 14,
                color: "var(--ink-3)",
                margin: "0 0 16px",
                lineHeight: 1.6,
              }}
            >
              That's fine — many people don't track rent as a "bill" in Compass (it's part of your
              pay schedule). You can add bills later from the Obligations page after activation.
            </p>
            <input type="hidden" name="billId" value="" />
          </div>
        ) : (
          bills.map((bill) => (
            <div
              key={bill.id}
              data-testid={`bill-${bill.id}`}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 120px 80px auto",
                gap: 12,
                padding: 14,
                background: "var(--surface)",
                border: "1px solid var(--line)",
                borderRadius: 6,
                alignItems: "center",
              }}
            >
              <input type="hidden" name="billId" value={bill.id} />
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-sora)",
                    fontSize: 15,
                    fontWeight: 600,
                    color: "var(--ink)",
                  }}
                >
                  {bill.name}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-jetbrains), monospace",
                    fontSize: 10,
                    color: "var(--ink-4)",
                    letterSpacing: "0.1em",
                  }}
                >
                  {CADENCE_LABEL[bill.cadence] ?? bill.cadence}
                  {bill.autopay ? " · autopay" : ""}
                </div>
              </div>
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-jetbrains), monospace",
                    fontSize: 9,
                    color: "var(--ink-4)",
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    marginBottom: 4,
                  }}
                >
                  // amount $
                </div>
                <input
                  type="number"
                  min="0"
                  step="1"
                  name={`amount_${bill.id}`}
                  defaultValue={bill.amountCents / 100}
                  data-testid={`bill-amount-${bill.id}`}
                  style={inputStyle}
                />
              </div>
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-jetbrains), monospace",
                    fontSize: 9,
                    color: "var(--ink-4)",
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    marginBottom: 4,
                  }}
                >
                  // due day
                </div>
                <input
                  type="number"
                  min="1"
                  max="31"
                  name={`dueDay_${bill.id}`}
                  defaultValue={bill.dueDay ?? ""}
                  data-testid={`bill-dueday-${bill.id}`}
                  style={inputStyle}
                />
              </div>
              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontFamily: "var(--font-jetbrains), monospace",
                  fontSize: 10,
                  color: "var(--ink-3)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  name={`remove_${bill.id}`}
                  value="1"
                  data-testid={`bill-remove-${bill.id}`}
                />
                Remove
              </label>
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
          <Link href="/setup/envelopes" style={navBtnStyle("ghost")}>
            ← Back
          </Link>
          <button type="submit"
          data-testid="bills-submit" style={navBtnStyle("primary")}>
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
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  background: "var(--background)",
  border: "1px solid var(--line)",
  borderRadius: 6,
  color: "var(--ink)",
  fontFamily: "var(--font-jetbrains), monospace",
  fontSize: 14,
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
