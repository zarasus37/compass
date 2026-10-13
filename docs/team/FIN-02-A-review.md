Task: FIN-02-A
Author: polar
Base commit: 43889ac67b74452cd720950a731a68646c4c0105
Verdict: changes_requested
Changed files: Reviewed the staged candidate (tree a93c3a497d48cd64a8895343f2b338e53a9a58f1): prisma/migrations/20261013140000_balance_journal/migration.sql, prisma/schema.prisma, src/lib/ledger/contract.mjs, src/lib/ledger/reconciliation.ts, scripts/check-ledger-journal.mjs, scripts/generate-ledger-contract.mjs, scripts/preflight-schema.mjs, scripts/verify-migrations.mjs, tests/ledger-boundary.mjs, tests/smoke-ledger-reconciliation.mjs, package.json, 00-DESIGN.md, docs/project-state.json, COORDINATION.md, docs/team/FIN-02-A-implementation.md. Polar changed no file in the repository.
Validation: Polar made no local run and has no repository access. Polar's own sandbox checks are listed below and are labelled as such. Every test, build, lint and project command result in this report is a Codex local run quoted from the packet and not reproduced by Polar. No Polar claim, ack or verdict has been recorded.
Risks: One blocker (B1). The new journal smoke cannot pass on the repository's CI checkout and is permanently coupled to three production files that FIN-02-B must edit. The migration, trigger design, reader and tenant isolation held up under independent probing, and no defect was found in any of them. Remaining risks are non-blocking and listed under N1 to N8.
Next owner: codex

## 1. Packet

- POLAR-REVIEW-FIN-02-A.txt: 917,525 bytes, SHA-256 e9727ec0571edfe51e1e52847c4cc03d0ef669a90cf285b50f16e83bf7a577ad. This matches the stated value.
- All 48 full-file and baseline sections match their stated byte counts and SHA-256 values. None contains a carriage return.
- The staged diff section and the Codex log sections follow the file sections under different header formats. They are present. The logs carry their own byte counts, which I did not re-hash individually.
- Handoff docs/team/FIN-02-A-implementation.md hashes to 36bb9e33fb42d42e1e9657df82c60b0f47629936384edd5ea40fb70607f774d0. This equals the pin in docs/project-state.json.
- The FIN-02-A state entry is in_review, owner codex, reviewer polar, review null, and its head equals the base commit.
- COORDINATION.md equals the render of docs/project-state.json. I ran the project's own render function over the packet's state in my sandbox, and the output is byte-identical.
- Staged diff applied to the BASE copies of prisma/schema.prisma, scripts/preflight-schema.mjs and scripts/verify-migrations.mjs reproduces the full sections byte for byte (patch and cmp).
- apply-paycheck.ts, store.ts and server/db.ts hash identically to the copies in my approved FIN-02-SEC packet. financial-state.ts is still e485a764ab64... log-transaction.ts has no earlier Polar copy, so I rely on Codex's stated byte comparison with the base.
- The staged diff touches no writer file and does not touch .github/workflows/ci.yml.

## 2. Evidence attribution

| Evidence | Runner | Status |
| --- | --- | --- |
| journal smoke 112/112, paycheck isolation 43/43 on a journal-enabled DB, fresh/existing migration 37/37, preflight, tsc, build, lint (0 errors, 459 warnings), project tests 18/18 and dashboard 4/4 | Codex local, Windows, C:\dev\compass, full git history | Quoted from the packet logs. Not reproduced by Polar. The smoke log lines agree with the handoff counts. |
| Migration, trigger, reconciliation-SQL and health-SQL probes (section 4) | Polar sandbox only. In-process WebAssembly PostgreSQL (PGlite), a reduced User, Account, Envelope and Transaction schema, and the real migration, reader SQL and health SQL taken from the packet | Independent of Codex. It is not the project's Prisma stack and proves nothing about CI or production. |
| CI behaviour in B1 | Polar reading ci.yml and the test source | Inference from the code, not a run. Codex's PR CI will confirm or refute it. |
| Full smoke chain on a journal-enabled database, remote CI, production migration | Nobody | Not run, as the handoff states honestly. |

## 3. Blocking finding

### B1. smoke:ledger depends on git history that CI does not have, and freezes three production files forever

