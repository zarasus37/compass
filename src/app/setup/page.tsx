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
  // Cluster 7.38 — auto-route to the next incomplete step. The index page is
  // a router, not a manual Continue button. Any completedStep value routes
  // the user straight to the form they should fill next.
  redirect(`/setup/${stepSlug(nextStep)}`);
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
