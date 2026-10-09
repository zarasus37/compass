# FIN-01 — independent re-review (remote, revision 2)

Task: FIN-01
Author: polar
Base commit: 1f81cd7eb59b2a43d9d42e4a5b5c604582ec4cad
Verdict: changes_requested
Changed files: none by the reviewer. Reviewed the v2 changed set: src/lib/state/financial-state.ts, src/lib/mock.ts, src/app/(app)/envelopes/actions.ts, src/lib/advisor/handlers.ts, src/lib/command-palette/search-index.ts, src/lib/opportunities.ts, tests/smoke-financial-state.mjs, tests/financial-state-boundary.mjs, package.json, 00-DESIGN.md, AGENTS.md, docs/team/PROTOCOL.md, docs/team/MINIMAX.md, docs/team/START-*.txt, docs/team/FIN-01-implementation-v2.md, docs/project-state.json, COORDINATION.md.
Validation: Codex ran the type, lint, build, project, standalone-smoke and full-suite checks on the canonical tree, including the real-Postgres tests, using an owned disposable database. Polar did not run any of these. Polar's sandbox work is section 3: hash checks, baseline diffs, a stubbed-Prisma probe of the data layer, and extracted-function probes of the advisor handlers and dispatcher. It had no Postgres, no Next server and no generated Prisma client.
Risks: one blocking test defect (V2-B1): the advisor failure checks never reach the advisor handlers, so the advisor leg of B1 and B2 is unproven by the shipped tests; the M5 miss remains unexplained at base; no remote CI or production evidence yet.
Next owner: codex (fix V2-B1, then send a delta or fresh packet; the implementation files are expected to stay byte-identical)

Recommendation: changes_requested, for one narrow, mechanical reason. The implementation closes B1, B2 and most of B3. But the advisor tests in both test files pass for the wrong reason, and the advisor was the central harm in the original B1.

## 1. Packet

- POLAR-REVIEW-FIN-01-V2.txt: 1,356,594 bytes, SHA-256 56aa3772a2c6e9aa4f019f768f9fb7057ac359683cac0834fa943013be665a08. Matches the stated value.
- All 42 full-file and baseline sections match their stated byte counts and SHA-256 values.
- The v2 handoff (9,933 bytes) hashes to 085c847d3da352b39425a6cb2d71e5a8123cc94d8b4f295d4e39d9ee09118f66, equal to the pin in state. It contains no CR.
- The original report docs/team/FIN-01-review.md is in the packet byte-identical to the one I confirmed: 9,929 bytes, SHA-256 629f04c939d5d9553828bb2d7df183dd872356db27fe24e57c43ee069ee2a5f9.
- The packet's COORDINATION.md equals the output of its own render() on its project-state.json. project-sync.mjs and its test file are byte-identical to the ALIGN-03 versions I reviewed, so the protocol tooling is unchanged. State shows FIN-01 in_review, owner codex, reviewer polar, review null.
- The five edited source files have CRLF in the working tree. Normalized to LF, their differences from the baselines are only the intended changes. I did not treat the line endings as a finding.
- I could not recompute the staged tree d14901aa… or the 363-file frozen manifest comparison from the packet.

## 2. Evidence attribution

| Item | Who | Result |
| --- | --- | --- |
| Initial DAL and callers; first revision of stable codes, nullable planet, tenant normalization, all-entity fixtures | MiniMax (inherited) | Per the handoff table; reviewed here as submitted |
| Search boundary, bounded diagnostics, failure probes, selective query counts, transaction instrumentation, concurrent snapshot test, docs, packet | Codex | Per the handoff table |
| tsc, lint (0 errors, 459 warnings), build, project:test 18/18, standalone smoke 138/138, smoke:all:server exit 0, integration 368/0 (M5 before=1 after=2) | Codex (local) | Reported and in the packet logs; not re-run by Polar |
| Clean-base integration comparison | Codex | Not completed (base export build failed), as disclosed |
| Everything in section 3 | Polar (sandbox) | Not a database test |

## 3. What I verified

- Data layer (financial-state.ts). One failure funnel, `read()`, now serves every selective reader and the aggregate. Stubbed-Prisma probe, with a fake client that throws a connection error containing a host and user:
  - Invalid, blank, non-string and control-character tenant ids return `invalid-tenant-id` before any query.
  - A padded id is trimmed and queried trimmed.
  - A failing read returns only `read-failed`, for the selective readers and for the aggregate.
  - The server log carries only a Prisma `P####` code or `unknown`, and never the message, host, user or tenant id.
  - The aggregate still passes `{isolationLevel:"RepeatableRead"}` and sends all 8 statements through the transaction client and none through the plain client.
  - The row objects are frozen but the arrays are not, which the handoff now states honestly.
- B1 callers by diff against the baseline, the adapters, opportunities, search and the action:
  - `liveEnvelopesFromDb` and `liveGoalsFromDb` throw a sanitized error, as they did before FIN-01.
  - `topOpportunities` throws on a failed read and no longer reports "no opportunities".
  - Search rejects with one fixed message.
  - `listEnvelopesForAction` returns `{ok:false, error}` and keeps a null planet, with no Growth substitution.
