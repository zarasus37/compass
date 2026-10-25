# OPS-01-DB — implementation handoff

Task: OPS-01-DB
Author: codex
Base commit: f3d9aff01a674bb3b2d296353ae1f422ef7c0134
Changed files: Listed below; staged uncommitted OPS-01-DB candidate only.
Validation: Codex local/operator checks below; new CI and platform rollout pending.
Risks: Snapshot capacity and missing EnvelopeSink block subsequent schema releases; no successful production release-gate run.
Next owner: polar (independent remote review)

## Work and decisions

All work in this submission is Codex implementation or Codex local/operator evidence. MiniMax made no changes. The canonical main checkout contained this task's uncommitted changes only at submission; there is no local branch/worktree or production application/schema change. The staged tree and exact full-file hashes are supplied with the packet.

Changed paths: 00-DESIGN.md, COORDINATION.md, docs/project-state.json, package.json, scripts/db-release/core.mjs, scripts/db-release/preflight.mjs, scripts/db-release/targets.json, scripts/init-preview-db.mjs, scripts/migrate-deploy.mjs, scripts/release-db.mjs, scripts/seed-admin.mjs, scripts/vercel-build.mjs, tests/db-release.test.mjs, tests/db-release-postgres.test.mjs, and this handoff.

DR-OPS-DB-01 removes schema writes and admin seeding from Vercel builds. Each project has a different fresh preview database and role on the isolated preview Neon branch. Those roles do not exist on production. Production DATABASE_URL entries were changed by a scope-only PATCH, preserving their encrypted value and ID; separate preview-only sensitive entries were created. The unused Compass NEON_DB_DATABASE_URL alias lost preview scope. Mom's production admin and session variables also lost preview scope; its preview session secret is independent. Local private env files were not changed.

Both project build commands currently read back as `pnpm build`, with the external preview ignore guard and all-except-custom-domains deployment protection retained. This is an intentional paused transition: the final wrapper is not yet in published source. After review/publication, change each command to `node scripts/vercel-build.mjs compass` or `node scripts/vercel-build.mjs compass-mom`, respectively. Verify actual platform builds before removing the ignore guard. Current production artifacts and aliases remain the FIN-02-A release.

The wrapper validates the pinned environment identity, complete finished migration history and journal availability using a server-enforced readonly transaction, then generates Prisma and runs Next build. It never migrates or seeds. The operator release command rejects every Vercel environment and remote pooled connections. A real release additionally requires a clean reviewed commit, successful project alignment, no unresolved active review, and exact-commit successful full CI. It takes a Neon snapshot, fsyncs its receipt outside Git, then runs a RepeatableRead READ ONLY full-schema preflight against a disposable local reference built from the applied migration prefix. Only then may migration and post-verification run. Receipt/snapshot/preflight/migration failures stop subsequent effects. Failures after opening the journal receive a bounded phase receipt. The advisory lock is cooperative, not access control.

The full schema comparison includes public table columns/types/defaults/nullability, constraints, indexes, triggers/enabled state, Compass function definitions and enum labels/order. It excludes the migration metadata table and ignores physical column order. No production row values enter the fingerprint. Future unapplied SQL is not executed during preflight. Reference databases have per-run owned IDs and are removed after use.

## Acceptance evidence

1. **Explicit preview isolation:** Vercel API readback shows exactly separate production-only and preview-only DATABASE_URL entries, no branch overrides. Production ciphertext/IDs are unchanged. Both new preview databases have seven migrations and zero users. Real readonly probes show both preview roles absent in production; attempting production authentication with each preview credential is refused. Hosts are redacted in the sanitized operations evidence; identities are SHA-256 pins of host/database/role, excluding passwords. Vercel's sensitive-variable GET omits values, so this is scope readback plus known credential/local connection proof. Actual platform wrapper identity attestation remains a rollout gate; no plaintext API readback is claimed.

