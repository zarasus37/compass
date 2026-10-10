# FIN-01-N2 - dashboard recommendation failure isolation

Task: FIN-01-N2
Author: codex
Base commit: 0d8c5ef38840ffc3267e8e8911804fdab0f78284
Changed files: src/app/page.tsx; src/components/dashboard/OpportunitiesToGrow.tsx; src/components/dashboard/cards/safe-to-spend-hero.tsx; tests/dashboard-opportunities.test.mjs; package.json; docs/project-state.json; COORDINATION.md; docs/team/FIN-01-N2-implementation.md
Validation: Codex local runs described below; independent review pending.
Risks: An optional recommendations failure is isolated; failures in required dashboard reads still reject. No authenticated browser, real network outage, full database smoke or remote CI validation is claimed for this candidate.
Next owner: polar

## Work and decisions

User authorized the recommended completion sequence on 2026-10-10. This is the small FIN-01 N2 follow-up before FIN-02 ledger reconciliation. Codex authored this entire delta; MiniMax has no assignment or contribution to it. The shared main checkout started clean, equal to freshly fetched origin/main. All listed files are the uncommitted candidate; no commit, push or deployment yet.

The root page awaited topOpportunities without handling rejection, so an optional recommendation failure rejected the otherwise healthy dashboard. Only that call is now caught. It preserves tenant ID and limit 3 and returns a null presentation value on rejection. Null renders a fixed status/retry message. An empty array retains the prior successful empty state; populated recommendations retain their links, values and content. The error object is neither rendered nor logged by the new catch; its diagnostic is a fixed message.

The actual recommendation engine, DAL, schema, writers, allocation logic and other page callers are unchanged. Required reads and authentication remain outside the catch. This does not make the dashboard resilient to a whole-database outage.

Read the installed Next error-handling guide before editing. DR-FIN-06 records the task sequencing and unavailable-versus-empty semantics. The coordination CLI cannot create a new task ID, so Codex added the authorized follow-up under its normal exclusive lock format after checking clean main, remote equality, no active task and no claim. The claim existed before any repository edit. Normal generate, ack and handoff commands apply afterward.

## Acceptance evidence

All runs below were performed by Codex on the real local candidate checkout:

| Check | Result |
| --- | --- |
| node --test tests/dashboard-opportunities.test.mjs | 4 passed, 0 failed, 0 skipped |
| Baseline regression probe using original HEAD page and candidate tests | Exactly 1 expected failure (recommendations rejection), 3 controls passed |
| pnpm project:test | Coordination 18/18 and dashboard 4/4; exit 0 |
| pnpm tsc | Exit 0 |
| pnpm lint | Exit 0; 0 errors, 459 baseline warnings |
| pnpm build | Exit 0; production compilation, type validation and route generation completed |
| project-sync env-check | CLI/runtime URL file values match; no credential output or database writes |
| project-sync check, scan-encoding, git diff --check | Clean |

The regression bundles and invokes the real asynchronous Dashboard, renders the real carousel, SafeToSpendHero and OpportunitiesToGrow through React server rendering, and substitutes authentication/data dependencies and unrelated widgets. Failure asserts the dashboard and $1,000 safe-to-spend value remain, an accessible retry status appears, no PLAN TIGHT assertion appears and secret markers are absent. Controls cover successful empty and populated data, exact tenant/limit arguments, and propagation of authentication/required-data errors. The baseline probe substitutes only the original page into this same test harness, proving the failing assertion is not vacuous.

The test is also wired into project:test, which the existing PR CI invokes. No real database is needed for this UI propagation test; it does not replace FIN-01's database isolation and snapshot evidence. The full financial smoke suite was not rerun for this presentation-only delta and must not be reported as a current pass.

Local logs and the baseline probe are preserved under C:/Users/crisc/.codex/compass-deliverables/. The review packet includes exact full-file bytes, counts, hashes, staged diff and the logs. Polar must independently review and return an LF report with exact Task, Author, Base commit and Verdict fields. The regular hash confirmation and proxy record workflow follows.

Desktop control detected Polar but input failed with "coordinate input geometry is unavailable"; recovery capture failed with "FrameArrived timed out: timed out waiting on channel". Packet delivery and acknowledgement have not occurred. No independent approval is inferred from this handoff.
