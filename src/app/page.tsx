import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { requireUser } from "@/server/auth/user";
import { logoutAction } from "@/app/(auth)/actions";

/**
 * Compass home — signed-in landing.
 * The middleware and `requireUser` together ensure only authenticated
 * users see this. The real dashboard arrives in Step 6; for now this
 * is a "you're in" confirmation with the path forward.
 */
export default async function Home() {
  const user = await requireUser();

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-3xl space-y-10">
        <header className="space-y-3 text-center sm:text-left">
          <p className="text-sm font-medium text-muted-foreground tracking-wide uppercase">
            Compass
          </p>
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">
            Welcome, {user.name}.
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl">
            Signed in as <span className="font-medium text-foreground">{user.email}</span>.
            The dashboard lands in Step 6 — for now, this confirms auth works.
          </p>
        </header>

        <Separator />

        <section className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Auth wired</CardTitle>
              <CardDescription>
                argon2id hashing, server-side sessions, httpOnly cookies.
                Middleware protects every route.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Up next: data model</CardTitle>
              <CardDescription>
                Step 3 — accounts, envelopes, transactions, rules, views, audit log.
                Money in integer cents.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Then: dashboard</CardTitle>
              <CardDescription>
                Step 6 — three starter widgets (NetWorth, RecentTransactions, QuickAdd).
                Drag-and-drop comes in Step 7.
              </CardDescription>
            </CardHeader>
          </Card>
        </section>

        <footer className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
          <Link
            href="/api/health"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Check API health
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className={cn(buttonVariants({ variant: "ghost" }))}
            >
              Sign out
            </button>
          </form>
        </footer>

        <p className="text-xs text-muted-foreground text-center sm:text-left">
          Stage 1 (design) complete. Stage 2 step 2 (auth) complete. See{" "}
          <code className="rounded bg-muted px-1 py-0.5">COORDINATION.md</code>{" "}
          for the build order.
        </p>
      </div>
    </main>
  );
}
