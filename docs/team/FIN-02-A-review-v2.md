Task: FIN-02-A
Author: polar
Base commit: 43889ac67b74452cd720950a731a68646c4c0105
Verdict: approved
Changed files: Reviewed the v2 staged candidate (tree 65b7c0de10aac1c8d332f5aec0ce0673efeac05c) as a focused delta from the first reviewed tree a93c3a497d48cd64a8895343f2b338e53a9a58f1: tests/smoke-ledger-reconciliation.mjs, 00-DESIGN.md, docs/team/FIN-02-A-implementation.md (revised), docs/team/FIN-02-A-review.md (my first report, added verbatim), docs/project-state.json, COORDINATION.md. Polar changed no repository file.
Validation: Polar made no local run and has no repository access. Polar's checks below are static or sandbox only. Codex's local runs (journal 128/128 in the canonical checkout and a depth-1 clone, project tests, final snapshot checks) are quoted from the packet and not reproduced by Polar. The original type, lint, build, migration 37/37 and paycheck 43/43 results are Codex runs on production bytes that I confirmed unchanged. They were not re-run for this delta, and Codex says so. No Polar claim, ack or verdict has been recorded.
Risks: No blocker remains. Open items are gates, not defects: the shallow-history proof is a Codex Windows run rather than Linux CI, the existing smoke chain has not yet run on a journal-enabled database, and the old deployed-binary check is an explicitly unperformed manual gate. FIN-02-B must set event context transaction-locally.
Next owner: codex

## 1. Packet

- POLAR-REVIEW-FIN-02-A-V2.txt: 1,047,957 bytes, SHA-256 d7675616c659c8c347662b1ca3f0e11d28d49ee170af323e2640442a9b1d710a. This matches the stated value.
- All 49 full-file sections match their stated byte counts and hashes, with no carriage returns.
- The handoff docs/team/FIN-02-A-implementation.md hashes to 6810652036afe8c6ba3e0d5a7abc30020dd10e0a5b5e7cc01386a194b1676ec5. This equals the pin in docs/project-state.json. The state entry is in_review, owner codex, reviewer polar, review null, head equal to the base.
- COORDINATION.md equals the render of docs/project-state.json, checked with the project's own render function in my sandbox.
- docs/team/FIN-02-A-review.md in the packet is byte-identical to my first report (SHA-256 begins 385f60a8cc80928c, 13,915 bytes).
- Compared with the first packet, only six files differ: the smoke test, 00-DESIGN.md, the handoff, the review file (new), project-state.json and COORDINATION.md.
- The migration, schema, contract.mjs, reconciliation.ts, the three writers, the scripts, package.json and ledger-boundary.mjs are byte-identical to the first packet. I hashed them independently, and all 12 values match the production-proof evidence in the packet. The migration is c1d134e453fa..., reconciliation.ts is 6e40180422ce... and contract.mjs is 1bed664f30e5...

## 2. Closure of the earlier findings

- **B1, closed.**
  - The smoke no longer imports child_process, calls git or names a historical commit. A search of both ledger test files finds only ledger-boundary.mjs using child_process, and that is to spawn its own test child.
  - The three source-freeze assertions are removed. The runtime assertions on the current logTransactionToDb, applyPaycheck and rebalanceEnvelopes remain.
  - FIN-02-B can now change those writers without the chain going red.
  - The Codex shallow evidence reports a depth-1 clone, one commit, the historical commit absent and exit 0. The saved log shows 128 passed, 0 failed, 0 skipped. This is Windows evidence, not Linux CI.
- **N1, closed.**
  - A-to-B-to-A reassignment is now asserted at each step with full reconciliation of both owners. I verified the expected values independently in my own sandbox probe earlier, and they match.
  - A is removed with stored null, expected 0 and 2 entries.
  - B is live at 321 with 1 entry.
  - After the move back, A is live at 321 with 3 entries and B is removed at 0 with 2 entries.
- **N2, closed.**
  - The unconditional markers are replaced with observable assertions: the actual lock wait state, the maintenance write visible inside the transaction, health false while a capture hook is missing, restored balances and unchanged journal counts after rollback, and a count of zero for the erased missing-opening user and account.
  - Two further unconditional-looking check calls remain, on the A-to-B-to-A removed and live flags, but those evaluate real flags and are not tautologies.
- **Count.** 128 is consistent. I recounted it as 112, minus 3 removed byte checks, plus 8 reassignment assertions, plus 8 from the four reconciliation calls they make, plus 3 from the rollback block.
- **Docs.** The revised 00-DESIGN.md and handoff now state the availability coupling, emergency capture removal, independently reviewed re-enabling instead of re-running the cutover, the separate constraint and foreign-key drift checks, the direct unpooled Neon connection, the post-delivery reconciliation run, the lock-contention rule, and the requirement that FIN-02-B set event context with is_local true. They also state that the old-binary check is an unperformed manual gate.

## 3. Findings

Blocking: none.

Non-blocking:
- **N1. Shallow proof is not Linux CI.** The clone used the canonical node_modules junction and a copied generated client on Windows. The pull request's CI is the first Linux run. The history-free property itself follows from the removal of the git calls and does not depend on that run.
- **N2. Existing smoke chain on a capture-enabled database.** CI is still the first full run of reset, delete and reassignment smokes through the triggers. Review the CI result before merge, especially reset-seed, accounts, envelopes and tenant smokes.
- **N3. Manual old-binary gate.** The suite exercises current writers against the migrated schema. It does not prove that a separately deployed older binary works. The release plan says so honestly. Do not mark it done on the strength of source hashes.
- **N4. Carried to FIN-02-B.** Event context must be transaction-local, a previous context must be shown not to leak across pooled requests, and the lost-update fixes with concurrent tests are required.

## 4. Acceptance

| Criterion | Result |
| --- | --- |
| Original acceptance (cutover, immutability, erasure, reader, tests, no writer or UI change, preflight and delivery plan) | Met, as assessed in my first report; production bytes are unchanged and independently re-hashed |
| Tests pass in the repository's own CI | No history dependency remains. Pending the actual CI run. |
| Tests do not freeze files FIN-02-B must change | Met |
| Handoff, state and render integrity | Met |

## 5. Conclusion

I approve the staged FIN-02-A candidate. The tests-only correction removes the CI-fatal history dependency, adds the missing reassignment coverage and replaces the unconditional markers, and the production bytes are unchanged. Approval covers exactly tree 65b7c0de10aac1c8d332f5aec0ce0673efeac05c. Any later change invalidates it.

Full PR CI with SMOKE_REQUIRE_SERVER=1 must pass on the exact approved tree before merge. Production delivery follows the schema-first plan in 00-DESIGN.md, including the per-target preflight, a recoverable snapshot, the direct unpooled connection and the manual old-binary gate.

No claim, ack or verdict recorded by Polar. This is an independent remote review, to be recorded by Codex in remote-proxy mode only after the exact bytes and SHA-256 are confirmed. Nothing here authorizes a commit, push or deployment.
