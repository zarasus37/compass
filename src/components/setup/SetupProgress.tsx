import Link from "next/link";
import type { WizardStep } from "@/lib/setup/state";
import { STEP_LABELS } from "@/lib/setup/state";

export function SetupProgress({
  completedStep,
  currentStep,
}: {
  completedStep: number;
  currentStep: WizardStep;
}) {
  return (
    <nav
      aria-label="Setup progress"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(5, 1fr)",
        gap: 8,
        marginBottom: 32,
      }}
    >
      {([1, 2, 3, 4, 5] as const).map((step) => {
        const isDone = completedStep >= step;
        const isCurrent = step === currentStep;
        const isReachable = isDone || step <= currentStep;
        const color = isDone
          ? "var(--ok, #5bd0a0)"
          : isCurrent
            ? "var(--vessel-accent)"
            : "var(--ink-4, #5a6378)";
        return (
          <Link
            key={step}
            href={isReachable ? `/setup/${stepSlug(step)}` : "#"}
            aria-current={isCurrent ? "step" : undefined}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
              padding: "12px 8px",
              border: "1px solid var(--line-soft)",
              borderRadius: 6,
              background: isCurrent ? "var(--surface)" : "transparent",
              textDecoration: "none",
              opacity: isReachable ? 1 : 0.4,
              pointerEvents: isReachable ? "auto" : "none",
            }}
          >
            <span
              aria-hidden
              style={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                border: `2px solid ${color}`,
                background: isDone ? color : "transparent",
                color: isDone ? "var(--background)" : color,
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 11,
                fontWeight: 700,
                display: "grid",
                placeItems: "center",
              }}
            >
              {isDone ? "✓" : step}
            </span>
            <span
              style={{
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 9.5,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color,
                textAlign: "center",
              }}
            >
              {STEP_LABELS[step]}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

export function stepSlug(step: WizardStep): string {
  return {
    1: "pay-schedule",
    2: "accounts",
    3: "envelopes",
    4: "bills",
    5: "goals",
  }[step];
}

export function stepFromSlug(slug: string): WizardStep | null {
  const map: Record<string, WizardStep> = {
    "pay-schedule": 1,
    accounts: 2,
    envelopes: 3,
    bills: 4,
    goals: 5,
  };
  return map[slug] ?? null;
}
