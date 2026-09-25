/**
 * /setup/activate — final CTA after all 5 steps complete.
 *
 * Cluster 7.36 — the activation CTA. When the user clicks "Activate",
 * the engine takes over. The setup wizard can still be revisited later
 * (the user can revise any step), but the canonical state is now
 * "active" and the dashboard becomes the home surface.
 */
import { redirect } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/server/auth/user";
import { getOrCreateSetupState, isSetupActivated } from "@/lib/setup/state";
import { SetupProgress } from "@/components/setup/SetupProgress";
import { activatePlanAction } from "../actions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function ActivatePage() {
  const user = await requireUser();
  if (await isSetupActivated(user.id)) redirect("/");

  const state = await getOrCreateSetupState(user.id);
  if (state.completedStep < 5) {
    redirect(`/setup/${state.completedStep === 0 ? "pay-schedule" : ""}`);
  }

  return (
    <div>
      <SetupProgress completedStep={5} currentStep={5} />
      <header style={{ marginBottom: 24 }}>
        <span style={eyebrowStyle}>// ready to launch</span>
        <h1 style={h1Style}>Activate your plan</h1>
        <p style={pStyle}>
          When you activate, Compass takes over the bookkeeping. You can revise any step later from
          the dashboard — the engine respects your changes.
        </p>
      </header>

      <div
        style={{
          padding: 32,
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderLeft: "3px solid var(--vessel-accent)",
          borderRadius: 6,
          marginBottom: 24,
        }}
      >
        <h2
          style={{
            fontFamily: "var(--font-sora)",
            fontSize: 17,
            fontWeight: 600,
            color: "var(--ink)",
            margin: "0 0 12px",
          }}
        >
          What happens next
        </h2>
        <ul
          style={{
            margin: 0,
            padding: "0 0 0 20px",
            fontFamily: "var(--font-sora)",
            fontSize: 14,
            color: "var(--ink-3)",
            lineHeight: 1.8,
          }}
        >
          <li>The dashboard becomes your home screen</li>
          <li>Each paycheck, Compass allocates per your pay schedule + envelope targets</li>
          <li>Bills hit the calendar automatically when due</li>
          <li>Goal progress updates as envelopes fill</li>
          <li>You can ask the AI advisor "why did you put $X here?" — it reads the same state you just set up</li>
        </ul>
      </div>

      <form action={activatePlanAction} style={{ display: "flex", gap: 12 }}>
        <Link href="/setup/goals" style={navBtnStyle("ghost")}>
          ← Back
        </Link>
        <button
          type="submit"
          data-testid="activate-plan-submit"
          style={navBtnStyle("primary")}
        >
          Activate plan
        </button>
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
