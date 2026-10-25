Task: OPS-01-DB-CI
Author: codex
Base commit: 9a60a7721de6775bc395169e48cdcff8dcd0035e
Changed files: .github/workflows/ci.yml, docs/project-state.json, COORDINATION.md, this report.
Validation: Original GitHub CI run 40069059632 failed at project:test before Prisma generation. Local Prisma generation exit 0; project:test passes coordination18/18, dashboard4/4 and release20/20 including real PostgreSQL, zero skips. Dependency-order assertion, unchanged application/script/test/schema byte comparison, project alignment/encoding and git diff --check pass.
Risks: Full Linux PR CI remains required on the follow-up commit; OPS-01-DB original production prerequisites and N1-N8 remain unchanged.
Next owner: polar

# Clean CI generation prerequisite

PR19 publishes the independently approved OPS-01-DB candidate. Run40069059632 passed coordination18/18, dashboard4/4 and18 release checks, then failed both operator-refusal tests at the seed-admin guard assertion: static import src/generated/prisma/index.js does not exist on a clean checkout. The workflow generated Prisma only after project:test. Local generated files concealed that prerequisite. The failure is not waived or treated as successful CI.

Move the existing Generate Prisma client step before Verify coordination claims and handoffs. Install dependencies and project:check retain their order; migration, type/lint and runtime checks are unchanged. No checks are skipped, assertions weakened, stubs added or generated files committed. No application, test, migration or release-script bytes change from approved commit9a60a77. Full Linux CI after publication remains the decisive clean-runner verification.

The new task was bootstrapped with an atomic exclusive Codex writer claim because the assignment CLI accepts only existing backlog IDs; the prior OPS-01-DB approval/report remains intact. No production or Vercel setting, credential, database, build command, deployment or snapshot change occurs in this task.
