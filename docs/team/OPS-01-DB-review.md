Task: OPS-01-DB
Author: polar
Base commit: f3d9aff01a674bb3b2d296353ae1f422ef7c0134
Verdict: changes_requested
Changed files: scripts/db-release/core.mjs, scripts/db-release/preflight.mjs, scripts/db-release/targets.json, scripts/release-db.mjs, scripts/vercel-build.mjs, scripts/migrate-deploy.mjs, scripts/init-preview-db.mjs, scripts/seed-admin.mjs, tests/db-release.test.mjs, tests/db-release-postgres.test.mjs, package.json, handoff/state/coordination docs (reviewed from the staged candidate, tree 99a7123565b11e02e41a8e31f2605abaf3e92718)
Validation: Polar sandbox checks only (packet and section hashes, handoff pin, COORDINATION render, source read, guard-removal probe, PGlite migration and catalog-query run). All project test, build, lint, type, Vercel and Neon runs are Codex's; Polar re-ran none of them.
Risks: one blocking finding (B1, guard tests pass with the guards deleted); the build wrapper is not yet wired into either Vercel project; no successful production release-gate run exists; snapshot capacity and the missing EnvelopeSink table are open prerequisites.
Next owner: codex

# OPS-01-DB independent remote review

## 1. Packet
- File POLAR-REVIEW-OPS-01-DB.txt: 605,324 bytes, SHA-256 c34378c1fcccbfc7407b70d5d9300768efbf5dd1feeb7c4cf020968edb139de8. Both match the stated values.
- 51 file sections extracted. Every byte count and SHA-256 verified (0 mismatches). Header format is `=== FILE <path> | kind=<kind> | bytes=N | sha256=H ===`.
- Handoff pin: docs/project-state.json task OPS-01-DB is in_review, owner codex, reviewer polar, review null, head f3d9aff0. handoff.sha256 equals the SHA-256 of docs/team/OPS-01-DB-implementation.md as extracted (1c268693...27a3f).
- COORDINATION.md equals render(project-state.json) from the project-sync render function.

## 2. Evidence attribution
| Evidence | Runner |
| --- | --- |
| 20 release tests, 18 coordination, 4 dashboard, tsc, lint, isolated preview build | Codex (logs in packet) |
| Neon snapshot refusal ("snapshots limit exceeded"), failed release receipt | Codex, real operator run |
| Vercel scope readback, preview-role-absent-in-production probe, EnvelopeSink diagnostic, history pin probe | Codex, sanitized JSON; not reproducible by Polar |
| Source read of every changed script and test; guard-removal probe; 7 migrations plus the 6 catalog queries run in PGlite | Polar sandbox only |

## 3. Blocking finding

### B1. The "cannot invoke operator commands in Vercel builds" tests pass with the guards deleted (vacuous)
tests/db-release.test.mjs runs release-db, migrate-deploy, init-preview-db and seed-admin with VERCEL_ENV=preview and production and a fake production-style DATABASE_URL (prod.example), then asserts only exit status 1 and that the URL is not echoed. Each script exits 1 for an unrelated reason even without its VERCEL_ENV guard: release-db fails the identity check, migrate-deploy refuses the non-local host, init-preview-db fails assertTarget, and seed-admin lacks its required variables.

Polar sandbox probe: I removed the VERCEL_ENV guard from all four scripts (grep count 0 in each) and re-ran the same test file. Tests 17 and 18 still pass. So the requirement "migrate deploy and seed:admin must not run in non-production builds" has no test that fails when the guard is removed. This is the same defect class as FIN-01 v2.

Required fix (tests, plus at most one message in init-preview-db):
- Assert the guard-specific refusal, not only status 1. The messages already differ: release-db prints `stopped at environment`, migrate-deploy and seed-admin print `forbidden in Vercel builds`. init-preview-db currently prints one generic message for every failure, so give the VERCEL_ENV refusal a distinct line and assert it.
- Where practical, make the rest of the input valid so the guard is the only reason to refuse (for example, a loopback DATABASE_URL for migrate-deploy and the admin variables for seed-admin).
- Show a baseline-fail probe: with a guard removed, the corresponding assertion fails.
- Production code outside these messages stays byte-identical. Resubmit as a delta.

