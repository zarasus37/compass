Task: OPS-01-DB-CI
Author: polar
Base commit: 9a60a7721de6775bc395169e48cdcff8dcd0035e
Verdict: approved
Changed files: .github/workflows/ci.yml (one step moved), docs/team/OPS-01-DB-CI-implementation.md, docs/project-state.json, COORDINATION.md
Validation: Polar read-only review of the inline workflow, diff, handoff and task record. Polar ran nothing. The original CI failure, local Prisma generation, project:test 18/18, 4/4 and 20/20, the dependency-order assertion and the byte comparison are Codex's and are unverified by Polar.
Risks: only a full Linux CI run on the follow-up commit can prove the fix; a second clean-runner prerequisite may surface behind this one (see N1); OPS-01-DB N1 to N8 and the release prerequisites are unchanged.
Next owner: codex

# OPS-01-DB-CI independent review

## 1. What I received and what I could check
The material arrived inline, not as a packet file, so I could not hash a packet or extract sections. Checks I could make from the text:
- The handoff pin in the task record (sha256 471f7ee37b6b493f4fd001b0b5e3dddbe37926c5fa28f22c82c13254d7604361, head 9a60a772...) equals the hash on the handoff section header. I did not recompute either hash, because the exact bytes of an inline paste are not guaranteed.
- The task record shows status in_review, owner codex, reviewer polar, review null, and acceptance criteria that match the diff.
- The base commit is a valid 40-character SHA and matches the handoff.

## 2. The change
The diff moves one existing workflow step. `Generate Prisma client` (`pnpm db:generate`) now runs before `Verify coordination claims and handoffs` (`pnpm project:test`). Nothing else changes in the workflow: same steps, same commands, no step removed, no condition added, no `continue-on-error`, no stub, no committed generated file.

## 3. Why it is correct
- **Cause.** The failed run 40069059632 passed the coordination and release tests, then failed both operator-refusal tests. seed-admin statically imports `../src/generated/prisma/index.js` (line 47 of the script), which does not exist on a clean checkout until Prisma generates. That import resolves before the VERCEL_ENV guard in main() can run, so the guard assertion could never be reached. This is consistent with the guard-specific assertions I required in OPS-01-DB B1: they now fail loudly instead of passing for the wrong reason.
- **Order is safe.** Dependencies are installed first, and `project:check` still runs before generation as before. Generation needs `DATABASE_URL`, which is set at job level. It reads nothing from the database that the later migration step creates.
- **Local evidence is consistent.** Codex's local runs had a generated client present, which is the state CI will now have at project:test. That explains why the problem was invisible locally.
- **No weakening.** The guard assertions, the tests and the scripts are unchanged from the approved tree. This is the right kind of fix: it changes the environment the tests run in, not the tests.

## 4. Non-blocking findings
- **N1. Next clean-runner prerequisite may sit behind this one.** seed-admin also imports `../src/lib/auth/password-policy.ts` (line 50) and `@node-rs/argon2`. On CI, `node-version: 22` resolves to the latest 22.x, which strips TypeScript types by default, so I expect the import to work; my own sandbox (Node 20) could not load a .ts file. The test also tolerates the typeless-package warning, because it matches on the guard message, not on empty stderr. I cannot prove this from here. If the run fails at that import, treat it as a separate fix, and do not waive it.
- **N2. Nothing guards the ordering.** A later edit could move generation back below project:test and reintroduce the failure. The failure is loud, so this is low risk. A one-line comment in ci.yml saying why generation precedes project:test would help.
- **N3. Handoff wording.** The handoff says a "dependency-order assertion" passed locally. I could not see what it checks, so I am not relying on it.

## 5. Acceptance
| Criterion | Result |
| --- | --- |
| Generate Prisma before project:test | Met by the diff |
| Guard assertions and application/release script bytes preserved | Met per the diff; byte comparison is Codex's |
| Original failure recorded; full CI must pass before merge | Failure is recorded and not waived; the full run is still required |

## 6. Conclusion
The change is one correctly placed step with a clear cause and no loss of coverage. Approval is for this workflow change on the stated base. It does not claim that CI will pass, which only the full Linux run on the follow-up commit can show. The OPS-01-DB prerequisites are unchanged: wrapper rollout with the first-preview identity check, snapshot capacity, and the reviewed EnvelopeSink repair before the next schema release.

No claim, ack or verdict recorded by Polar. This is an independent remote review, to be recorded by Codex in remote-proxy mode only after the exact bytes and SHA-256 are confirmed. Nothing here authorizes a commit, push or deployment.
