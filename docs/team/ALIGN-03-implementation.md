# ALIGN-03 — implementation handoff

Task: ALIGN-03
Author: codex
Base commit: c563a8d233f904d86f797a51cecfd155cc8bc125
Changed files: scripts/project-sync.mjs; tests/project-sync.test.mjs; docs/team/PROTOCOL.md; docs/team/HANDOFF-TEMPLATE.md; docs/team/ALIGN-03-implementation.md; docs/project-state.json; generated COORDINATION.md.
Validation: Codex local tests 18 passed, 0 failed, 0 skipped; JavaScript syntax, targeted script ESLint, consistency/encoding, staged snapshot and whitespace checks pass. ALIGN-01 PR 11 full CI passed and merged. Remote CI for ALIGN-02/03 has not run yet.
Risks: Cooperative actor assertions remain unchanged; old unpinned handoffs remain backward-compatible. Damaged evidence still fails project check until the owner restores evidence and submits a new handoff. No local application runtime or production health check was performed.
Next owner: polar (remote independent review)

Evidence is refused at submission if it contains CR, preserving exact-byte SHA-256 and existing LF pins without normalization. Approval refuses altered/missing handoffs. An independent changes_requested report may return the task to the owner, recording handoffIntact false and preserving the original hash; fresh owner handoff is required. Regression tests cover CRLF handoffs and review reports, intact recovery, changed/missing evidence, refused approval, preserved original pin, failed check before recovery, fresh owner handoff and subsequent approval. Protocol/template document the workflow.

Errata record for ALIGN-02 N3: the CI sentence in the legacy unpinned ALIGN-01 handoff was corrected by separately reviewed ALIGN-02, after original approval. Original bytes remain in commit 08703d8; no other change to that handoff is made in ALIGN-03. Future corrections to pinned reports require a new task/report, not rewriting approved evidence. No application code, dependency, schema, financial policy or deployment configuration changes.
