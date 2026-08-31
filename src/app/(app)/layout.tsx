import * as React from "react";
import { requireUser } from "@/server/auth/user";
import { requireCompletedOnboarding } from "@/lib/onboarding/gate";
import { AppSidebar } from "@/components/sidebar/AppSidebar";
import { BottomNav } from "@/components/shell/BottomNav";
import { TopAppBar } from "@/components/shell/TopAppBar";
import { RebalanceAlertBay } from "@/components/alerts/RebalanceAlertBay";
import { liveEnvelopes, getCurrentPayPeriod } from "@/lib/mock";
import { getActiveEngineLevel } from "@/app/(app)/settings/engine-actions";
import { CommandPaletteProvider } from "@/components/command-palette/CommandPaletteProvider";
import { getSearchIndex } from "@/lib/command-palette/search-index";
import { getAuditLog } from "@/lib/vault/audit-log";

/**
 * App shell — the signed-in layout. Wraps every page in the (app)
 * route group with:
 *   - the 3-chapter sidebar (D13, on the left)
 *   - the persistent Sovereign Monad top bar (Cluster 3.x — branding,
 *     pay period chip, engine toggle)
 *   - the contextual rebalance alert bay (Cluster 3.x Component 3 —
 *     surfaces over-limit envelopes with a [ Balance Envelope ]
 *     button that opens a slide-in rebalance drawer)
 *   - the persistent bottom nav (Bottom 30% — Dashboard / Quick Entry
 *     [floating center] / Advanced Analytics / Settings)
 *
 * The layout reads the active engine level (SystemSettings) and the
 * active pay period (PayPeriod) and passes both into TopAppBar as
 * props. Force-dynamic so changes show up immediately after a
 * server action like toggleEngineAction.
 *
 * Onboarding gate (Cluster 5.1): if the user has no completed
 * FinancialIdentity, redirect to /onboarding. The check is a
 * single SELECT on FinancialIdentity.completedAt (indexed by
 * userId via the @unique constraint). Once the agent calls
 * markOnboardingComplete, the gate passes.
 *
 * The dashboard (`/`) lives outside this group at the root and
 * applies the same gate in its own page body (the COORDINATION
 * note about Cluster 5.1.5 will refactor that into a shared
 * component when there's a second consumer).
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  await requireCompletedOnboarding(user.id);

  // Live envelope state — drives the alert bay.
  const ENVELOPES = liveEnvelopes();
  const overLimit = ENVELOPES
    .filter((e) => e.target > 0 && e.current > e.target)
    .map((e) => ({
      id: e.id,
      name: e.name,
      planet: e.planet,
      currentCents: e.current,
      targetCents: e.target,
    }));
  const alertBayEnvelopes = ENVELOPES.map((e) => ({
    id: e.id,
    name: e.name,
    planet: e.planet,
    currentCents: e.current,
    targetCents: e.target,
  }));

  // Read engine + pay period + the command palette search
  // index + the last 3 audit events (for the sidebar ticker)
  // concurrently. The index is small (~50 items: 16
  // routes + ~30 dynamic DB rows) and crosses the
  // server→client boundary as a plain JSON object. The audit
  // log read is bounded (3 rows) and uses the same data layer
  // as the audit page; the client component filters the meta
  // events from the initial set on mount.
  const [engineLevel, payPeriod, searchIndex, tickerRows] = await Promise.all([
    getActiveEngineLevel(),
    getCurrentPayPeriod(),
    getSearchIndex(user.id),
    getAuditLog(user.id, { take: 3 }),
  ]);

  return (
    <CommandPaletteProvider searchIndex={searchIndex}>
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", minHeight: "100vh" }}>
        <AppSidebar
          user={{ name: user.name, email: user.email }}
          tickerInitialRows={tickerRows}
        />
        <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <TopAppBar
            engineLevel={engineLevel}
            payPeriod={{ startDate: payPeriod.startDate, endDate: payPeriod.endDate }}
          />
          <main
            style={{
              padding: "40px 80px 112px", // 16px extra for BottomNav
              maxWidth: 1480,
              position: "relative",
              flex: 1,
            }}
          >
            <RebalanceAlertBay envelopes={alertBayEnvelopes} overLimit={overLimit} />
            {children}
          </main>
        </div>
        <BottomNav />
      </div>
    </CommandPaletteProvider>
  );
}
