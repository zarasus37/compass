# FIN-02-SEC — paycheck account ownership prerequisite

Task: FIN-02-SEC
Author: codex
Base commit: bd1b26e3a15aeab678a6c50e140e717643203824
Changed files: src/lib/apply-paycheck.ts; tests/smoke-paycheck-account-isolation.mjs; package.json; docs/project-state.json; COORDINATION.md; this handoff. Review file reserved for Polar's confirmed report.
Validation: Codex local PostgreSQL smoke 43/43; baseline probe fails at the foreign-account acceptance assertion; tsc/build exit 0; lint 0 errors and 459 existing warnings; coordination 18/18 and dashboard 4/4; project consistency and encoding clean. Full chain and remote CI not run on this delta.
Risks: Ledger reconciliation, settlement confirmation, allocation concurrency and the existing reader/error behavior remain separate work. These are direct writer tests, not browser action or production tests.
Next owner: polar (independent remote reviewer)

## Work and decisions

The FIN-02 writer inventory found applyPaycheck accepted an explicit accountId
without checking userId. PostgreSQL's account FK proves existence, not ownership.
The original function successfully wrote tenant A's income and routing rows with
tenant B's account ID. This is demonstrated by the baseline test, rather than
inferred only from the source. Isolate authorization before adding ledger schema.

An explicit ID is now queried with userId; foreign and missing accounts return
the same fixed refusal. Blank/null explicit IDs cannot fall back to a default.
Omitted accountId retains the oldest owned account selection. Empty/undefined/null
tenant IDs are refused before querying, avoiding Prisma's undefined-filter issue.
Account selection occurs before plan/period reads, so a normal account refusal
does not materialise a pay period. The allocation transaction rechecks ownership
before its first mutation and uses that owned ID for income and routing rows.

The account failure string is exactly:
"Account not found. Add or select an account before applying a paycheck."
An ownership loss before the transaction uses the same result. No existence or
owner detail is returned. An invalid tenant uses the existing generic failure.

No schema, cash/account balance update, settlement inference, allocation math,
source convention, envelope floor, event identity or routing classification was
changed. The existing amount/period idempotency guard remains. FIN-02 itself is
still queued and incomplete. DR-FIN-07 records this prerequisite split. Codex
authored this entire delta and ran every local command; no MiniMax partial work
was included in it. Polar's planning consultation is not approval of this code.

## Acceptance evidence

- The real PostgreSQL test creates three UUID-owned users: A, B and one without
  an account. Both funded tenants have envelopes, goals, armed seed-source plans
  and active periods. No fixture.mjs, broad smoke-user sweep, fixed primary key,
  global database reset or personal fixture is used. Cleanup is limited to this
  run's user IDs and their dependent rows, in finally.
- Foreign, absent, blank and null explicit IDs receive byte-equivalent result
  objects. Snapshots compare account/envelope/goal balances, transaction rows,
  paycheck runs and audit rows across all owned tenants after every refusal.
  Invalid tenant controls and absent-default-account controls also write nothing.
- A separate real DB connection changes the fixture account's owner between the
  preliminary selection and the actual transaction callback. The writer refuses;
  the test restores fixture ownership and confirms no financial mutations. This
  is an instrumented boundary interleaving, not a general concurrent-load test.
- Healthy explicit selection creates exactly 12,000 cents of income and 3,000
  cents of routing into the same owned account. Envelope and bound goal move
  from 4,000 to 7,000; one run and one audit appear. B remains unchanged.
- Repeating the same call is skipped with an identical financial snapshot. A
  second 16,000-cent call without an account ID allocates 4,000 to A, yielding
  11,000 cents. All resulting transactions have A's user/account IDs. Account
  balances remain unchanged, which is the existing convention awaiting FIN-02.
- The same new test on unmodified bd1b26e failed at its first assertion with
  actual true versus expected false (foreign explicit account refused). Owned
  test rows were removed in finally. This proves the regression is non-vacuous.

## Validation and limits

Codex ran pnpm project:env-check before database work; CLI/runtime targets match.
The standalone smoke runs via tsx --conditions=react-server and does not require
a dev server. package.json exposes smoke:paycheck-account-isolation and appends
it to the existing pnpm smoke chain, so PR CI will exercise it on PostgreSQL.
No dependency or lockfile change. The type, lint, build, project and smoke logs
are included in the packet with exact byte counts and hashes.

All local required checks passed. Full data/UI/integration/deploy chains were
not rerun for this candidate and must pass in its later PR CI. FIN-01-N2's full
CI and production readiness belong to the base release, not this candidate.
No commit, push or deployment of FIN-02-SEC yet; approval is required first.

Account ownership is checked within the transaction, but no new SQL row-lock or
composite ownership FK was added. There is no application path that reassigns
Account.userId; direct administrative reassignment during the transaction is
not claimed safe. Plan/envelope reads still happen outside the write transaction;
FIN-06 owns broader concurrent allocation behavior. Existing database-read errors
outside that callback remain unchanged and are not covered by this task.

Implementation handoff closes the writer claim. Please review this small delta
independently; return an LF report with the exact identity fields and verdict,
byte length and SHA-256. Codex will confirm bytes before proxy recording.
