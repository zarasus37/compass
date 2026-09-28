/**
 * Server-side `safeSection` capture helpers — shared bits.
 *
 * Cluster 7.52 — `safeSection` (Cluster 7.43's in-file helper
 * on `/envelopes/[id]`) and the defensive try/catch on
 * `/envelopes` (Cluster 7.44) both want to capture server-side
 * throws to the ClientError table before returning the fallback.
 * The capture *call shape* is identical between the two pages,
 * so it's extracted here — but the try/catch wrappers themselves
 * stay in-file so the existing 7.43 + 7.44 smokes still find
 * the exact patterns they assert.
 *
 * What lives here:
 *   - `recordSectionThrow(ctx, section, err)` — single fire-and-
 *     forget call to the ClientError table with the page's
 *     context pre-filled.
 *   - `SectionErrorFallback` — the calm section-error card shared
 *     by both pages (so the visual matches across `/envelopes`
 *     and `/envelopes/[id]`).
 */

import * as React from "react";
import Link from "next/link";
import { recordClientError } from "@/lib/client-error";

/**
 * Page-level context for `recordSectionThrow`. The caller
 * supplies these once per page; the helper fills in the
 * section-specific fields per call.
 */
export type SafeSectionContext = {
  pathname: string;
  envelopeId?: string | null;
  userId?: string | null;
};

/**
 * Best-effort fire-and-forget call to the ClientError table.
 * Returns a Promise<void> the caller should `void` — we don't
 * want the page render to block waiting on the DB write.
 */
export function recordSectionThrow(
  ctx: SafeSectionContext,
  section: string,
  err: unknown,
): void {
  const message =
    err instanceof Error ? err.message : String(err).slice(0, 1024);
  const stack = err instanceof Error ? err.stack : null;
  const errorName = err instanceof Error ? err.name : "Error";
  void recordClientError({
    userId: ctx.userId ?? null,
    // Server-side throws don't carry a Next.js digest —
    // synthesize one from `pathname:section:errorname:message`
    // so dedup still groups "same section failing the same way"
    // into a single row.
    digest: `srv:${ctx.pathname}:${section}:${errorName}:${message.slice(0, 200)}`,
    message: `[${section}] ${errorName}: ${message}`,
    stack,
    // Server captures don't have a real URL — use the
    // pathname twice so the dedup index still works.
    url: ctx.pathname,
    pathname: ctx.pathname,
    envelopeId: ctx.envelopeId ?? null,
    source: "server-safe-section",
    payloadJson: { section, errorName },
  });
}

/**
 * SectionErrorFallback — calm fallback when a section throws.
 * Visual contract: terminal-orange left rail, monospace caps,
 * no stack trace, no raw error message. Mirrors the calm-error
 * voice used elsewhere.
 *
 * Imported as `SafeSectionFallback` by both envelope pages and
 * aliased to `SectionErrorFallback` to keep call-site naming
 * consistent with prior clusters.
 */
export function SafeSectionFallback({ section }: { section: string }) {
  return (
    <div
      data-testid={`section-error-${section.toLowerCase().replace(/\s+/g, "-")}`}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderLeft: "3px solid var(--vessel-watch)",
        borderRadius: 4,
        padding: "16px 20px",
        marginBottom: 32,
        fontFamily: "var(--font-jetbrains), monospace",
        fontSize: 12,
        color: "var(--ink-3)",
      }}
    >
      <div
        style={{
          fontSize: 9.5,
          fontWeight: 600,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--vessel-watch)",
          marginBottom: 4,
        }}
      >
        [WARN] {section} unavailable
      </div>
      <div style={{ color: "var(--ink-2)" }}>
        This section couldn&apos;t render. The rest of the page
        is intact — try a hard refresh, or jump to{" "}
        <Link href="/envelopes" style={{ color: "var(--vessel-accent)" }}>
          all envelopes
        </Link>{" "}
        and come back.
      </div>
    </div>
  );
}
