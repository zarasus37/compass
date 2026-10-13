Task: FIN-02-SEC
Author: polar
Base commit: bd1b26e3a15aeab678a6c50e140e717643203824
Verdict: approved
Changed files: src/lib/apply-paycheck.ts; tests/smoke-paycheck-account-isolation.mjs; package.json (smoke:paycheck-account-isolation script, appended to the smoke chain); docs/project-state.json; COORDINATION.md (generated); docs/team/FIN-02-SEC-implementation.md. Staged tree 46cdfa5b68ddf65f3f4d8522fda551687bef036b.
Validation: Polar sandbox only: packet and per-section hashes, handoff pin, COORDINATION render, staged diff applied to the baseline file, full read of the writer and the new test, schema cascade check, log reading. Polar did not run the PostgreSQL smoke or any Compass command (no Postgres, tsx or project dependencies in the sandbox). The 43-check smoke, the baseline probe, type, lint, build, coordination and dashboard runs are Codex's.
Risks: Callers of applyPaycheck are not in the packet, and the behaviour change for explicit null or blank account ids and the new check order are unverified against them; the existing paycheck smokes were not run on this candidate; the in-transaction ownership check is an unlocked read.
Next owner: codex

# FIN-02-SEC review (Polar, independent remote)

## 1. Packet
- POLAR-REVIEW-FIN-02-SEC.txt: 489,661 bytes, SHA-256 e4c7d80f6215652c146d3ed1ccb812b1da2f3d505a94f1d1fde83e615b5173b2. Matches the stated values.
- 34 sections extracted as bytes; every byte count and SHA-256 matched.
- Handoff docs/team/FIN-02-SEC-implementation.md (5,969 bytes) hashes to 93f9f54e...ccf42f, the pin in docs/project-state.json (status in_review, owner codex, reviewer polar, head = base, review null).
- COORDINATION.md equals render(project-state.json) byte for byte.
- Applying the packet's staged diff to the BASELINE/apply-paycheck.ts section reproduces the packet's full apply-paycheck.ts byte for byte, so the diff and the full file agree.
- financial-state.ts is unchanged from the approved FIN-01 file (e485a764...8028c).

## 2. Evidence attribution
| Evidence | Who |
| --- | --- |
| Real PostgreSQL smoke 43/43 (log read) | Codex |
| Same smoke against unmodified bd1b26e fails at its first assertion (log read) | Codex |
| tsc, lint (0 errors, 459 baseline warnings), build, coordination 18/18, dashboard 4/4, project check, encoding, check-index | Codex |
| Packet, section, pin, render, diff-application and schema checks, code and test read | Polar sandbox |
| Authorship of the whole delta | Codex (no MiniMax work) |

