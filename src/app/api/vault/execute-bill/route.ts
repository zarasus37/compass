/**
 * Dev-only endpoint for the M4 gateway action set.
 *
 * Cluster Vault 4.0 M4. The integration test exercises the
 * 3 server actions end-to-end:
 *   - `POST { action: "execute", billId }`
 *   - `POST { action: "retry",   billId }`
 *   - `POST { action: "confirm", billId, settlementRef }`
 *
 * Gated by `process.env.NODE_ENV === "development"` so a
 * production build cannot expose it. The companion
 * `tests/integration-vault.mjs` is the only intended consumer.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/server/auth/user";
import {
  executeBillPaymentAction,
  retryBillPaymentAction,
  confirmManualPaymentAction,
} from "@/lib/vault/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RequestBody {
  action?: "execute" | "retry" | "confirm";
  billId?: string;
  settlementRef?: string;
}

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  if (!body.billId || typeof body.billId !== "string") {
    return NextResponse.json({ error: "billId is required" }, { status: 400 });
  }
  if (
    body.action !== "execute" &&
    body.action !== "retry" &&
    body.action !== "confirm"
  ) {
    return NextResponse.json(
      { error: "action must be execute | retry | confirm" },
      { status: 400 },
    );
  }
  if (body.action === "confirm" && !body.settlementRef) {
    return NextResponse.json(
      { error: "settlementRef is required for confirm" },
      { status: 400 },
    );
  }

  void user; // user presence is the auth gate; the actions re-resolve via requireUser()
  try {
    if (body.action === "execute") {
      const result = await executeBillPaymentAction(body.billId);
      return NextResponse.json(result);
    }
    if (body.action === "retry") {
      const result = await retryBillPaymentAction(body.billId);
      return NextResponse.json(result);
    }
    // confirm
    const result = await confirmManualPaymentAction(
      body.billId,
      body.settlementRef as string,
    );
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({ error: "POST only" }, { status: 405 });
}