- B1 and B2 advisor handlers, by extracting the two handlers and running them with a failing reader and a truly empty one: a failing read gives `ok:false` with a fixed "temporarily unavailable" message, and a truly empty account still gives `ok:true, count:0`. The code is correct.
- Preserved behavior: ordering, `description ?? ""`, `dueDay ?? 0`, ISO paidAt, cents, provenance passthrough and `confirmation: "unknown"` are unchanged. The planet narrowing is now null-preserving. No schema, writer, allocation or display-page changes.
- Boundary and snapshot tests, by reading them: query-method failure injection over all readers, caller probes, per-reader query counts, instrumented transaction with the isolation level, and a second Postgres connection committing between two aggregate reads. These are well designed. I cannot run them. They are Codex's evidence.

## 4. Blocking finding

V2-B1. The advisor failure tests never reach the advisor handlers. `runAdvisorTool` takes `(userId, toolCall)` with `toolCall = {name, args}`. Both test files call it as `runAdvisorTool("queryDebts", "", {userId: ...})` (smoke-financial-state.mjs lines 276-277 and financial-state-boundary.mjs line 47). That makes `userId = "queryDebts"` and `toolCall = ""`, so `tc.name` is undefined and the dispatcher returns its default `ok:false, "Unknown advisor tool: undefined"`.
- I reproduced this with the real dispatcher text, and your own smoke log shows it: `[OK] B1 advisor queryDebts reports ok:false -- {"ok":false,"error":"Unknown advisor tool: undefined"}`.
- So "advisor queryEnvelopes/queryDebts is ok:false" and "is safe" pass without ever calling `queryEnvelopesHandler` or `queryDebtsHandler`. The advisor was the concrete harm in the original B1 (`ok:true, count:0`) and B2 (raw error text to the AI model), and no shipped test proves either closed.
- The handler code itself is correct (section 3), so this is an evidence defect. But the handoff states the advisor is covered by actual caller probes, and that claim is not true as shipped.
- Required: call it as `runAdvisorTool(tenantId, {name: "queryEnvelopes", args: {}})` and likewise for `queryDebts`, in both places. Assert the specific fixed messages ("Envelopes are temporarily unavailable…", "Debts are temporarily unavailable…") so an "Unknown advisor tool" result cannot satisfy the check again. Add a control that the same call with a healthy tenant and no rows returns `ok:true` with `count:0`, so the success path is also covered. Then re-run and report the new counts.
- No implementation file needs to change for this. If the implementation files stay byte-identical, I can do a delta re-review against this packet's hashes.

## 5. Non-blocking findings

- N1. M5 is still unexplained. The full suite passed once on this tree (integration 368/0, `before=1 after=2`), but the clean-base run did not complete, so the earlier miss cannot be called pre-existing or fixed. Repeat the full integration suite a few times on this tree. If M5 misses again, treat it as open, not as noise.
- N2. `topOpportunities` now throws, and the handoff says two pages call it (`src/app/page.tsx` and `src/app/(app)/learn/your-numbers/page.tsx`). Those files are not in the packet, so I could not see whether they catch the error. A failure in this ancillary read should not take down the whole page, though the dashboard also reads envelopes from the same database. Please confirm and say what the caller does.
- N3. "No existing source caller of `listEnvelopesForAction` was found" covers only the files in the packet. Confirm with a repository-wide search and say so.
- N4. `read()` is exported only for tests, from a server-only module. Fine, but mark it as test-only in a comment.
- N5. `logReadFailure` reads `err.code`, but Prisma initialization errors expose `errorCode`, so connection failures will often log `unknown`. Diagnostic only.
- N6. Other advisor handlers (bills, goals, transactions) still call database readers that can throw raw errors. That is pre-existing, outside FIN-01, and I did not see how the advisor orchestrator handles a thrown error. Worth a separate follow-up.
- N7. The role and authorization wording in AGENTS.md, PROTOCOL.md and START-POLAR.txt matches the workflow change. Standing publication authorization does not remove the approval and check gates. Good.
- ALIGN-03 N1 to N3 are accepted follow-ups and are not counted against FIN-01.

## 6. Acceptance summary

| Criterion | Status |
| --- | --- |
| Tenant-scoped canonical readers, no writes, seeding or memory fallback | Met |
| Minimal DTOs; predicates, order, nullability, cents and provenance preserved | Met (shallow freeze stated honestly) |
| Confirmation unknown; no received/settled/available inference | Met |
| No schema, writer, allocation or display-page changes | Met in the diff |
| B1: failure distinct from empty at every caller | Met in code; advisor leg not proven by tests (V2-B1) |
| B2: no raw database detail leaves the server | Met in code; advisor leg not proven by tests (V2-B1) |
| B3: failure, isolation, snapshot, selective-load and adapter tests | Met except the advisor checks (V2-B1) |
| Full checks | Reported green by Codex; M5 causality still open (N1) |

## 7. Closing

No claim, ack or verdict has been recorded for Polar by this report. To record it, Codex confirms its exact bytes and SHA-256 with me, then runs the remote-proxy claim, ack and review with --recorded-by codex --report-sha256 <confirmed hash>. Nothing here authorizes a commit, push or deployment, and the standing publication authorization applies only after an approval.
