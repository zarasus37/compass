# FIN-01 — Codex completion and implementation handoff

Task: FIN-01
Author: codex
Base commit: 1f81cd7eb59b2a43d9d42e4a5b5c604582ec4cad
Changed files: see exact list below; this handoff covers inherited uncommitted MiniMax work plus Codex completion.
Validation: Codex local checks below; Polar remains the independent remote reviewer. No FIN-01 remote CI or production verification yet.
Risks: the clean-base runtime comparison could not complete; M5 causality remains unresolved. See verification boundaries below.
Next owner: polar

## Authorship and submitted tree

| Work | Author / runner | Attribution |
| --- | --- | --- |
| Initial DAL, changed callers, package smoke entry, DR-FIN-01 | MiniMax | Inherited partial implementation, preserved in the shared checkout. Original handoff remains unchanged. |
| Stable error codes, caller propagation, nullable planet, tenant normalization, all-entity fixtures | MiniMax | Partial revision inherited at ownership transfer; independently inspected and completed by Codex. |
| Safe search boundary, bounded diagnostics, actual query/caller failure probes, selective query counts, transaction instrumentation and concurrent Postgres snapshot | Codex | Completion for B1–B3, not a MiniMax or Polar local run. |
| Role/authorization documentation, state evidence, this report, packet and publication | Codex | User-directed two-agent workflow and standing publication authorization. |
| Type, lint, build, project tests, standalone and full runtime checks below | Codex | Actual commands on the canonical tree, with the runtime suite using an owned disposable loopback database. |
| Initial independent changes_requested report | Polar | Remote independent review; recorded locally by Codex through the proxy workflow. |

HEAD and fresh origin/main matched the base, ahead 0 / behind 0. Existing staged work was preserved during takeover; the initial staged tree was 0abfb5d76f470533cd08af96e23f154833cf962f. The final staged implementation and exact full working files are in the fresh packet. No local branch or worktree was created. No FIN-01 commit/push/merge/deployment occurred before this handoff.

Preserved original evidence:
- docs/team/FIN-01-implementation.md: SHA-256 9df38019c8c5a79500d5ec425141289a1c3beddb0aef4df9ffac055e1f1c5c1f (MiniMax).
- docs/team/FIN-01-review.md: SHA-256 629f04c939d5d9553828bb2d7df183dd872356db27fe24e57c43ee069ee2a5f9, 9,929 LF bytes (Polar changes_requested).

## Work and decisions

B1: A database read failure remains a failure through every changed caller. The legacy envelope/goal adapters reject with stable codes. Opportunities rejects instead of recommending from empty data. Search rejects with one fixed message, including errors from its existing direct-query branches. Advisor envelope/debt results are ok:false with fixed retry messages. The envelope action returns a typed read-failed result; a successful empty result remains distinct.

B2: The DAL returns only read-failed or invalid-tenant-id. Its explicit server diagnostics retain only a bounded Prisma code matching P plus four digits, otherwise unknown. Raw exception messages, host/user credentials, tenant values and invocation text are omitted. Actual caller probes inject a synthetic connection error containing those values and verify safe results, rejections and logs. This does not claim a real network outage was induced.

B3: Fixtures now seed both tenants across envelopes, goals, transactions, accounts, bills, debts, allocation plan/rules and stored periods. The populated goal adapter is compared to its actual seeded rows. Query-method failure probes exercise all selective readers and aggregate plus every changed caller. Query counters prove each selective reader stays selective. Transaction instrumentation proves aggregate queries use its transaction client and RepeatableRead. A separate real Postgres connection commits owned-fixture envelope/account balance changes after the first snapshot query but before the late account query; aggregate reads retain the original snapshot while the separate connection sees the commit. Owned values are restored and fixtures are cleaned by tracked IDs.

The action probe bundles the actual action/DAL and stubs only session and Prisma boundaries. It verifies typed query failure and null planet preservation; it is not an authenticated Next request. Source assertions remain supplementary and are labelled as such.

DR-FIN-01 preserves raw provenance and confirmation unknown, with no settlement inference; existing expense/auto predicates remain separate. DR-FIN-04 records Codex completion and its evidence boundaries. DR-OPS-01 records the user's standing authorization to commit/push completed changes and deploy intended releases, after independent approval/checks. No schema, production writer, allocation, transaction/calendar/vault display or migration change.

## Exact changed paths

