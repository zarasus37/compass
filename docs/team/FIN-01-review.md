# FIN-01 — independent review (remote)

Task: FIN-01
Author: polar
Base commit: 1f81cd7eb59b2a43d9d42e4a5b5c604582ec4cad
Verdict: changes_requested
Changed files: none by the reviewer. Reviewed the handoff's changed set: src/lib/state/financial-state.ts (new), tests/smoke-financial-state.mjs (new), src/lib/mock.ts, src/app/(app)/envelopes/actions.ts, src/lib/advisor/handlers.ts, src/lib/command-palette/search-index.ts, src/lib/opportunities.ts, package.json, 00-DESIGN.md, docs/team/FIN-01-implementation.md, docs/project-state.json, COORDINATION.md.
Validation: Codex ran the local project checks (project:check, project:test 18/18, both diff whitespace checks, remote comparison 0/0). MiniMax reported env-check, tsc, lint, build and the 42-check DB smoke; Polar did not observe those. Polar's sandbox work is a packet-hash check, a baseline comparison, a source read and a stubbed-Prisma probe (section 3). It has no Postgres, no Next server and no generated Prisma client.
Risks: three blockers below (false-empty on read failure, raw database errors reaching the advisor, evidence gaps); the unexplained M5 integration miss; no real concurrent-snapshot proof.
Next owner: minimax (fresh complete handoff, then a new independent review)

Recommendation: changes_requested. The core data layer is sound and well scoped: tenant guard, explicit RepeatableRead, raw provenance, no inference, no writes. But the read-failure path regresses existing behavior and leaks internals, and the tests do not show the failure path at all.

## 1. Packet

- POLAR-REVIEW-FIN-01.txt: 911,496 bytes, SHA-256 cb84dd2b228361edfb08cb6e04cb8f07b5f97e46c295e2f7f6f22568ca0d64ee. Matches the stated value.
- All 36 full-file and baseline sections match their stated byte counts and SHA-256 values (30 working files, 6 baselines, plus the installed Next data-security guide).
- The handoff section hashes to 9df38019c8c5a79500d5ec425141289a1c3beddb0aef4df9ffac055e1f1c5c1f, which equals the pin in the unstaged state diff, and it contains no CR.
- Working-tree copies of five edited source files have CRLF, but their staged diffs are small and line-ending-neutral. I treated this as a Windows checkout artefact and not a finding. The new files are LF.
- The handoff's "Verdict:" line is empty, as expected for an implementation handoff.
- I could not recompute the staged tree 0abfb5d7… or the contentDigest values from the packet.

## 2. Evidence attribution

| Item | Who | Result |
| --- | --- | --- |
| project:check, project:test 18/18, diff --check x2, origin comparison | Codex | Reported, not re-observed by Polar |
| env-check, tsc, lint, build, 42-check smoke | MiniMax | Reported in the handoff only |
| smoke:all:server | MiniMax | Failed: M5 vault.bill_history_viewed before=1 after=1 (367 pass / 1 miss) |
| Hash check, baseline comparison, source read | Polar (sandbox) | section 3 |
| Stubbed probe of financial-state.ts | Polar (sandbox, esbuild bundle, fake Prisma, Node 20) | section 3; not a database test |

## 3. What I verified

- financial-state.ts: tenant ids are validated (non-string, blank, over 128 chars, control characters rejected) before any Prisma call. Every query filters by userId, and rules are fetched through the tenant's plan. NULL-owner pay periods are excluded. Output is tagged ok true/false.
- Stubbed probe: blank and undefined tenants return ok:false without touching the stub. The aggregate calls `$transaction` with `{isolationLevel:"RepeatableRead", timeout:10000}`, all 8 statements go through the transaction client, and zero go through the plain client. This is stronger than the smoke's source regex, but it is still a stub and not a real snapshot.
- Preserved behavior: orderBy for envelopes, goals, accounts, bills and debts matches the baseline adapters; `description ?? ""`, `dueDay ?? 0` and `paidAt` as an ISO string match; `perPaycheckCents: 0` is retained; opportunities predicates are unchanged in the diff (threshold, `planet === "mars"` exclusion, `targetCents <= 0`).
- Scope: no schema, writer, allocation or display-page changes in the diff. The deferred readers are disclosed.
- Debts: /debts already reads the DB through `liveDebtsFromDb`, so moving the advisor and palette to the DB aligns them with what the page shows. The memory-store readers also seed persona data, which the new path avoids.

## 4. Blocking findings

