/**
 * Compass Vault — cron alert adapter (Cluster 7.10).
 *
 * When a cron returns `usersFailed > 0` (or any future
 * "users with errors" count), the bulk helper calls
 * `recordCronAlert` for each failed user. This module:
 *   1. Writes a durable `AuditLog` row with actionType
 *      `vault.cron_prune_failure` so the failure shows up in
 *      the audit page table (the user can see the failure).
 *   2. Optionally POSTs a webhook to `CRON_ALERT_WEBHOOK_URL`
 *      (auto-detected: Sentry envelope vs PagerDuty Events
 *      API v2 vs generic JSON) for real-time alerting.
 *
 * The audit row is the source of truth — it's durable,
 * queryable, and visible in the UI. The webhook is a
 * real-time shortcut so ops don't have to check the audit
 * log to know something broke.
 *
 * Failure isolation: a failed webhook does NOT throw — the
 * audit row is the durable record, and we don't want a
 * Sentry outage to fail the cron. Webhook failures are
 * logged to stderr so they're visible in Vercel's logs
 * but don't cascade.
 *
 * Timeout: each webhook call has a 2s hard timeout. Vercel's
 * 10s cron budget is plenty of headroom (the audit row
 * write is sub-100ms, and the webhook is parallel-ish with
 * the rest of the cron's cleanup).
 */
import "server-only";
import { recordVaultAudit } from "./db";
import { prisma } from "@/server/db";

/** Kind of cron failure. Today: prune failures only. Future
 *  cron kinds (vault scheduler errors, etc.) can add to this
 *  union without breaking the alert surface. */
export type CronAlertKind = "prune_failure";

export type CronAlert = {
  userId: string;
  kind: CronAlertKind;
  error: string;
  context: Record<string, unknown>;
  at: string;
};

export type RecentCronAlert = {
  id: string;
  actionType: string;
  payload: Record<string, unknown>;
  createdAt: Date;
};

const WEBHOOK_TIMEOUT_MS = 2_000;

/**
 * Record a cron failure. Writes the audit row FIRST (durable
 * record), then attempts the webhook in parallel. If the
 * webhook fails, the audit row is still there.
 */
export async function recordCronAlert(args: {
  userId: string;
  kind: CronAlertKind;
  error: string;
  context?: Record<string, unknown>;
}): Promise<void> {
  const at = new Date().toISOString();
  const context = args.context ?? {};
  // Durable: write the audit row first. If the user was
  // deleted between the cron start and the alert write,
  // the FK will fail and we silently skip — the user is
  // gone, the alert is moot.
  try {
    await recordVaultAudit({
      userId: args.userId,
      actionType: "vault.cron_prune_failure",
      payload: {
        kind: args.kind,
        error: args.error,
        context,
        at,
      },
    });
  } catch (err) {
    // Most likely cause: user was deleted (FK violation).
    // The cron failure itself is logged via the bulk
    // helper's stderr; we just don't write a dangling
    // audit row.
    // eslint-disable-next-line no-console
    console.error(
      `cron alert: failed to write audit row for userId=${args.userId.slice(0, 8)}…:`,
      err instanceof Error ? err.message : String(err),
    );
    return;
  }
  // Best-effort: send the webhook. Failures are logged but
  // don't throw.
  const url = process.env.CRON_ALERT_WEBHOOK_URL;
  if (!url) return;
  await sendWebhookWithTimeout(url, {
    userId: args.userId,
    kind: args.kind,
    error: args.error,
    context,
    at,
  }).catch((err) => {
    // eslint-disable-next-line no-console
    console.error(
      `cron alert: webhook POST to ${maskUrl(url)} failed:`,
      err instanceof Error ? err.message : String(err),
    );
  });
}

/**
 * Read recent cron alerts for a user. Used by the dev
 * endpoint + the smoke. The smoke writes a fake failure
 * via the dev endpoint, then reads it back to verify the
 * round-trip.
 */