2. **Build commands:** Both externally configured commands are `pnpm build`, with no migrate or seed. The final guarded wrapper completed a local production compilation against the real isolated Compass preview database, exit 0. Its log includes the preview identity attestation. That is a local build with VERCEL_ENV=preview, not a Vercel deployment. Both platform environments refuse operator migrate/release/provisioning/admin-seed commands before connecting; wrong-target preview builds fail before client generation or compilation.

3. **Release sequencing and refusal:** Twenty release tests pass, including ordered durable receipts, injected failure at every phase, incomplete receipts, negative preflight, check-only non-migration, exact historical checksum binding, real PostgreSQL schema/checksum drift, pending-prefix handling, and a real READ ONLY write rejection. The production check-only command refused at snapshot because Neon reports `snapshots limit exceeded`. A durable failure receipt confirms no later phases attempted. **No successful production release-gate run has occurred. No production migration or repair ran.** Separately, a server-readonly diagnostic reached full-schema comparison and correctly refused the missing EnvelopeSink table described below.

4. **Safe preview failure:** Real child-process tests invoke the actual entrypoints with preview/production platform flags and production-style URLs. All refuse loudly with exit 1 and no credential text. The preview target failure also proves generation/compilation did not start.

5. **Rollback:** Keep scoped credentials, preview guard and deployment protection through publication and validation. Roll back by promoting a compatible existing artifact. Never restore automatic migration/seeding commands. The external ignore guard can be removed only after the final wrapper is published and isolated platform builds attest both identities; the wrapper and unavailable production roles remain protective layers. No guard was removed in this task.

## Historical checksum and structural findings

Production's tenant migration checksum is `6b957fab1a689f0a91bbb297d4f3896d0bb017bba953f643c1165fec7330e511`, exactly the file at original commit fef2873. Commit 0f8effa changed only the PayPeriod backfill, retaining the same DDL. The current canonical SQL hash is `5f67ef3272d8d2a52368d6e02c96514cc0c8e8ce06900898dabfbb25ccf3ae62`. The production-only configuration pins precisely this migration name and both hashes. Any later SQL change invalidates the exception. A test fails without the pin, accepts the pinned original, and rejects a changed current SQL file. No history was rewritten and no backfill reran. LF/CRLF equivalent checksums are separately supported for Windows/Linux migration history.

The complete schema comparison finds EnvelopeSink missing, with its eleven columns, associated constraints and four indexes. All other catalog rows in the comparison match the migration reconstruction. This table is still in the Prisma schema and has callers in src/lib/seed-sinks.ts and setup envelopes. The narrower previous release comparison established preservation of the existing production tables; it did not establish that every historically applied table was present. This submission makes no repair or assertion of historical sink-row recovery. Keep the preflight refusing this discrepancy.

## Validation and limits

- Codex canonical checks: environment-file alignment clean; project alignment and encoding clean; coordination 18/18; dashboard 4/4; final release tests 20/20 (zero skips); tsc exit 0; lint exit 0, baseline 459 warnings; guarded isolated preview Next build exit 0.
- Codex live readonly/operator checks: preview initialization on two empty preview databases only; scope/settings readback; role/authentication isolation; both production health endpoints HTTP 200, live/ready true; snapshot-limit refusal; readonly complete-schema refusal. These are not authenticated production application smokes.
- New CI has not run. The existing FIN-02-A CI does not validate this candidate. The new tests are added to project:test, so PR CI will execute them on PostgreSQL 16/Linux.
- No commit, push, merge or deployment of this candidate has occurred. Independent review, full PR CI, actual platform wrapper attestation and guard-removal verification remain integration gates.
- Snapshot capacity and the separately reviewed EnvelopeSink repair are named prerequisites to the next schema release, including FIN-02-B if it adds a migration. The existing recovery snapshot was preserved; no destructive Neon operation was performed. OPS-01-DB-REPAIR is queued unassigned, not implemented within this task.
- Privileged direct Prisma/SQL, an actor ignoring the shared protocol, or manual project-setting changes can bypass cooperative tooling. This is an enforced operator/build route, not a database security boundary against an owner. Preview roles provide a separate production authentication boundary.

Polar should review this exact candidate and its evidence. A successful production snapshot/preflight is incomplete, and is not represented as a pass or waived by the local tests.
