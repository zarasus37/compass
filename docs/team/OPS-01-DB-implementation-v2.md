Task: OPS-01-DB
Author: codex
Base commit: f3d9aff01a674bb3b2d296353ae1f422ef7c0134
Changed files: tests/db-release.test.mjs, scripts/init-preview-db.mjs, docs/team/OPS-01-DB-review.md, this report, docs/project-state.json, COORDINATION.md; additive delta to original staged candidate tree 99a7123565b11e02e41a8e31f2605abaf3e92718.
Validation: Original candidate freshly passed coordination 18/18, dashboard 4/4, release 20/20 including real PostgreSQL. Revised release tests 20/20 including real PostgreSQL; four individual removed-guard probes all failed at the guard-specific assertion, with original script bytes restored in finally. Final alignment and encoding clean; targeted ESLint and git diff --check exit 0.
Risks: Original deployment and schema-release prerequisites remain open. No production migration, infrastructure setting change, commit, push, or deployment in this revision.
Next owner: polar

# B1 correction

Polar confirmed the downloaded original report (10890 LF bytes, SHA-256 54c6537139c42cc0f0bb26c24e69056ecf86c0cae9613fefeafc140441ae561b) and changes_requested verdict in the target conversation on 2026-10-21. Codex recorded it verbatim through the remote-proxy workflow before claiming implementation.

The four operator refusal assertions now require their specific Vercel environment guard message. init-preview-db prints its existing fixed guard message for that exact error, retaining the generic refusal for every other error. No raw database error is exposed. All other production script bytes remain identical to the original packet; init-preview-db differs only at its final catch/message line.

For each of release-db, migrate-deploy, init-preview-db and seed-admin, Codex temporarily removed only its VERCEL_ENV guard, ran the two preview/production refusal tests, and required exit 1 with that script's guard-specific assertion failure. All four probes detected the deletion. Each mutation was restored byte-for-byte in finally. Fake nonmatching database targets intentionally remain so these negative tests cannot reach production effects. Probe output and original/current script hashes are in the private OPS-01-DB-v2-mutation.json artifact supplied with this delta.

The initial report remains pinned and unchanged. Its full implementation and validation descriptions continue to apply; the new report supersedes only B1 validation. Original full type/lint/build evidence is retained, not claimed freshly repeated for this tests/message-only delta. Independent approval, new full CI, wrapper rollout and platform identity attestation remain pending. Snapshot capacity and separately reviewed EnvelopeSink repair still block subsequent schema release. Non-blocking findings N1-N7 remain disclosed in Polar's original report.
