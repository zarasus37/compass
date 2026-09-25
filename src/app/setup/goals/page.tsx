/**
 * /setup/goals — Step 5 of the setup wizard.
 *
 * Cluster 7.36 — financial goals. For v1, user-editable goals (rename,
 * adjust target). Adding NEW goals from the wizard is deferred to
 * post-activation; the wizard focuses on confirming existing ones.
 *
 * If the user has no goals (typical mom scenario — she might not have
 * any set up yet), the form shows an empty state with a "Skip — no
 * goals yet" CTA.
 */
import { redirect } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/server/auth/user";
import { getOrCreateSetupState, isSetupActivated, type WizardStep } from "@/lib/setup/state";
import { SetupProgress } from "@/components/setup/SetupProgress";
import { prisma } from "@/server/db";
import { saveGoalsAction } from "../actions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function GoalsPage() {
  const user = await requireUser();
  if (await isSetupActivated(user.id)) redirect("/");

  const state = await getOrCreateSetupState(user.id);
  if (state.completedStep < 4) redirect("/setup/bills");

  const goals = await prisma.goal.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <SetupProgress completedStep={state.completedStep} currentStep={5 as WizardStep} />
      <header style={{ marginBottom: 24 }}>
        <span style={eyebrowStyle}>// step 5 of 5</span>
        <h1 style={h1Style}>Goals</h1>
        <p style={pStyle}>
          What you're saving for. Compass uses these to compute target drift and to prioritize
          allocation when there's not enough to go around.
        </p>
      </header>

      <form action={saveGoalsAction} style={{ display: "grid", gap: 12 }}>
        {goals.length === 0 ? (
          <div
            data-testid="goals-empty"
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
              No goals yet
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
              You can add goals later from the Goals page after activation. The engine will still
              work — it just won't have explicit targets to optimize toward.
            </p>
            <input type="hidden" name="goalId" value="" />
          </div>
        ) : (
          goals.map((goal) => (
            <div
              key={goal.id}
              data-testid={`goal-${goal.id}`}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 180px",
                gap: 12,
                padding: 14,
                background: "var(--surface)",
                border: "1px solid var(--line)",
                borderRadius: 6,
                alignItems: "center",
              }}
            >
              <input type="hidden" name="goalId" value={goal.id} />
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
                  // name
                </div>
                <input
                  type="text"
                  name={`name_${goal.id}`}
                  defaultValue={goal.name}
                  data-testid={`goal-name-${goal.id}`}
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
                  // target $
                </div>
                <input
                  type="number"
                  min="0"
                  step="1"
                  name={`target_${goal.id}`}
                  defaultValue={goal.targetAmount / 100}
                  data-testid={`goal-target-${goal.id}`}
                  style={inputStyle}
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
          <Link href="/setup/bills" style={navBtnStyle("ghost")}>
            ← Back
          </Link>
          <button type="submit"
          data-testid="goals-submit" style={navBtnStyle("primary")}>
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

export { SetupProgress };
