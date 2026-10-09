Task: FIN-01
Author: polar
Base commit: 1f81cd7eb59b2a43d9d42e4a5b5c604582ec4cad
Verdict: approved
Changed files: Delta reviewed against my v2 review: tests/smoke-financial-state.mjs, tests/financial-state-boundary.mjs, docs/team/FIN-01-implementation-v3.md, docs/project-state.json, COORDINATION.md (generated). Production files are byte-identical to the V2 files I reviewed. The full inherited FIN-01 implementation (staged tree 63ae0465b10f4e7b3dac3f03d31bc2c42ad63ec0) is approved as one unit with this delta.
Validation: Polar sandbox only (hash, byte-exact section extraction, production-hash comparison to my own v2 copies, handoff pin, COORDINATION render, dispatcher read-through, log inspection). Polar ran no local Compass commands. All project, type, lint, build, smoke and integration runs are Codex's (v3 standalone smoke 148 passed / 0 missed; v2 full suite, once). No Postgres in the Polar sandbox, so the Postgres-backed tests were not re-run by Polar.
Risks: M5 (vault.bill_history_viewed) is unexplained and open; no FIN-01 CI or production check exists yet; two page callers of topOpportunities lack a local catch (non-blocking, below).
Next owner: codex

# FIN-01 v3 delta review (Polar, independent remote)

## 1. Packet
- POLAR-REVIEW-FIN-01-V3.txt: 236,545 bytes, SHA-256 bb6f4ce06ced8a28a048e9180200f06701ccc987bbeb08ca7de442c93b484790. Matches the stated values.
- All 11 full-file sections extracted as bytes; every byte count and SHA-256 matched.
- Section handoff docs/team/FIN-01-review-v2.md is byte-identical (cmp) to my v2 report: 10,737 bytes, 73cce7129ef5d6d16df41bca9bd66a1e13c8d68ea933f29526c702f8eeaa0f65.

## 2. Evidence attribution
| Evidence | Who |
| --- | --- |
| Corrected standalone smoke, 148/148, exit 0 | Codex (log read by Polar, not re-run) |
| Syntax, project, encoding, staged and whitespace gates | Codex |
| v2 type/lint/build, project tests 18/18, full suite (integration 368/0, M5 before=1 after=2) | Codex, historical, on unchanged production bytes |
| Packet hashes, section hashes, production comparison, pin, render, dispatcher read | Polar sandbox |
| Implementation before the role change | MiniMax partial, Codex completion (per the v2 handoff) |

## 3. What I verified
- Production bytes: src/lib/advisor/handlers.ts (72c70286...1314) and src/lib/state/financial-state.ts (e485a764...8028c) in this packet are byte-identical to my v2 copies. All 11 hashes in the packet's comparison table equal the hashes of the v2 files I extracted, so the claim "production unchanged" holds against my own evidence, not only the packet's table.
- Handoff pin: docs/project-state.json pins docs/team/FIN-01-implementation-v3.md with sha256 78dbebd7...693fdf. That equals the hash of the 4,457-byte v3 handoff section. Status in_review, owner codex, reviewer polar.
- COORDINATION.md equals render(project-state.json) byte for byte, using the render function from the reviewed project-sync.mjs.
- V2-B1 correction. Real dispatcher: runAdvisorTool(userId, tc) switches on tc.name. Both test files now call runAdvisorTool(tenantId, {name, args: {}}), which reaches the named handlers; the old shape could only reach the default branch.
  - Failure checks now also require publicView.tool === tool and the exact fixed messages ("Envelopes are temporarily unavailable. Retry shortly rather than treating this as an empty account." / "Debts are temporarily unavailable. Retry shortly rather than treating this as no debt."). The default branch yields neither the tool name nor those messages in its "Unknown advisor tool" text, so it can no longer pass.
  - Healthy-empty controls (a real empty owned tenant): ok:true, correct tool, data.count === 0, for queryEnvelopes and queryDebts. This distinguishes outage from empty.
  - The Codex log shows these lines with the exact messages. "Unknown advisor tool" appears in the packet only in my quoted v2 text and the handlers.ts source line, not in any log output. The log ends "ALL GREEN -- 148 passed, 0 missed".
- Earlier Polar probes (v2, stubbed Prisma and extracted handlers) already showed the handlers behave as the corrected tests now assert; production is unchanged, so they still apply.

## 4. Blocking findings
None. V2-B1 is closed. B1, B2 and B3 from my earlier reports remain closed on the evidence in the v2 and v3 packets.

## 5. Non-blocking findings (carry forward, none counts against approval)
- N1. M5 is unresolved: it passed once on the v2 tree (368/0, before=1 after=2), with no clean-base comparison. Do not describe it as fixed or pre-existing. Repeat the full integration suite a few times on the final tree before publication.
- N2. src/app/page.tsx (line 131) and src/app/(app)/learn/your-numbers/page.tsx (line 32) await topOpportunities with no local catch, so a DB failure rejects the page. your-numbers falls under (app)/error.tsx, a retry card. The root dashboard has no root error.tsx in the packet (only (app) and page.tsx are under src/app). Follow-up task: isolate the recommendations section so an ancillary failure cannot take down the dashboard.
- N3. The repo-wide search shows listEnvelopesForAction only as its declaration, a comment and a log line. I saw only the search output Codex supplied, not the repository.
- N4. read() is exported only for tests; mark it so.
- N5. Prisma initialization errors expose errorCode and will log as unknown.
- N6. Other advisor handlers can still throw raw errors (pre-existing; separate task). Also the "frozen" claim covers rows, not arrays or Dates.
- N7. The full suite was not repeated for the test-only delta; that is reasonable because production bytes are identical, but CI is the real check.

## 6. Acceptance summary
| Criterion | Result |
| --- | --- |
| V2-B1: dispatcher call shape, exact messages, tool identity, healthy controls | Closed |
| Production files unchanged from reviewed v2 | Confirmed by hash |
| B1/B2/B3 | Closed (v2 and v3 evidence) |
| Handoff pin, state and COORDINATION consistent | Confirmed |
| Scope: no schema, writer or allocation changes, no display migrations | Unchanged since v2 |
| M5 causality | Open, non-blocking, disclosed |
| FIN-01 CI and production verification | Not yet run |

## 7. Closing
Recommendation: approved for staged tree 63ae0465b10f4e7b3dac3f03d31bc2c42ad63ec0 at base 1f81cd7eb59b2a43d9d42e4a5b5c604582ec4cad. Any edit after this approval invalidates it. Publication depends on the required checks passing and on the user's standing authorization to Codex, not on this report.

No claim, ack or verdict recorded by Polar. Recording is Codex's, in remote-proxy mode, after the exact bytes and SHA-256 are confirmed. Nothing here authorizes a commit, push or deployment.
