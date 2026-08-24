import * as React from "react";
import { requireUser } from "@/server/auth/user";
import { AppSidebar } from "@/components/sidebar/AppSidebar";
import { BottomNav } from "@/components/shell/BottomNav";
import { TopAppBar } from "@/components/shell/TopAppBar";
import { RebalanceAlertBay } from "@/components/alerts/RebalanceAlertBay";
import { liveEnvelopes, getCurrentPayPeriod } from "@/lib/mock";
import { getActiveEngineLevel } from "@/app/(app)/settings/engine-actions";

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
 * The dashboard (`/`) lives outside this group at the root, so it
 * renders its own TopAppBar + BottomNav + AlertBay explicitly.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

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

  // Read engine + pay period concurrently.
  const [engineLevel, payPeriod] = await Promise.all([
    getActiveEngineLevel(),
    getCurrentPayPeriod(),
  ]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", minHeight: "100vh" }}>
      <AppSidebar user={{ name: user.name, email: user.email }} />
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
  );
}