B1. A database failure now looks like an empty account. Before FIN-01, `liveEnvelopesFromDb` and `liveGoalsFromDb` threw on a DB error (a bare `prisma.findMany`). Now each logs and returns `[]`. `listEnvelopesForAction` does the same, and `topOpportunities` silently drops envelope opportunities. Concrete harm in the packet: the advisor's `queryEnvelopesHandler` calls `liveEnvelopesFromDb`, so during an outage it returns `ok:true, count:0, "Returned 0 envelope(s)"`. The handler header says empty means "you have no bills", so the advisor can tell mom she has no envelopes. Existing defensive-read and section-error smokes were written for the throwing behavior, and the packet does not show them still passing. The state fact "failure is a tagged result distinct from empty" is true in the DAL and false at the callers. Required: failure must stay distinguishable at every changed caller. Options that satisfy this: the adapters rethrow a sanitized error as before; the action returns a typed error result; the advisor handlers return `ok:false`; opportunities returns or flags the failure. Show the previously throwing callers behave as before.

B2. Raw database errors are exposed. `attempt()` and the tenant catch return `err.message` verbatim. In the probe, a connection failure produced a result containing the Prisma invocation text, the database host and the user name. `queryDebtsHandler` puts that string in `publicView.error`, which is serialized to the LLM, and the LLM's reply goes to the user. Every other error string in handlers.ts is a fixed message. Required: the DAL returns a stable code such as `read-failed` or `invalid-tenant-id`; the detail is logged server-side only. The same applies to the `console.error` lines, which should not log tenant data.

B3. The tests do not prove the acceptance items they are cited for.
- No test induces a read failure, so "empty vs DB failure distinct" is unproven. The invalid-tenant tests are not DB failures.
- Two-tenant isolation covers envelopes, debts and one transaction path. Goals, accounts, bills, plan, rules and the stored period have no cross-tenant row in the fixtures, though all are in the aggregate.
- The goal adapter check runs against a tenant with no goals, so it proves nothing about shape.
- The selective-reader check only tests that the functions exist, and the snapshot check is a source regex. The jupiter fallback has no test.
- Required: failure-injection tests for B1 and B2, isolation rows for every entity in the aggregate, and a goal adapter check with a real goal. A true concurrent-snapshot test is desirable but not required; if it is omitted, say that RepeatableRead is verified by source and stub only.

## 5. Non-blocking findings

- N1. The M5 miss (`vault.bill_history_viewed`) is unexplained. The page imports none of the changed files directly, but I could not rule out a transitive import from the packet, and the "seen before FIN-01" log is not in it. Rerun smoke:integration on clean base 1f81cd7 and again on this change, and report both. Do not call it pre-existing without that.
- N2. Unassigned planet. Substituting `"jupiter"` (Growth) for a null planet in `listEnvelopesForAction` preserves the type but changes the meaning: an unassigned vessel is presented as Growth. Prefer widening the action's return type to `PlanetId | null` and handling null in the consumer. The `as PlanetId` cast in the two mock.ts adapters keeps the old shape and is acceptable for this scope.
- N3. Immutability claims. Only the row objects and the aggregate object are frozen; the arrays and the Date values are not. Either freeze the arrays or soften the "frozen DTO" wording.
- N4. A tenant id with surrounding spaces passes validation but is queried untrimmed. Harmless, but trim or reject it so validation and query agree.
- N5. A leftover truncated comment in search-index.ts, "The Debt model is still in the in-memory store (no Prisma", now sits above the FIN-01 comment and is wrong.
- N6. `transaction.cleared` defaults to true and is passed through; the DTO comment is clear, but the `confirmation: "unknown"` literal is attached to every row, including expenses. Fine for now; revisit with FIN-05.
- N7. Interactive-transaction concurrency: `Promise.all` inside the transaction depends on the driver serializing statements on one connection. The stubbed probe cannot test this. The Prisma/driver docs or a real run should confirm it.
- ALIGN-03 N1 to N3 are accepted follow-ups and are not counted against FIN-01.

## 6. Acceptance summary

| Criterion | Status |
| --- | --- |
| Server-only tenant-scoped readers, no writes, seeding or memory fallback | Met in the DAL |
| Minimal DTOs; predicates, order, nullability and cents preserved | Met for what the packet shows (N2, N3 minor) |
| Raw provenance; confirmation unknown; no received/settled/available inference | Met |
| No schema, writer, allocation or display migrations | Met in the diff |
| Empty vs failure distinct and safe | Not met (B1, B2) |
| Two-tenant, empty, failure, restart, adapter and snapshot tests | Partly met (B3) |
| Full checks green | Not shown: M5 miss unexplained (N1) |

## 7. Closing

No claim, ack or verdict has been recorded for Polar. After the fixes, MiniMax hands off again, Codex sends a new packet, and I review it fresh. To record this report, Codex confirms its exact bytes and SHA-256, then runs the remote-proxy claim, ack and review with --recorded-by codex --report-sha256 <confirmed hash>. Nothing here authorizes a commit, push or deployment.
