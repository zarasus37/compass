# Compass — deployment verification runbook

Read COORDINATION.md for the current task and verification status. This runbook supplies procedure, not a claim that production matches the local checkout. The previous launch instructions are [archived](docs/archive/2026-10-08/00-MOM-LAUNCH-RUNBOOK.md).

1. Confirm the intended Vercel project, database, branch and commit. The historical snapshot describes two separate environments; do not assume they should be merged or share databases.
2. Review the final diff, task approval and existing local changes. Run project:check, project:test, type/lint checks, appropriate smoke tests and a production build. Record skips honestly.
3. Confirm dependency lockfile, Prisma generation and migration compatibility. Test migrations against a disposable database, never a real user's database. Review configured deployment build commands before publishing.
4. Verify required env variable names against application code and example templates. Inspect names/presence without printing values. Keep secrets and signer keys out of Git and reports.
5. On an authorized deployment, apply versioned migrations through the configured pipeline. Admin provisioning must be explicit. Real users start empty; never seed a demo persona into a real account.
6. Verify authenticated setup, accounts, transactions, envelope changes, paycheck behavior and reports on the intended deployment. Check health and cron executions, not just page availability. Expected paychecks are not bank-confirmed deposits.
7. Verify error capture, backups and a restore procedure. Record exact deployed commit, target, timestamp, checks and failures in project-state.json evidence through the coordination workflow.
8. Real Vault settlement requires actual provider confirmation. Current stub adapters cannot prove payment completion. Keep simulations identified as simulations.

No deploy, push, environment mutation, database cleanup or payment is authorized by reading this runbook alone. Follow the user's active task scope. Never use archived credentials or destructive test setup on production.

## Detailed historical launch checklist

The complete earlier 418-line launch checklist remains in [the original snapshot](docs/archive/2026-10-08/00-MOM-LAUNCH-RUNBOOK.md), preserved byte for byte. Use it as a detailed reference for target setup, environment contracts and user acceptance, checking each step against the current source and explicitly assigned deployment target. Its old status assertions, account setup and commands are historical, not standing authority. The shorter current procedure above supplies the mandatory evidence and deployment boundaries; it does not certify that either existing deployment has been validated.
