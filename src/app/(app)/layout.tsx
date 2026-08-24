import * as React from "react";
import { requireUser } from "@/server/auth/user";
import { AppSidebar } from "@/components/sidebar/AppSidebar";
import { BottomNav } from "@/components/shell/BottomNav";

/**
 * App shell — the signed-in layout. Wraps every page in the (app)
 * route group with:
 *   - the 3-chapter sidebar (D13, on the left)
 *   - the persistent bottom nav (Bottom 30% per the Front-End
 *     Architecture Layout Rules — Quick Entry / Advanced Analytics
 *     / Settings)
 *
 * Middleware + this layout together ensure only authenticated
 * users reach here. The bottom-padding on <main> reserves space
 * for the fixed BottomNav so the last row of any page stays
 * tappable.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  return (
    <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", minHeight: "100vh" }}>
      <AppSidebar user={{ name: user.name, email: user.email }} />
      <main
        style={{
          padding: "48px 80px 112px", // extra 16px for BottomNav
          maxWidth: 1480,
          position: "relative",
        }}
      >
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