tests/smoke-ledger-reconciliation.mjs runs, for src/lib/log-transaction.ts, src/lib/apply-paycheck.ts and src/lib/store.ts:

    eq('baseline writer bytes unchanged: '+file, readFileSync(file,'utf8').replaceAll('\r\n','\n'), execFileSync('git',['show','43889ac:'+file],{encoding:'utf8'}))

This is the last step of the pnpm smoke chain, via smoke:ledger and ledger-boundary.mjs, and it is unconditional. It has two defects.

1. **It fails on the repository's own CI checkout.**
   - The only checkout step in ci.yml is `uses: actions/checkout@v4` with no fetch-depth.
   - The default is a shallow, depth-1 checkout. On a pull request that is the synthetic merge commit. On a push to main it is the head commit.
   - In neither case is commit 43889ac present as an object. `git show 43889ac:<path>` therefore fails, execFileSync throws, and the smoke exits non-zero.
   - The log shows the check passing only on Codex's local clone, which has full history.
   - The handoff itself says "Full Linux PR CI ... is required", so this is the first place the failure will surface.
2. **It makes FIN-02-B impossible to land.**
   - Even with full history, the test asserts that the three writers equal the 43889ac bytes forever.
   - FIN-02-B must change apply-paycheck.ts and log-transaction.ts to make them atomic and to supply intent.
   - store.ts is a 56 KB file that any feature may touch.
   - The assertion would turn the main-branch smoke chain permanently red at the first such edit.
   - It also tests the file bytes, not what rolling deployment needs, which is that an older writer still works against the migrated database.

Requested fix, as a tests-only delta:
- Remove the `git show` assertion. No test in the chain should shell out to git or name a historical commit.
- Keep the real proof of old-writer compatibility. Vendor frozen copies of the three baseline writers and their small import closure under a test-fixture path, and execute those copies against the migrated database. Alternatively, drop the three byte assertions and keep the existing runtime assertions on the current writers, and say plainly in the spec that old-binary proof is a manual pre-release step.
- If you vendor the copies, the 112 count will change. Report the new count honestly.
- The migration SQL, contract.mjs, reconciliation.ts and the other production bytes need not change, so the delta review can be limited to the test files.
- Run `git clone --depth 1` of the staged candidate, or a shallow checkout, as a local check that the smoke no longer needs history.

## 4. What I verified and found sound

Polar sandbox probes (PGlite) on the packet's migration, reader and health SQL.

- **Cutover.**
  - The migration applies cleanly to pre-existing rows and creates unverified openings equal to the stored balances.
  - The legacy activity count is carried correctly. It was 1 for the account with one Transaction row and 0 for the others.
  - Reapplying it is a no-op, with the entry count unchanged at 4.
- **Reader SQL.** Every probed position reported its stored and expected cents equal, a contiguous sequence and a valid opening.
- **Coverage.**
  - A bulk UPDATE of every account was journalled exactly.
  - Envelope delete then recreate with the same fixed ID retained one history. It showed closed, then reopened, with expected equal to stored.
  - A refused delete, where the Transaction FK restricts an account delete, left the journal consistent.
- **Ownership reassignment.** Moving an account A to B closed A's position and opened B's, and moving it back reopened A's. Every position reconciled at each step. Codex's own smoke does not assert this path (see N1), so this is independent confirmation.
- **Erasure.** Deleting a user who owns accounts, envelopes and journal rows succeeded and left zero entries, positions and events for that user. The migration's skip-when-the-user-row-is-gone design works. Codex's smoke also covers erasure, with and without event context.
- **Health SQL.**
  - It returns false before the migration, true after, and false after one capture trigger is disabled.
  - I recomputed the trigger type masks (5, 17, 9, 19, 34, 27, 31) by hand against the SQL, and they match.
- **Tenant isolation.** Entries and headers carry composite owner FKs. A foreign event context raises and rolls back the whole mutation. The context check works as designed.
- **Reader.** One RepeatableRead transaction covers the health query and all positions. Sums are exact bigint, returned as strings. A bound tenant parameter is used. The failure path returns a stable code and logs only a bounded Prisma code. No repair or seeding exists in the reader.
- **Design vs my planning findings.** The hybrid trigger plus intent, the atomic locked cutover, the whole-user erasure rule, the append-only journal, the exclusion of Transaction sums from reconciliation and the A/B/C split are all implemented as agreed.

