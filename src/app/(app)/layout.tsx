import * as React from "react";
import { requireUser } from "@/server/auth/user";
import { AppSidebar } from "@/components/sidebar/AppSidebar";
import { BottomNav } from "@/components/shell/BottomNav";
import { TopAppBar } from "@/components/shell/TopAppBar";
import { RebalanceAlertBay } from "@/components/alerts/RebalanceAlertBay";
import { liveEnvelopes } from "@/lib/mock";

/**
 * App shell — the signed-in layout. Wraps every page in the (app)
 * route group with:
 *   - the 3-chapter sidebar (D13, on the left)
 *   - the persistent top bar (Cluster 3.x — branding, pay period,
 *     engine toggle)
 *   - the contextual rebalance alert bay (Cluster 3.x Component 3 —
 *     surfaces over-limit envelopes with a [ Balance Envelope ]
 *     button that opens a slide-in rebalance drawer)
 *   - the persistent bottom nav (Bottom 30% per the Front-End
 *     Architecture Layout Rules — Quick Entry / Advanced Analytics
 *     / Settings)
 *
 * Middleware + this layout together ensure only authenticated
 * users reach here. The bottom-padding on <main> reserves space
 * for the fixed BottomNav so the last row of any page stays
 * tappable.
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

  // Live envelope state — drives the alert bay. Force-dynamic so the
  // bay reflects the latest rebalance / paycheck allocation immediately
  // after a server action.
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

  return (
    <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", minHeight: "100vh" }}>
      <AppSidebar user={{ name: user.name, email: user.email }} />
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <TopAppBar />
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