export async function getRecentCronAlerts(
  userId: string,
  limit = 20,
): Promise<Array<RecentCronAlert>> {
  const rows = await prisma.auditLog.findMany({
    where: { userId, actionType: "vault.cron_prune_failure" },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map((r) => {
    let payload: Record<string, unknown> = {};
    try {
      const parsed = JSON.parse(r.payload);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        payload = parsed as Record<string, unknown>;
      }
    } catch {
      // Bad JSON; treat as empty.
    }
    return {
      id: r.id,
      actionType: r.actionType,
      payload,
      createdAt: r.createdAt,
    };
  });
}

/**
 * Send a webhook POST with a hard 2s timeout. The body
 * format is auto-detected from the URL:
 *   - Sentry: URL contains "sentry.io" → Sentry envelope
 *     (the standard `{"event_id", "timestamp", "level",
 *     "message", "exception", "extra"}` shape).
 *   - PagerDuty: URL contains "pagerduty.com" or ends in
 *     "/v2/enqueue" → PagerDuty Events API v2
 *     (the standard `{"routing_key", "event_action",
 *     "dedup_key", "payload": {"summary", "source",
 *     "severity"}}` shape).
 *   - Generic: any other URL → a plain JSON POST
 *     (`{"event", "severity", "message", "details"}`).
 *
 * The receiver is responsible for parsing the body; the
 * `event` field is the same across all three formats so a
 * generic JSON receiver can route on it.
 */
async function sendWebhookWithTimeout(
  url: string,
  alert: CronAlert,
): Promise<void> {
  const body = buildWebhookBody(url, alert);
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "user-agent": "compass-cron-alert/1.0",
  };
  // Sentry expects a specific auth header.
  if (url.includes("sentry.io")) {
    headers["x-sentry-auth"] = `Sentry sentry_version=7, sentry_key=${extractSentryKey(url)}`;
  }
  await Promise.race([
    fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    }).then((res) => {
      if (!res.ok) {
        throw new Error(`webhook responded ${res.status}`);
      }
    }),
    new Promise<void>((_, reject) =>
      setTimeout(
        () => reject(new Error(`webhook timeout after ${WEBHOOK_TIMEOUT_MS}ms`)),
        WEBHOOK_TIMEOUT_MS,
      ),
    ),
  ]);
}

function buildWebhookBody(url: string, alert: CronAlert): unknown {
  const summary = `[${alert.kind}] userId=${alert.userId.slice(0, 8)}… ${alert.error}`;
  if (url.includes("sentry.io")) {
    return {
      event_id: cryptoRandomHex(32),
      timestamp: alert.at,
      platform: "node",
      level: "error",
      logger: "compass.cron.audit-prune",
      message: summary,
      extra: {
        kind: alert.kind,
        userId: alert.userId,
        context: alert.context,
      },
    };
  }
  if (url.includes("pagerduty.com") || url.endsWith("/v2/enqueue")) {
    return {
      routing_key: process.env.CRON_ALERT_PAGERDUTY_ROUTING_KEY ?? "",
      event_action: "trigger",
      dedup_key: `compass-cron-${alert.kind}-${alert.userId}`,
      payload: {
        summary,
        source: "compass-cron",
        severity: "error",
        custom_details: {
          kind: alert.kind,
          userId: alert.userId,
          error: alert.error,
          context: alert.context,
        },
      },
    };
  }
  // Generic JSON — receivers that want Sentry/PD can map
  // from this shape; the `event` field is the discriminator.
  return {
    event: "compass.cron.failure",
    severity: "error",
    message: summary,
    details: {
      kind: alert.kind,
      userId: alert.userId,
      error: alert.error,
      context: alert.context,
      at: alert.at,
    },
  };
}

function extractSentryKey(url: string): string {
  // Sentry DSNs have the form
  // https://<publicKey>@o<orgId>.ingest.sentry.io/<projectId>
  // The "key" is the publicKey; the Sentry auth header
  // expects `sentry_key=<publicKey>`.
  try {
    const u = new URL(url);
    return u.username;
  } catch {
    return "";
  }
}

function maskUrl(url: string): string {
  // Don't log the full URL — it may contain Sentry keys or
  // PagerDuty routing keys in the path. Truncate to the host.
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}/...`;
  } catch {
    return "<unparseable>";
  }
}

function cryptoRandomHex(bytes: number): string {
  // Node's crypto module is available in the server runtime.
  // Fallback to a Date-based pseudo-random if unavailable
  // (defensive — the server runtime always has crypto).
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nodeCrypto = require("node:crypto") as typeof import("node:crypto");
    return nodeCrypto.randomBytes(bytes).toString("hex");
  } catch {
    return (
      Date.now().toString(16) +
      Math.random().toString(16).slice(2, 2 + bytes * 2)
    );
  }
}
