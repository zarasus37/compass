/**
 * /setup/pay-schedule — Step 1 of the 5-step setup wizard.
 *
 * Cluster 7.36 — mechanical intake form (NO LLM). Per vision doc
 * Phase 1: capture the canonical financial state via deterministic
 * form fields.
 *
 * Fields:
 *   - Cadence (chips: weekly / biweekly / twice a month / monthly)
 *   - Take-home per paycheck (typed number input, dollars)
 *   - Source label (text, defaults to "Primary")
 *   - Direct deposit (Y/N toggle — Y surfaces the Plaid link button
 *     in Cluster 7.37)
 *   - Anchor date (first known paycheck date — used by the engine
 *     to project future paychecks)
 */
import { redirect } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/server/auth/user";
import { getOrCreateSetupState, isSetupActivated, getNextStep, type WizardStep } from "@/lib/setup/state";
import { SetupProgress, stepSlug } from "@/components/setup/SetupProgress";
import { prisma } from "@/server/db";
import { savePayScheduleAction } from "../actions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const CADENCES = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Biweekly" },
  { value: "semi_monthly", label: "Twice a month" },
  { value: "monthly", label: "Monthly" },
];

export default async function PaySchedulePage() {
  const user = await requireUser();
  if (await isSetupActivated(user.id)) redirect("/");

  const state = await getOrCreateSetupState(user.id);
  const draft = state.draftJson ? JSON.parse(state.draftJson) : {};
  const draftPay = draft.paySchedule ?? {};
  const next = await getNextStep(user.id);

  const existing = await prisma.paySchedule.findFirst({ where: { userId: user.id } });
  const currentCadence = existing?.cadence ?? draftPay.cadence ?? "";
  const currentAmountDollars =
    existing ? existing.amount / 100 : (draftPay.amountCents ?? 0) / 100;
  const currentSourceLabel = draftPay.sourceLabel ?? "Primary";
  const currentDirectDeposit = draftPay.directDeposit ?? false;

  const today = new Date();
  const isoToday = today.toISOString().slice(0, 10);
  const defaultStartDate =
    existing?.startDate?.toISOString().slice(0, 10) ?? isoToday;

  return (
    <div>
      <SetupProgress completedStep={state.completedStep} currentStep={1 as WizardStep} />
      <header style={{ marginBottom: 24 }}>
        <span
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 10,
            color: "var(--vessel-accent)",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
          }}
        >
          // step 1 of 5
        </span>
        <h1
          style={{
            fontFamily: "var(--font-sora)",
            fontSize: 28,
            fontWeight: 700,
            color: "var(--ink)",
            margin: "4px 0 8px",
          }}
        >
          Pay schedule
        </h1>
        <p
          style={{
            fontFamily: "var(--font-sora)",
            fontSize: 14,
            color: "var(--ink-3)",
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          How the money arrives. Compass uses this to project future paychecks and decide what
          fits in the current period.
        </p>
      </header>

      <form action={savePayScheduleAction} style={{ display: "grid", gap: 28 }}>
        <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
          <legend
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 11,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--ink-2)",
              marginBottom: 12,
            }}
          >
            // cadence
          </legend>
          <div
            style={{ display: "flex", flexWrap: "wrap", gap: 8 }}
            role="radiogroup"
            aria-label="Cadence"
          >
            {CADENCES.map((c) => {
              const isSelected = currentCadence === c.value;
              return (
                <label
                  key={c.value}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "10px 18px",
                    border: `1px solid ${isSelected ? "var(--vessel-accent)" : "var(--line)"}`,
                    borderRadius: 999,
                    background: isSelected ? "var(--vessel-accent-soft, rgba(168,85,247,0.1))" : "transparent",
                    cursor: "pointer",
                    fontFamily: "var(--font-sora)",
                    fontSize: 14,
                    color: isSelected ? "var(--ink)" : "var(--ink-3)",
                  }}
                >
                  <input
                    type="radio"
                    name="cadence"
                    value={c.value}
                    defaultChecked={isSelected}
                    required
                    style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
                  />
                  {c.label}
                </label>
              );
            })}
          </div>
        </fieldset>

        <div>
          <label
            htmlFor="amount"
            style={{
              display: "block",
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 11,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--ink-2)",
              marginBottom: 8,
            }}
          >
            // take-home per paycheck
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: 8, maxWidth: 240 }}>
            <span
              style={{
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 18,
                color: "var(--ink-2)",
              }}
            >
              $
            </span>
            <input
              id="amount"
              name="amount"
              type="number"
              min="0"
              step="1"
              defaultValue={currentAmountDollars || ""}
              placeholder="2,000"
              required
              data-testid="pay-schedule-amount"
              style={{
                flex: 1,
                padding: "10px 12px",
                background: "var(--surface)",
                border: "1px solid var(--line)",
                borderRadius: 6,
                color: "var(--ink)",
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 16,
              }}
            />
            <span
              style={{
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 11,
                color: "var(--ink-4)",
                letterSpacing: "0.1em",
              }}
            >
              USD
            </span>
          </div>
        </div>

        <div>
          <label
            htmlFor="sourceLabel"
            style={{
              display: "block",
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 11,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--ink-2)",
              marginBottom: 8,
            }}
          >
            // source label
          </label>
          <input
            id="sourceLabel"
            name="sourceLabel"
            type="text"
            defaultValue={currentSourceLabel}
            placeholder="Acme Corp, Freelance, Pension, …"
            required
            data-testid="pay-schedule-source"
            style={{
              padding: "10px 12px",
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: 6,
              color: "var(--ink)",
              fontFamily: "var(--font-sora)",
              fontSize: 14,
              width: "100%",
              maxWidth: 360,
            }}
          />
        </div>

        <div>
          <label
            htmlFor="startDate"
            style={{
              display: "block",
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 11,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--ink-2)",
              marginBottom: 8,
            }}
          >
            // anchor date (first known paycheck)
          </label>
          <input
            id="startDate"
            name="startDate"
            type="date"
            defaultValue={defaultStartDate}
            required
            data-testid="pay-schedule-start-date"
            style={{
              padding: "10px 12px",
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: 6,
              color: "var(--ink)",
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 14,
            }}
          />
        </div>

        <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
          <legend
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 11,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--ink-2)",
              marginBottom: 12,
            }}
          >
            // direct deposit?
          </legend>
          <div style={{ display: "flex", gap: 8 }} role="radiogroup" aria-label="Direct deposit">
            {[
              { value: "yes", label: "Yes — connect my bank (Plaid)" },
              { value: "no", label: "No — I'll track it manually" },
            ].map((opt) => {
              const isSelected =
                (currentDirectDeposit && opt.value === "yes") ||
                (!currentDirectDeposit && opt.value === "no");
              return (
                <label
                  key={opt.value}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "10px 18px",
                    border: `1px solid ${isSelected ? "var(--vessel-accent)" : "var(--line)"}`,
                    borderRadius: 6,
                    background: isSelected ? "var(--vessel-accent-soft, rgba(168,85,247,0.1))" : "transparent",
                    cursor: "pointer",
                    fontFamily: "var(--font-sora)",
                    fontSize: 14,
                    color: isSelected ? "var(--ink)" : "var(--ink-3)",
                  }}
                >
                  <input
                    type="radio"
                    name="directDeposit"
                    value={opt.value}
                    defaultChecked={isSelected}
                    required
                    style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
                  />
                  {opt.label}
                </label>
              );
            })}
          </div>
          <p
            style={{
              fontFamily: "var(--font-sora)",
              fontSize: 12,
              color: "var(--ink-4)",
              marginTop: 8,
            }}
          >
            Plaid link arrives in Cluster 7.37 (Real Plaid integration).
          </p>
        </fieldset>

        <StepNav currentStep={1} backHref={null} />
      </form>
    </div>
  );
}

function StepNav({
  currentStep,
  backHref,
}: {
  currentStep: WizardStep;
  backHref: string | null;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        marginTop: 16,
        paddingTop: 16,
        borderTop: "1px solid var(--line-soft)",
      }}
    >
      {backHref ? (
        <Link
          href={backHref}
          style={navBtnStyle("ghost")}
        >
          ← Back
        </Link>
      ) : (
        <span />
      )}
      <button
        type="submit"
        data-testid={`pay-schedule-submit`}
        style={navBtnStyle("primary")}
      >
        Continue →
      </button>
    </div>
  );
}

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
