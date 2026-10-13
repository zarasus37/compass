import "server-only";
import { prisma } from "@/server/db";
import { JOURNAL_HEALTH_SQL } from "./contract.mjs";

export type ReconciliationFlag = "unverified_opening" | "missing_history" | "missing_opening" | "journal_gap" | "removed_entity" | "uncorrelated" | "mismatch";
export interface ReconciliationPosition {
  readonly kind: "account" | "envelope";
  readonly entityId: string;
  readonly openingCents: string | null;
  readonly expectedCents: string | null;
  readonly storedCents: string | null;
  readonly entryCount: string;
  readonly uncorrelatedCount: string;
  readonly legacyActivityCount: string;
  readonly flags: readonly ReconciliationFlag[];
}
export type ReconciliationResult =
  | { readonly ok: true; readonly data: { readonly cacheConsistent: boolean; readonly positions: readonly ReconciliationPosition[] } }
  | { readonly ok: false; readonly error: "invalid-tenant-id" | "journal-unavailable" | "read-failed" };

interface Row {
  kind: "account" | "envelope"; entityId: string; openingCents: string | null;
  storedCents: string | null; expectedCents: string | null; entryCount: string;
  uncorrelatedCount: string; legacyActivityCount: string; removed: boolean;
  hasPosition: boolean; integrityValid: boolean;
}

// Fixed SQL, bound tenant parameter. SUM(bigint) is exact numeric in Postgres;
// return decimal strings to avoid JavaScript floating-point or JSON BigInt loss.
const POSITIONS_SQL = `
WITH live AS (
 SELECT 'account'::text kind, "id" AS entity_id, "currentBalance"::bigint::text cents FROM public."Account" WHERE "userId"=$1
 UNION ALL
 SELECT 'envelope', "id", "currentBalance"::bigint::text FROM public."Envelope" WHERE "userId"=$1
), positions AS (
 SELECT p.*, l.cents, l.entity_id live_id,
  count(e."id")::bigint n, coalesce(sum(e."deltaCents"),0)::text total,
  count(e."id") FILTER(WHERE ev."kind"='uncorrelated')::bigint unexplained,
  min(e."sequence") first_seq, max(e."sequence") last_seq,
  count(e."id") FILTER(WHERE e."kind"='opening')::bigint openings,
  count(e."id") FILTER(WHERE e."kind"='opening' AND e."sequence"=0 AND e."deltaCents"=p."openingCents")::bigint valid_openings
 FROM public."LedgerPosition" p
 LEFT JOIN live l ON l.kind=p."entityKind" AND l.entity_id=p."entityId"
 LEFT JOIN public."LedgerEntry" e ON e."positionId"=p."id" AND e."userId"=$1
 LEFT JOIN public."LedgerEvent" ev ON ev."id"=e."eventId" AND ev."userId"=$1
 WHERE p."userId"=$1
 GROUP BY p."id",l.cents,l.entity_id
)
SELECT "entityKind" AS kind,"entityId","openingCents"::text,"cents" AS "storedCents",total AS "expectedCents",
 n::text AS "entryCount",unexplained::text AS "uncorrelatedCount","legacyActivityCount"::text,
 (live_id IS NULL) AS removed,true AS "hasPosition",
 (first_seq=0 AND last_seq="lastSequence" AND n="lastSequence"+1 AND openings=1 AND valid_openings=1
  AND (("removedAt" IS NULL AND live_id IS NOT NULL) OR ("removedAt" IS NOT NULL AND live_id IS NULL))) AS "integrityValid"
FROM positions
UNION ALL
SELECT l.kind,l.entity_id,NULL,l.cents,NULL,'0','0','0',false,false,false FROM live l
WHERE NOT EXISTS(SELECT 1 FROM public."LedgerPosition" p WHERE p."userId"=$1 AND p."entityKind"=l.kind AND p."entityId"=l.entity_id)
ORDER BY kind,"entityId"`;

/** Operator DAL only. No UI, bank availability, settlement inference or repairs. */
export async function getLedgerReconciliation(userId: string): Promise<ReconciliationResult> {
  if (typeof userId !== "string" || !userId || userId.trim() !== userId) {
    return Object.freeze({ ok: false, error: "invalid-tenant-id" });
  }
  try {
    return await prisma.$transaction(async tx => {
      const health = await tx.$queryRawUnsafe<{ available: boolean }[]>(JOURNAL_HEALTH_SQL);
      if (health[0]?.available !== true) return Object.freeze({ ok: false as const, error: "journal-unavailable" as const });
      const rows = await tx.$queryRawUnsafe<Row[]>(POSITIONS_SQL, userId);
      let cacheConsistent = true;
      const positions = rows.map(row => {
        const flags: ReconciliationFlag[] = [row.hasPosition ? "unverified_opening" : "missing_opening"];
        if (BigInt(row.legacyActivityCount) > 0n) flags.push("missing_history");
        if (row.hasPosition && !row.integrityValid) flags.push("journal_gap");
        if (row.removed) flags.push("removed_entity");
        if (BigInt(row.uncorrelatedCount) > 0n) flags.push("uncorrelated");
        const matches = row.hasPosition && row.integrityValid && row.expectedCents === (row.storedCents ?? "0");
        if (!matches) { flags.push("mismatch"); cacheConsistent = false; }
        return Object.freeze({ kind: row.kind, entityId: row.entityId, openingCents: row.openingCents,
          expectedCents: row.expectedCents, storedCents: row.storedCents, entryCount: row.entryCount,
          uncorrelatedCount: row.uncorrelatedCount, legacyActivityCount: row.legacyActivityCount,
          flags: Object.freeze(flags) });
      });
      return Object.freeze({ ok: true as const, data: Object.freeze({ cacheConsistent, positions: Object.freeze(positions) }) });
    }, { isolationLevel: "RepeatableRead" });
  } catch (error) {
    const candidate = error && typeof error === "object" && "code" in error ? error.code : undefined;
    const code = typeof candidate === "string" && /^P\d{4}$/.test(candidate) ? candidate : "unknown";
    console.error("[ledger] Reconciliation unavailable", { code });
    return Object.freeze({ ok: false, error: "read-failed" });
  }
}
