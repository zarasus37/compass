import * as React from "react";
import { requireUser } from "@/server/auth/user";
import { AppSidebar } from "@/components/sidebar/AppSidebar";

/**
 * App shell — the signed-in layout. Wraps every page in the (app)
 * route group with the 3-chapter sidebar (D13). Middleware + this
 * layout together ensure only authenticated users reach here.
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
          padding: "48px 80px 96px",
          maxWidth: 1480,
          position: "relative",
        }}
      >
        {children}
      </main>
    </div>
  );
}