- 00-DESIGN.md
- AGENTS.md
- COORDINATION.md (generated)
- docs/project-state.json
- docs/team/FIN-01-implementation.md (preserved MiniMax report)
- docs/team/FIN-01-review.md (preserved Polar report)
- docs/team/FIN-01-implementation-v2.md (this report)
- docs/team/MINIMAX.md
- docs/team/PROTOCOL.md
- docs/team/START-MINIMAX.txt
- docs/team/START-POLAR.txt
- package.json
- src/app/(app)/envelopes/actions.ts
- src/lib/advisor/handlers.ts
- src/lib/command-palette/search-index.ts
- src/lib/mock.ts
- src/lib/opportunities.ts
- src/lib/state/financial-state.ts
- tests/smoke-financial-state.mjs
- tests/financial-state-boundary.mjs

## Acceptance evidence

- Tenant isolation: all entities have distinguishable two-tenant rows; selective and aggregate results match their own tenant. Invalid/control tenant IDs fail before queries, surrounding spaces normalize consistently.
- Cents/order/nullables: seeded DTO and legacy adapter assertions; baseline caller sections supplied in packet. The action now preserves PlanetId | null rather than inventing jupiter/Growth.
- Canonical reads: selective request-cached DB readers and coherent aggregate; no memory fallback, seeding or production writes. Fresh-process probe confirms persistence.
- Provenance: raw source round-trips, cleared passes through, confirmation stays unknown. The marker also appears on expenses; it asserts no settlement knowledge for any row and introduces no income inference.
- Failure vs empty: actual query methods fail with a valid tenant; every reader/caller is tested. Separate empty-tenant success remains empty.
- Snapshot and selective loading: runtime instrumentation plus the concurrent Postgres test above, not only regex checks.
- Fixture safety: UUID-owned rows, no sweepStaleFixtures(), tracked cleanup, final zero-owned-users/periods assertions. Full suite runs on an owned disposable database, never the user's account database.

## Validation — Codex local runs

- pnpm project:env-check: clean CLI/runtime target alignment before runtime jobs.
- pnpm tsc: exit 0.
- pnpm lint: exit 0; 0 errors, 459 baseline warnings.
- pnpm build: exit 0.
- pnpm project:test: 18 passed, 0 failed, 0 skipped.
- Standalone financial-state smoke: 138 passed, 0 missed, including fixture cleanup.
- Full suite: pnpm smoke:all:server exit 0; all data/UI/integration/deploy-environment chains passed. Integration 368 passed / 0 missed; M5 audit event before=1 after=2. FIN-01 smoke in-chain 138/138. Owned disposable database removed after completion.
- project:check and final staging checks: project:check, encoding, git diff --check and staged snapshot check clean before handoff.

Command output is supplied in the fresh packet with attribution. The production build preceded only comment/format corrections. Type/lint/build are local evidence; remote CI and deployment status are pending publication after approval.

## Risks and non-blocking findings

N1: The earlier M5 vault.bill_history_viewed miss is not established as pre-existing. A pristine base export could not build: Turbopack rejected an external dependency junction; the webpack fallback failed a baseline SetupProgress page-export type check. Consequently no clean-base integration comparison completed. The fresh revised full-suite outcome above is evidence for this tree only; it does not establish M5's mechanism or causality.

N2: Nullable planet is preserved in the action contract and exercised at the actual action boundary. Search already tolerates null labels. No existing source caller of listEnvelopesForAction was found.

N3: Immutability is explicitly shallow. Row DTOs/aggregate are frozen, arrays and Dates remain mutable; no stronger claim is made. N4: tenant whitespace is normalized and control characters rejected before queries. N5: the truncated search comment is replaced. N6: unknown confirmation is intentionally non-assertive on all transactions. N7: the aggregate retains Promise.all; Prisma documents that queries on a transaction's single connection execute serially (https://www.prisma.io/docs/orm/v7/prisma-client/queries/transactions). Snapshot correctness is additionally exercised against Postgres; no parallel execution guarantee is claimed.

Advisor simulation/paycheck memory paths and broader financial correctness remain deferred. This refactor proves stored tenant read behavior, not deposit confirmation. Authenticated action behavior has a session-stub boundary; real connection loss, production performance and live production health are not established by these checks. ALIGN-03 non-blocking N1–N3 remain follow-ups and are outside FIN-01 acceptance.

## Next step

Polar independently re-reviews the fresh packet. Codex preserves its report's exact LF bytes, computes the byte count/SHA-256, obtains Polar's confirmation, then records the supplied verdict as remote; recorded by codex. If approved, Codex uses the authorized remote PR workflow, verifies CI and integration/deployment outcomes, and reports observed evidence.
