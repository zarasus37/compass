/**
 * POST /api/vault/sync — trigger the seed.
 *
 * Phase 2.0 internal endpoint. Triggers `seedVaultFromEnvelopes`
 * for the current user. Idempotent. Returns the seed result as
 * JSON. Also callable as a CLI via `curl -X POST /api/vault/sync`.
 *
 * NOT exposed in the navigation. The user-facing path is the
 * SyncButton on /vault (server action). This endpoint exists
 * for the integration smoke and for any future CLI tooling.
 */

import { NextResponse } from "next/server";
import { syncVaultAction, clearVaultAction } from "@/lib/vault/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // Optional `?action=clear` runs the clear instead of the seed.
  // Used by the integration test to reset state between cases.
  const url = new URL(req.url);
  if (url.searchParams.get("action") === "clear") {
    const result = await clearVaultAction();
    return NextResponse.json(result);
  }
  const result = await syncVaultAction();
  return NextResponse.json(result);
}
