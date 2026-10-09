# TASK-ID — implementation handoff / independent review

Save as UTF-8 with LF before submission; CRLF is refused. New handoffs pin exact bytes with SHA-256: stop editing after handoff. If evidence changes or disappears, the reviewer records a separate changes_requested report; the owner restores evidence and submits a fresh handoff. Approval cannot bypass the pin.

Task: TASK-ID
Author: codex
Base commit: exact full Git SHA
Verdict: approved or changes_requested (reviews only)
Changed files: list exact paths, including pre-existing/uncommitted changes that matter
Validation: commands, results, skips and whether tested against current tree, CI or live deployment
Risks: unresolved issues, stale evidence and boundaries of verification
Next owner: assigned reviewer / implementation owner / codex

## Work and decisions

Describe final behavior, requirement revisions and what needs to happen next.

## Acceptance evidence

Map each criterion to evidence. For a review, use exactly Author: polar (or the assigned reviewer) and the exact Verdict field; explain remote mode/recordedBy in the body. State approved or changes_requested and actionable findings. Review the working diff, not just the base commit.