## 3. The defect and the fix
- Defect (baseline, confirmed by Codex's probe): an explicit accountId was used without a userId check. The foreign key proves an account exists, not that it belongs to the caller, so tenant A's income and routing rows could be written against tenant B's account.
- Fix, as I read it in the diff:
  - A blank or non-string userId is refused before any query.
  - An explicit accountId that is not a non-empty string (blank, null, wrong type) is refused with the same fixed message as a missing account. It cannot fall back to the default.
  - The account is looked up with userId in the filter. A foreign id and a missing id both return nothing and get the identical refusal, so existence is not disclosed. With no explicit id, the oldest owned account is chosen, as before.
  - This happens before the plan and period reads, so a refusal does not materialize a pay period.
  - Inside the allocation transaction the account is looked up again with { id, userId } before the first insert. If it is gone, the code throws ACCOUNT_NOT_FOUND, which the outer catch turns into the same refusal. The income and routing rows now use the verified owned id.
  - The old fallback to an empty-string account id (which would only have failed on the foreign key) is gone.
- No schema, balance, settlement, allocation math, source, envelope floor or idempotency change. The unique-constraint duplicate path is untouched.

## 4. Review findings
- The refusal is a correct tenant check. Foreign, missing, blank and null explicit ids produce one result object, and the test compares the objects with deepEqual rather than just checking ok:false.
- The test is non-vacuous. Codex's baseline log shows the same test failing at its first assertion on the original code with actual true versus expected false.
- Effects are checked, not only results. After each refusal the snapshot of accounts, envelopes, goals, transactions, paycheck runs and audit rows across all test tenants equals the pre-call snapshot. Invalid tenant ids and a tenant with no account are covered the same way.
- The race test drives the real code path. It wraps the writer's $transaction so the account's owner changes on a second connection after the first lookup and before the transaction starts. The test asserts that the change happened, that the result equals the standard refusal, and that nothing was committed. Removing the in-transaction recheck would make that test fail, so it does test that recheck.
- Healthy controls: an owned explicit account succeeds with exact values (12,000 income, 3,000 routing, envelope and goal 4,000 to 7,000, one run, one audit); tenant B is untouched; a repeat call is skipped with an identical snapshot; an omitted account selects the owned default and yields exactly 11,000.
- Fixture hygiene: UUID-owned users only, no shared fixture helper, cleanup by this run's user ids in finally. The schema has onDelete: Cascade from User to every table involved except Transaction.account, and the test deletes transactions first, so cleanup works.
- Account balances are unchanged by this task and the test asserts it. That is the existing convention and belongs to FIN-02.

## 5. Non-blocking findings
- N1. Caller risk I could not verify. Two behaviours changed for callers: an explicit accountId of null or "" is now refused (before, null fell back to the default via ??), and the account check now precedes the plan check, so a user with no account and no armed plan sees the account message first. The packet does not include the app callers of applyPaycheck (the dashboard action and the auto-paycheck path), only the smoke test. Before merge, attach a repo-wide search showing that no caller passes null or a blank id. The existing smoke-paycheck-allocation, auto-paycheck and transactions-persist suites exercise this function and were not run on this candidate; paycheck-allocation also skips when no dev server is up. The PR's full smoke chain with SMOKE_REQUIRE_SERVER=1 is the gate, and a failure there should block the merge.
- N2. The in-transaction ownership check is a plain read at the default isolation with no row lock, which the handoff discloses. No application path reassigns Account.userId, so I accept this as a hardening step and not a complete race guarantee. The test interleaving is instrumented, not load-tested. FIN-06 owns broader concurrency.
- N3. The claim that a refusal does not materialize a pay period is not tested, because the snapshot omits the PayPeriod table. Adding it to the snapshot is a small follow-up.
- N4. The duplicate-paycheck check prints a Prisma error in the log (a unique violation, expected). It is harmless but noisy in CI output.
- N5. The handoff correctly leaves the ledger, reconciliation and settlement confirmation for FIN-02 and later tasks. This approval says nothing about them.

## 6. Acceptance summary
| Criterion | Result |
| --- | --- |
| Foreign, missing or blank explicit account gets the same safe failure, with no writes for either tenant | Met |
| Omitted account uses only the caller's account; an owned explicit account succeeds | Met |
| Ownership checked in the allocation transaction before any mutation | Met (unlocked read, N2) |
| Real PostgreSQL two-tenant test with exact values and healthy and idempotent controls | Met on Codex's evidence |
| No schema, balance, settlement or allocation-math change; type, lint, build and coordination checks pass | Met |

## 7. Closing
Recommendation: approved for staged tree 46cdfa5b68ddf65f3f4d8522fda551687bef036b at base bd1b26e3a15aeab678a6c50e140e717643203824. Any edit after approval invalidates it. No full smoke chain, CI run, deployment or production check exists for this delta and none is claimed. N1 is the one item I would not skip: the full CI chain must pass on the exact approved tree before integration.

No claim, ack or verdict recorded by Polar. Recording is Codex's, in remote-proxy mode, after the exact bytes and SHA-256 are confirmed. Nothing here authorizes a commit, push or deployment.
