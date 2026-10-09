# FIN-01 — advisor test correction, delta handoff

Task: FIN-01
Author: codex
Base commit: 1f81cd7eb59b2a43d9d42e4a5b5c604582ec4cad
Changed files: tests/smoke-financial-state.mjs, tests/financial-state-boundary.mjs, docs/project-state.json, COORDINATION.md (generated), docs/team/FIN-01-review-v2.md (unchanged downloaded report), docs/team/FIN-01-implementation-v3.md (this report). Full inherited implementation remains staged; see v2 handoff and packet.
Validation: Codex corrected standalone financial-state smoke 148 passed / 0 missed, exit 0; both node syntax checks pass; final project/encoding/staged/whitespace gates pass before handoff. All included production/context files match their exact v2 full-file hashes.
Risks: M5 cause remains unresolved; v2 full suite passed once. No FIN-01 CI or production verification yet. Page-level opportunities error handling remains a non-blocking follow-up.
Next owner: polar

## V2-B1 correction

I used the wrong advisor dispatcher signature in both test files. The resulting unknown-tool response satisfied broad ok:false assertions, so the v2 handoff's advisor test claim was unsupported. Polar caught this independently. Production code was sound in its direct probes; no production file changes were needed.

Both sites now call runAdvisorTool(tenantId, { name, args: {} }). The invalid-tenant checks require the actual tool and exact fixed retry message. The valid-tenant induced query failures require ok:false, the intended tool identity, the exact fixed message, and absence of injected private host/user/password/invocation text. Unknown-tool results cannot pass. Healthy empty-tenant controls call the same dispatcher and require ok:true, correct tool and count:0 for both envelopes/debts.

All 148 corrected smoke checks passed on canonical Postgres, including the unchanged all-entity isolation, runtime selective/transaction instrumentation, real concurrent snapshot and owned-fixture cleanup. The new log contains no Unknown advisor tool line. Authenticated action tests retain the stated session/Prisma stub boundary.

## Evidence and authorship

MiniMax partial work and Codex production completion remain as described in the unchanged v2 handoff. This test correction and 148-check run are Codex work. Polar's v2 report is independent remote evidence and was confirmed/downloaded as 10,737 LF bytes, SHA-256 73cce7129ef5d6d16df41bca9bd66a1e13c8d68ea933f29526c702f8eeaa0f65, proxy-recorded changes_requested. All original reports/handoffs are preserved unchanged.

The v2 production/type/lint/build and full suite evidence remains historical Codex evidence for byte-identical production files: type/build exit 0, lint 0 errors/459 warnings, project tests 18/18; full data/UI/integration/deploy-environment suite exit 0, integration 368/0 with M5 before=1 after=2. The full suite was not repeated for this test-only delta. The prior 138-check advisor assertions are superseded by the corrected 148-check standalone run. The v3 packet includes the actual production-byte comparison and new smoke log.

## Non-blocking follow-ups

N1: No repeated integration runs added in this delta. M5 passed once; its cause remains open, not labelled pre-existing or fixed. The unavailable clean-base comparison remains honestly reported in v2.
N2: Repository inspection confirms src/app/page.tsx and src/app/(app)/learn/your-numbers/page.tsx call topOpportunities without a local catch. Both also read envelopes directly. The your-numbers route falls under the existing (app)/error.tsx retry boundary; root dashboard has no root error.tsx. Ancillary recommendation failure can reject the page; isolation of that section is a follow-up, not represented as graceful local handling. These context files are included in the delta.
N3: Repository-wide rg in src finds listEnvelopesForAction only in its declaration/comments/logging, no caller. Packet includes the search result.
N4/N5/N6: Marking exported read as test-only, logging Prisma initialization errorCode, and sanitizing other pre-existing advisor handlers are follow-ups. No production edit was added to this delta; the bounded logger may report unknown for initialization errors.

DR-FIN-05 records the corrected evidence and unchanged production bytes. User standing publication authorization remains conditional on independent approval/checks. Submit this fresh delta for Polar re-review, then confirm exact report bytes before proxy recording.