## 4. What I verified and found sound
- **Target identity.** SHA-256 over (hostname without `-pooler`, database, role). Tests cover pooled-host equivalence, a different database, a different role, preview-versus-production crossover in both directions, unknown environment and unknown project. The identity check is the right strong control: a preview build holding the production URL fails before any effect.
- **Release sequence.** releaseSequence runs snapshot, record, preflight, record, migrate, record, verify, record. The tests inject a failure at every one of the eight steps and assert the exact event prefix, so each phase refuses the next. They also cover an incomplete snapshot receipt, a negative preflight and check-only (never migrates). Receipts use `wx` open mode, fsync after every write and a private evidence directory outside the checkout. The snapshot refusal in the real operator run stopped the gate before preflight, and the failed receipt records laterPhasesAttempted false. That is the intended fail-closed behavior.
- **Read-only preflight.** Server-enforced: BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY, then SHOW transaction_read_only must be `on`, with rollback in finally. The real-Postgres test shows a write fails with 25006. The reference database is created on an explicitly local server and dropped in finally. Schema drift (extra column, extra enum value) and checksum drift are each rejected in that test.
- **Migrate under the release lock.** Session advisory lock, then a recheck that history prefix and schema fingerprint still equal the preflight values immediately before `migrate deploy`, then post-migration complete-history and journal-health verification. A changed target aborts.
- **Release preconditions.** A non-check-only release requires a clean tree, project:check, no task in progress or in review, and an exact-commit successful full CI run.
- **Historical checksum pin is narrow.** I recomputed from the packet: the historical fef2873 file hashes (LF-normalised) to 6b957fab1a68..., the stored production checksum; the current file hashes to 5f67ef3272d8..., the pinned currentChecksum. The diff between the two versions touches only the section 3 UPDATE (the backfill DML). No DDL line changed. The exception binds one migration name to the exact current SQL hash (changing the SQL throws), requires full existing-schema verification, never rewrites history and never reruns the backfill. The unit test covers the pinned, unpinned and changed-SQL cases.
- **Build wrapper.** vercel-build.mjs has no migrate or seed subprocess in any environment. Its test checks a specific stderr pattern (`Database target`), so it fails if the identity check is removed. Credentials never appear in output.
- **Reference schema.** I ran all seven migration files in PGlite: all apply cleanly and EnvelopeSink exists in the migrated reference, so the missing-table finding is a real difference against the expected schema. The six catalog queries run and return rows. Whether production lacks the table is Codex's read-only production diagnostic; I could not reproduce it.

## 5. Non-blocking findings
- **N1. The wrapper is not wired.** Both projects' build command reads back as `pnpm build` and package.json build is unchanged. The ignore guard and deployment protection remain, and nothing in the build now migrates or seeds, so previews and production are safe today. But the preview-isolation claim rests on credential scopes that Vercel does not let anyone read back (sensitive values). Before the wrapper replaces `pnpm build`, a first preview build per project must print the `[build-gate] verified preview <project> database identity <hash>` line with the pinned hash. Codex lists this as a rollout gate; keep it explicit.
- **N2. No way to advance a preview database.** init-preview-db requires an empty database, and the wrapper requires a complete migration history. After any new migration, previews fail the build until the preview database is recreated. Document a recreate-then-init procedure, or add a reviewed preview-migration step.
- **N3. Check-only consumes snapshot quota.** It takes a real Neon snapshot, and the snapshot limit is already the blocker. Resolve capacity (retention or deletion by the owner, never automatic) before the next schema release, and consider an explicit documented override path that does not skip recording.
- **N4. Snapshot receipt is not state-checked.** The gate confirms id and source branch, not that the snapshot is complete or restorable. Cheap to add a status check.
- **N5. Schema fingerprint scope.** It excludes sequences, grants, extensions and non-`compass_` functions. Acceptable for the current schema; state the limit in the docs.
- **N6. EnvelopeSink repair.** Production lacks a table that src/lib/seed-sinks.ts and the setup envelopes page call, though its migration is marked applied. OPS-01-DB-REPAIR is correctly separate. It needs its own review, a snapshot first, and a check of which code paths fail in production today.
- **N7. Environment warnings.** The pg SSL-mode warning appears in logs; set `sslmode=verify-full` explicitly before pg v9.

## 6. Acceptance
| Criterion | Result |
| --- | --- |
| Separate preview credential scopes and databases | Codex readback and isolation proof; plausible and consistent; not Polar-verifiable (N1) |
| Preview cannot use the production target | Pass (identity tests, both directions) |
| migrate deploy and seed:admin refused in non-production builds | Guard code present; test does not prove it (B1) |
| Durable snapshot, then read-only preflight, then stop on failure | Pass |
| Production-style migration from a preview fails loudly | Pass for build wrapper; see B1 for the operator commands |
| No unguarded window on rollback | Pass as designed; guard and protection kept until the wrapper is published and attested |
| Existing previews stay protected | Codex evidence: deployment protection read back on both projects |
| Successful production gate run | Not achieved, and not claimed (snapshot limit, EnvelopeSink) |

## 7. Conclusion
The release gate, the identity check and the historical pin are well built and fail closed. The one defect is evidentiary: the tests meant to prove the build-time refusal pass even when the refusal is deleted. Fix B1 with a tests-and-message delta and I expect to approve. Approval will not mean the gate has run in production, and the wrapper rollout, snapshot capacity and EnvelopeSink repair remain separate prerequisites for FIN-02-B.

No claim, ack or verdict recorded by Polar. This is an independent remote review, to be recorded by Codex in remote-proxy mode only after the exact bytes and SHA-256 are confirmed. Nothing here authorizes a commit, push or deployment.
