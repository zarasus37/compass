/**
 * /setup — wizard entry point. Routes the user to their next incomplete
 * step. If all 5 steps are done, shows the "Activate plan" CTA.
 */
import { redirect } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/server/auth/user";
import { getOrCreateSetupState, getNextStep, isSetupActivated } from "@/lib/setup/state";
import { SetupProgress, stepSlug } from "@/components/setup/SetupProgress";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function SetupIndexPage() {
  const user = await requireUser();
  if (await isSetupActivated(user.id)) {
    redirect("/");
  }
  const state = await getOrCreateSetupState(user.id);
  const nextStep = await getNextStep(user.id);
  if (nextStep === null) {
    // All 5 steps done — show the activate CTA.
    return <ActivateCard />;
  }
  // First step: route directly so the user lands on the form.
  if (state.completedStep === 0) {
    redirect("/setup/pay-schedule");
  }
  return (
    <div>
      <SetupProgress completedStep={state.completedStep} currentStep={nextStep} />
      <h1
        style={{
          fontFamily: "var(--font-sora)",
          fontSize: 28,
          fontWeight: 700,
          color: "var(--ink)",
          margin: "0 0 12px",
        }}
      >
        Pick up where you left off
      </h1>
      <p
        style={{
          fontFamily: "var(--font-sora)",
          fontSize: 14,
          color: "var(--ink-3)",
          lineHeight: 1.6,
          margin: "0 0 24px",
        }}
      >
        You finished {state.completedStep} of 5 setup steps. Continue with the next one — or jump back to
        any step you already finished to revise your answers.
      </p>
      <div style={{ display: "flex", gap: 12 }}>
        <Link
          href={`/setup/${stepSlug(nextStep)}`}
          style={{
            padding: "12px 24px",
            background: "var(--vessel-accent)",
            color: "var(--background)",
            borderRadius: 6,
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            textDecoration: "none",
          }}
        >
          Continue step {nextStep}
        </Link>
      </div>
    </div>
  );
}

function ActivateCard() {
  return (
    <div>
      <SetupProgress completedStep={5} currentStep={5} />
      <h1
        style={{
          fontFamily: "var(--font-sora)",
          fontSize: 28,
          fontWeight: 700,
          color: "var(--ink)",
          margin: "0 0 12px",
        }}
      >
        All 5 steps complete
      </h1>
      <p
        style={{
          fontFamily: "var(--font-sora)",
          fontSize: 14,
          color: "var(--ink-3)",
          lineHeight: 1.6,
          margin: "0 0 24px",
        }}
      >
        When you activate, Compass takes over the bookkeeping. You can still revise any step later from
        the dashboard — the engine respects your changes.
      </p>
      <Link
        href="/setup/activate"
        style={{
          padding: "12px 24px",
          background: "var(--vessel-accent)",
          color: "var(--background)",
          borderRadius: 6,
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          textDecoration: "none",
        }}
      >
        Activate plan
      </Link>
    </div>
  );
}
