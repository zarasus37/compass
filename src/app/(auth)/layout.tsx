/**
 * Auth layout — shared shell for /welcome and /login.
 *
 * No nav, no chrome. The brand name lives on the form itself.
 * Centered, single-column. Mobile-friendly.
 */
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { countUsers, getCurrentUser } from "@/server/auth/user";

export default async function AuthLayout({ children }: { children: ReactNode }) {
  // Already signed in? Skip the auth pages entirely.
  const current = await getCurrentUser();
  if (current) redirect("/");

  // /login is the default for everyone. /welcome is only available when
  // there are zero users — we gate the page itself, not the layout.
  const userCount = await countUsers();
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center px-6 py-16">
      {children}
      <p className="mt-12 text-xs text-muted-foreground">
        {userCount > 0
          ? "Already have an account? Sign in above."
          : "First time here? Create your account above."}
      </p>
    </div>
  );
}
