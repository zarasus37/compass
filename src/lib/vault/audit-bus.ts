/**
 * Compass Vault — audit event bus (Cluster 7.6).
 *
 * An in-process Node `EventEmitter` that fans out new `AuditLog`
 * rows to every subscribed SSE route handler. The bus is pinned
 * to `globalThis` so Next.js's dev HMR doesn't create a fresh
 * instance (and drop all subscribers) on every code change.
 *
 * **Single-server assumption.** This bus is local to one Node
 * process. A multi-server / multi-region deploy would need to
 * swap this for a Postgres `LISTEN`/`NOTIFY` trigger — the SSE
 * route handler and the client hook stay the same; only this
 * file changes.
 *
 * **Single writer.** `recordVaultAudit` in `db.ts` is the only
 * place that calls `publishAuditEvent`. Every other writer in
 * the system funnels through `recordVaultAudit`, so emitting a
 * row on the bus is a side effect of the single DB write — no
 * risk of a "row written but not broadcast" path.
 *
 * **Wire contract.** The published payload is the parsed
 * `AuditLogRow` shape (id, actionType, payload as object,
 * aiTierAtTime, createdAtIso) so the consumer doesn't have to
 * re-parse the JSON. The SSE route subscribes, filters by
 * `userId` (and optionally by `billId`), and forwards as
 * `id: <rowId>\ndata: <JSON>\n\n`.
 */
import { EventEmitter } from "node:events";
import type { AuditLogRow } from "./audit-log";

// ──────────────────────────────────────────────────────────────────────
// Wire shape
// ──────────────────────────────────────────────────────────────────────

/**
 * The shape published to the bus. Carries the parsed `AuditLogRow`
 * plus the row's `userId` so subscribers can filter without
 * re-reading the DB. The `createdAtMs` is also exposed as a
 * millisecond timestamp for cheap ordering comparisons in tests.
 */
export type AuditBusEvent = {
  id: string;
  userId: string;
  actionType: string;
  payload: Record<string, unknown>;
  aiTierAtTime: number;
  createdAtIso: string;
  createdAtMs: number;
};

export type AuditEventHandler = (e: AuditBusEvent) => void;

// ──────────────────────────────────────────────────────────────────────
// Bus singleton (pinned to globalThis)
// ──────────────────────────────────────────────────────────────────────

const GLOBAL_KEY = "__COMPASS_AUDIT_BUS__" as const;

type GlobalWithBus = typeof globalThis & {
  [GLOBAL_KEY]?: EventEmitter;
};

/**
 * The shared bus. We attach a generous `setMaxListeners` (50) so
 * multiple SSE subscribers (dev with many tabs open, tests with
 * parallel connections) don't trip Node's default warning at 10.
 * On a single-server deploy this is well within sensible limits.
 */
function getBus(): EventEmitter {
  const g = globalThis as GlobalWithBus;
  if (!g[GLOBAL_KEY]) {
    const bus = new EventEmitter();
    bus.setMaxListeners(50);
    g[GLOBAL_KEY] = bus;
  }
  return g[GLOBAL_KEY]!;
}

// ──────────────────────────────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────────────────────────────

/**
 * Publish a new audit event. Called by `recordVaultAudit` after
 * the Prisma write succeeds. The function is synchronous —
 * `EventEmitter.emit` is sync and the listeners are expected to
 * be fast (an SSE route handler is just writing to a `Response`
 * stream). If a listener throws, we swallow it so a bad SSE
 * subscriber doesn't poison the writer.
 */
export function publishAuditEvent(row: {
  id: string;
  userId: string;
  actionType: string;
  payload: string;
  aiTierAtTime: number;
  createdAt: Date;
}): void {
  const event: AuditBusEvent = {
    id: row.id,
    userId: row.userId,
    actionType: row.actionType,
    payload: parsePayload(row.payload),
    aiTierAtTime: row.aiTierAtTime,
    createdAtIso: row.createdAt.toISOString(),
    createdAtMs: row.createdAt.getTime(),
  };
  try {
    getBus().emit("audit", event);
  } catch {
    // Listener threw. Don't let a bad SSE handler take down the
    // audit-log writer. The row is already in the DB; the listener
    // just won't get the live push. The user's next page load
    // will reconcile.
  }
}

/**
 * Subscribe to audit events. Returns an unsubscribe function
 * (idiomatic for event emitters; the SSE route calls it on
 * `request.signal.aborted`).
 */
export function subscribeAuditEvents(handler: AuditEventHandler): () => void {
  const bus = getBus();
  bus.on("audit", handler);
  return () => {
    bus.off("audit", handler);
  };
}

/**
 * Test-only helper. Returns the number of active subscribers.
 * Used by the smoke to verify cleanup on disconnect.
 */
export function auditBusSubscriberCount(): number {
  return getBus().listenerCount("audit");
}

// ──────────────────────────────────────────────────────────────────────
// Internal
// ──────────────────────────────────────────────────────────────────────

/** Parse the JSON-as-string payload into an object. Same contract
 *  as `audit-log.ts:getAuditLog`: bad JSON → empty object. */
function parsePayload(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // fall through
  }
  return {};
}

/** Re-export the `AuditLogRow` type so consumers can import it
 *  from one place (the bus is the canonical "live event" surface
 *  for the audit log). */
export type { AuditLogRow };
