/**
 * /setup/envelopes — Step 3 of the setup wizard.
 *
 * Cluster 7.36 — confirms the canonical 7 vessels are set up correctly.
 * User can rename any, adjust target balances, and set current balances
 * to match what they actually have right now.
 *
 * Cluster 7.28 already added Sinking Funds (EnvelopeSink). For v1 of
 * the wizard, sinks are NOT in scope — user can add them later from
 * the envelope detail page (existing UI).
 */
import { redirect } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/server/auth/user";
import { getOrCreateSetupState, isSetupActivated, type WizardStep } from "@/lib/setup/state";
import { SetupProgress } from "@/components/setup/SetupProgress";
import { prisma } from "@/server/db";
import { ensureUserEnvelopesSeeded } from "@/lib/store";
import { saveEnvelopesAction } from "../actions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function EnvelopesPage() {
  const user = await requireUser();
  if (await isSetupActivated(user.id)) redirect("/");

  const state = await getOrCreateSetupState(user.id);
  if (state.completedStep < 2) redirect("/setup/accounts");

  await ensureUserEnvelopesSeeded(user.id);

  const envs = await prisma.envelope.findMany({
    where: { userId: user.id },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div>
      <SetupProgress completedStep={state.completedStep} currentStep={3 as WizardStep} />
      <header style={{ marginBottom: 24 }}>
        <span style={eyebrowStyle}>// step 3 of 5</span>
        <h1 style={h1Style}>Envelopes</h1>
        <p style={pStyle}>
          Seven canonical vessels — the buckets your money lives in. Adjust names, target balances, or
          current balances to match your real situation.
        </p>
      </header>

      <form action={saveEnvelopesAction} style={{ display: "grid", gap: 12 }}>
        {envs.map((env) => (
          <div
            key={env.id}
            data-testid={`envelope-${env.id}`}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 12,
              padding: 14,
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: 6,
              alignItems: "center",
            }}
          >
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
                name={`name_${env.id}`}
                defaultValue={env.name}
                data-testid={`envelope-name-${env.id}`}
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
                // current $
              </div>
              <input
                type="number"
                min="0"
                step="1"
                name={`current_${env.id}`}
                defaultValue={env.currentBalance / 100}
                data-testid={`envelope-current-${env.id}`}
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
                name={`target_${env.id}`}
                defaultValue={env.targetBalance / 100}
                data-testid={`envelope-target-${env.id}`}
                style={inputStyle}
              />
            </div>
          </div>
        ))}

        <div
          style={{
            display: "flex",
            gap: 12,
            marginTop: 16,
            paddingTop: 16,
            borderTop: "1px solid var(--line-soft)",
          }}
        >
          <Link href="/setup/accounts" style={navBtnStyle("ghost")}>
            ← Back
          </Link>
          <button type="submit"
          data-testid="envelopes-submit" style={navBtnStyle("primary")}>
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
