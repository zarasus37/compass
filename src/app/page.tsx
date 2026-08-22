import Link from "next/link";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Compass landing — Stage 2 scaffold.
 * A clean, on-brand placeholder. Real dashboard lands in Step 6.
 */
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-3xl space-y-10">
        <header className="space-y-3 text-center sm:text-left">
          <p className="text-sm font-medium text-muted-foreground tracking-wide uppercase">
            Compass
          </p>
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">
            Your money, guided.
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl">
            A modular, AI-aware personal finance app. Stage 2 (creation) is in
            progress. The shell is up; the features come next.
          </p>
        </header>

        <Separator />

        <section className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Scaffold ready</CardTitle>
              <CardDescription>
                Next.js 16, Tailwind v4, shadcn/ui, Prisma + SQLite, TanStack
                Query, dnd-kit, Recharts.
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Plugin layer in place</CardTitle>
              <CardDescription>
                AI providers, import formats, and widgets all go through
                <code className="mx-1 rounded bg-muted px-1 py-0.5 text-xs">
                  src/plugins
                </code>
                .
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Next: auth + data model</CardTitle>
              <CardDescription>
                Step 2 (email + password) and Step 3 (full schema) ship next,
                per COORDINATION.md.
              </CardDescription>
            </CardHeader>
          </Card>
        </section>

        <footer className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
          <Link
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ variant: "default" }))}
          >
            View the spec
          </Link>
          <Link
            href="/api/health"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Check API health
          </Link>
        </footer>

        <p className="text-xs text-muted-foreground text-center sm:text-left">
          Stage 1 (design) complete. Stage 2 in progress. See{" "}
          <code className="rounded bg-muted px-1 py-0.5">COORDINATION.md</code>{" "}
          for the build order.
        </p>
      </div>
    </main>
  );
}
