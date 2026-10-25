Task: OPS-01-DB
Author: polar
Base commit: f3d9aff01a674bb3b2d296353ae1f422ef7c0134
Verdict: approved
Changed files: tests/db-release.test.mjs, scripts/init-preview-db.mjs (final catch line only), docs/team/OPS-01-DB-implementation-v2.md, docs/team/OPS-01-DB-review.md, docs/project-state.json, COORDINATION.md; additive delta on staged tree 99a7123565b11e02e41a8e31f2605abaf3e92718, giving staged tree f827e7478e594ebd31627b712a175c505141876a
Validation: Polar sandbox only (rebuilt both changed files from the delta and matched the stated hashes; compared the three untouched scripts by hash; ran the refusal tests with each guard present and each guard removed). All project, type, lint, build, Vercel and Neon runs remain Codex's; Polar re-ran none of them.
Risks: approval covers the B1 delta only; the wrapper is not wired, no successful production release-gate run exists, snapshot capacity and the missing EnvelopeSink table remain prerequisites, and N1 to N7 from the first report stand unchanged.
Next owner: codex

# OPS-01-DB re-review of the B1 correction

## 1. What was delivered and how I checked it
The delta arrived inline in the message, not as an uploaded packet file. Because there is no packet file, I could not hash a packet or its sections as a unit. I verified the content directly:

| Check | Result |
| --- | --- |
| scripts/init-preview-db.mjs rebuilt by applying the one-line delta to the first-packet bytes | 1,485 bytes, SHA-256 e66631da976e865c710ce3409a533948aac744380e7a226c6e49f7625f00eb8f, equal to the stated section hash |
| tests/db-release.test.mjs rebuilt by applying the delta to the first-packet bytes | 7,586 bytes, SHA-256 fb373358ddd451fbc0b904be85813153cfd1e7c75b55fb285f4bad30541e26fb, equal to the stated section hash |
| scripts/release-db.mjs, migrate-deploy.mjs, seed-admin.mjs from the first packet | SHA-256 1d4ea77c..., 701af278..., 6f3ecc98..., equal to the "identical" hashes in the mutation proof |
| docs/team/OPS-01-DB-review.md section | 10,890 bytes, SHA-256 54c6537139c42cc0f0bb26c24e69056ecf86c0cae9613fefeafc140441ae561b, equal to the report I confirmed on 2026-10-21 |
| State and handoff | docs/project-state.json shows OPS-01-DB in_review, owner codex, reviewer polar, review null, handoff pointing at OPS-01-DB-implementation-v2.md (sha 49c415f2...), head f3d9aff0. I did not byte-verify the handoff, state or COORDINATION text (see N8). |

The delta is exactly two things: the refusal assertions in the test, and the final catch line of init-preview-db. Production code is otherwise unchanged. The earlier init-preview-db hash d49dc774... is the only entry flagged "identical: false" in the proof, as expected.

## 2. B1 is closed (Polar sandbox probe)
The corrected test now requires each script's own guard message:
- release-db: `Schema release stopped at environment;` (phase is still `environment` only when the guard fires, so a failure at the later target check prints `stopped at target` and fails the assertion).
- migrate-deploy: `Schema deployment is forbidden in Vercel builds`.
- init-preview-db: `Preview provisioning is an operator command, never a build command`.
- seed-admin: `Admin seeding is forbidden in Vercel builds`.

I ran the two refusal tests (preview and production) four ways:

| Condition | Pass | Fail |
| --- | --- | --- |
| all guards present | 2 | 0 |
| release-db guard deleted | 0 | 2 |
| migrate-deploy guard deleted | 0 | 2 |
| init-preview-db guard deleted | 0 | 2 |
| seed-admin guard deleted | 0 | 2 |
| all guards restored | 2 | 0 |

Each deletion is now caught, and the restored state passes. This is the baseline-fail evidence I asked for, and it independently matches Codex's four-script mutation proof, including the exact "actual" messages it recorded (for example `stopped at target` and `Remote schema deployment requires...`).

Sandbox note: my sandbox runs Node 20 and has no generated Prisma client, so for the seed-admin run I stubbed the generated client and pointed its password-policy import at a .js stub. That changes only how the script loads in my sandbox. The guard line and its message are unchanged, and the guard runs first in main().

## 3. The init-preview-db message change is safe
The catch now prints `error.message` only when it equals the exact guard string; every other error (connection, identity, bootstrap) still prints the generic `Preview provisioning refused or failed`. No raw database or connection text can reach the output, and the test's no-leak assertion (`prod.example`, `owner:secret`) still runs on every case.

## 4. Remaining limits, none blocking this delta
- The fake non-matching production URL stays on purpose, so the negative tests can never reach a real effect. The consequence is that these tests prove the guard fires first; they do not prove what each script would do on a valid input without the guard. That is acceptable for a guard test.
- The guard tests are still sensitive to the exact message text. A future wording change will fail them loudly, which is the intended behavior.

## 5. Carried over unchanged from my first report (not resolved by this delta)
- N1: the build wrapper is not wired (both projects still build with `pnpm build`); a first preview build per project must print the pinned identity line before the wrapper replaces it.
- N2: no procedure to advance a preview database after a new migration.
- N3: check-only consumes snapshot quota; snapshot capacity is unresolved.
- N4: the snapshot receipt is not state-checked.
- N5: the schema fingerprint excludes sequences, grants, extensions and non-`compass_` functions; state the limit.
- N6: production lacks `EnvelopeSink` although its migration is marked applied; OPS-01-DB-REPAIR must be separately reviewed, with a snapshot first.
- N7: set `sslmode=verify-full` explicitly before pg v9.
- N8 (new, cosmetic): the generated COORDINATION.md prints `Evidence: undefined.` for the OPS-01-DB verification entry, because that entry has no evidence field. Add one or make the renderer omit it. Not a blocker.

## 6. Acceptance
| Criterion | Result |
| --- | --- |
| B1: refusal tests fail when a guard is deleted | Closed (probe above, four of four) |
| Production script bytes unchanged outside the one message line | Confirmed by hash (three scripts identical; init-preview-db differs only at its catch line) |
| Previous findings (identity, release sequence, read-only preflight, historical pin) | Unchanged from my first report |
| Successful production release-gate run | Not achieved and not claimed |

## 7. Conclusion
B1 is closed with real baseline-fail evidence that I reproduced. Approval applies to the staged tree f827e7478e594ebd31627b712a175c505141876a and means the guard tests are sound, nothing more. It does not mean the release gate has run in production, and the wrapper rollout, snapshot capacity and the EnvelopeSink repair remain prerequisites for the next schema release, including FIN-02-B if it adds a migration. Full PR CI on the exact tree and the first-preview identity attestation are still required before any rollout.

No claim, ack or verdict recorded by Polar. This is an independent remote review, to be recorded by Codex in remote-proxy mode only after the exact bytes and SHA-256 are confirmed. Nothing here authorizes a commit, push or deployment.
