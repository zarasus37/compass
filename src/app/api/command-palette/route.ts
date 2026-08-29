/**
 * Cluster 7.1 — Command palette server endpoint.
 *
 * Returns the user's search index for the command palette.
 * The endpoint is GET /api/command-palette. When the `q`
 * query param is present, the endpoint also returns the
 * filtered + ranked results in `index.results` so the smoke
 * (and a future network-shared palette) can verify the
 * match logic over HTTP.
 *
 * The palette itself reads the full index as a prop from the
 * layout (server→client JSON-serialized) and filters
 * client-side for instant keystroke feedback. This endpoint
 * is here for two reasons: (1) the smoke verifies the
 * search index shape + match logic end-to-end via HTTP, (2)
 * a future "search across the network" command palette (e.g.
 * on a different device, signed into the same account) has
 * a server-side search path.
 *
 * Auth: requires a signed-in user (the (app) layout's
 * requireUser is the gate). The route is in the (api)
 * group, which is not in the middleware's PUBLIC_PREFIXES,
 * so unauthenticated requests return 401.
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/user";
import { getSearchIndex } from "@/lib/command-palette/search-index";
import { match } from "@/lib/command-palette/match";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "not signed in" },
      { status: 401 },
    );
  }
  const index = await getSearchIndex(user.id);
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? "";
  const results = match(q, [...index.routes, ...index.items]);
  return NextResponse.json({
    ok: true,
    index: {
      routes: index.routes,
      items: index.items,
      total: index.total,
    },
    query: q,
    results: results.map((r) => ({ id: r.item.id, rank: r.rank })),
    resultCount: results.length,
  });
}