## 5. Non-blocking findings

- **N1. Ownership reassignment is untested in the journal smoke.** The handoff says administrative ownership changes are "exercised", but tests/smoke-ledger-reconciliation.mjs never updates an owner. The only reassignment in the repository's tests is in smoke-paycheck-account-isolation.mjs, and that test makes no journal assertion. My probe shows the code is correct. Add one reconciliation assertion for A to B and back.
- **N2. Some counted checks are unconditional.** `check('rollback without capture can still use old source table', true)` and `check('erasure also handles a missing opening safely', true)` pass whatever happens, and the first is not a real rollback test. Each is a marker rather than a check. The 112 includes them. Either assert something observable or do not count them.
- **N3. Event context must be transaction-local.**
  - I set `compass.event_id` at session level and tried a write for another tenant. It failed hard with "Ledger event context does not belong to entity owner", so a stale session-level value breaks other users' writes on a pooled connection.
  - FIN-02-B must set it only with is_local true inside the same transaction, and needs a test that a prior context cannot leak.
- **N4. Availability coupling.**
  - The capture trigger raises if a position is missing, if one is marked removed on a non-insert, or if an insert collides with a live position.
  - Fail-closed is intended, but any journal inconsistency makes balance writes, including paychecks and logged transactions, fail.
  - The production runbook should say so, and say that dropping the capture triggers is the emergency rollback.
- **N5. Re-enabling after a rollback is not defined.**
  - I dropped one capture trigger and re-ran the migration. It aborts with "Ledger changes require a balance capture trigger". It would insert fresh positions over existing ones.
  - Failing is safer than rewriting openings, so this is not a defect. The spec's rollback paragraph should state that re-enabling needs a new reviewed migration or procedure, never a re-run.
- **N6. Health SQL does not check constraints.** It pins triggers, function bodies, privileges and the replication role, but not the unique constraint on (positionId, sequence) or the composite FKs. Schema drift is covered by verify-migrations. This is acceptable for A and worth a line in the spec.
- **N7. Production delivery details.** The plan in 00-DESIGN.md is sound: snapshot, preflight, migrate, journal check, then merge. Add that migrate deploy must use a direct unpooled Neon connection, and that the 10-second lock timeout is expected to be quiet on this small database. A reconciliation run on each production target should be recorded after delivery.
- **N8. Existing smokes on a journal-enabled database.** Codex ran only the paycheck isolation smoke with the journal enabled. Existing smokes that reset, delete or reassign rows now run through capture. CI is the first full run. Watch it, especially reset-seed, accounts, envelopes and tenant smokes.
- **N9. Coarse missing_history.** legacyActivityCount counts every Transaction row tied to an entity, including allocation rows whose account balance never moved. It is a weak flag, as the spec says. It should stay informational until FIN-05.

## 6. Acceptance

| Criterion | Result |
| --- | --- |
| Atomic additive cutover, unverified openings, complete INSERT/UPDATE/DELETE capture | Met (Polar probe plus Codex logs) |
| Tenant-owned, append-only journal, same-owner context, whole-user erasure, removal and recreation | Met (Polar probe plus Codex logs) |
| Read-only RepeatableRead reader, exact bigint sums, typed outcomes, whole-report stable failure, fail-closed on absent or disabled capture | Met |
| Real PostgreSQL tests for writers, raw and bulk changes, negative balances, deletion and recreation, isolation, erasure, injected rollback, concurrent cutover and snapshot, safe rollback | Met, apart from B1, N1 and N2 |
| No writer, settlement, allocation or UI change | Met. The staged diff touches none of them. |
| Migration and trigger preflight and explicit schema-first production plan | Met (N5 to N7 are doc refinements) |
| Tests pass in the repository's own CI | Not met. B1. |

## 7. Conclusion

I recommend changes_requested on one blocker. The implementation itself is sound: I found no defect in the migration, triggers, reader or isolation. B1 is a tests-only fix, and the production bytes need not change. If Codex fixes the smoke and the delta touches only tests, I expect to approve after a short delta review.

No claim, ack or verdict recorded by Polar. This is an independent remote review, to be recorded by Codex in remote-proxy mode only after the exact bytes and SHA-256 are confirmed. Nothing here authorizes a commit, push or deployment.
