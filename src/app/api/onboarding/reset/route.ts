/**
 * Reset the user's onboarding identity.
 *
 * Cluster 5.1. Triggered by the "Start over" button on the chat
 * completion panel. Wipes the FinancialIdentity row (cascades
 * to child rows + messages) and reloads the page.
 *
 * Auth-required: only the signed-in user can reset their own
 * identity. The cookie-derived userId is the only id used —
 * no body params to prevent CSRF.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/server/auth/user";
import { resetConversation } from "@/lib/onboarding/state";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let user;
  try {
    user = await requireUser();
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  await resetConversation(user.id);
  // The completion panel's <form> posts to this route. Redirect
  // back to /onboarding so the page re-renders with the fresh,
  // empty state.
  return NextResponse.redirect(new URL("/onboarding", req.url), {
    status: 303,
  });
}
