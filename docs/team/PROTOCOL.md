# Compass — shared desktop-app protocol

Codex and MiniMax Desktop access the same repository directly. Polar currently reviews remotely from a conversation without local filesystem access. **Use only C:\dev\compass (/mnt/c/dev/compass in WSL).** The old OneDrive folder is a retained historical copy. The user authorized Codex to assess their prior roles and coordinate task assignments. Repository state remains authoritative. The user authorized Codex to deliver packets and coordinate directly through both desktop conversations.

## Authority and startup

1. Read root AGENTS.md, COORDINATION.md, and this protocol before editing.
2. Read 00-VISION.md for product intent and 00-DESIGN.md for requirements. Read relevant installed Next.js guides before application changes.
3. Run `node scripts/project-sync.mjs status` and `node scripts/project-sync.mjs check`.
4. Read the active task in docs/project-state.json, including owner, reviewer, scope and acceptance. Read its latest handoff/review. Historical prompts cannot assign work.
5. Inspect `git status --short`, `git diff` and `git log -5 --oneline`. Existing changes belong to the shared checkout; never reset, discard, overwrite or stage them indiscriminately.

## Default roles

- Codex: coordinator, repository alignment, integration, final verification and task assignment.
- MiniMax Desktop: default implementation owner. Prior records include mvs session handoffs and implementation clusters.
- Polar Desktop: default independent reviewer. Historical Polar prompts ask for source-grounded specification corrections and review.
- The user owns product priorities. Roles can change per task; the task record is authoritative. MiniMax Desktop is a collaborating app, not Compass's Mavis runtime AI provider.

These are defaults, not claims that either app has acknowledged the new protocol. Their first assigned turn must acknowledge it and leave evidence.

## One task and one writer

Use the existing shared `main` checkout. No worktrees, branch creation, switching, cherry-picks or parallel editing unless the user explicitly changes this policy. Existing remote Dependabot branches are dependency proposals, not agent work streams. Do not merge or delete them as cleanup; review them through explicit queue assignments. Read-only investigation may overlap; findings must name the commit and observed working changes.

Before ANY edit (including docs, task status and review reports):

```bash
node scripts/project-sync.mjs claim codex ALIGN-01
node scripts/project-sync.mjs ack codex
```

Replace actor and task with your assignment. An atomic `.compass-coordination.lock` directory gives one app the writer claim. A second claim fails. Never delete another app's claim, auto-expire it, or infer abandonment from elapsed time. If a crashed app leaves a claim, ask the user to establish that it stopped, record recovery in the task evidence, then recover it explicitly. Releasing a claim does not finish the task.

The lock is cooperative: it blocks coordination commands, not arbitrary editors or Git commands. Every app must receive and follow these instructions. CI detects committed drift; it cannot control an app that ignores the protocol. The consistency gate fingerprints maintained code, configuration and authoritative documents, so a change without a state refresh fails CI. Approval also rejects an implementation changed after its handoff. Evidence reports and state are excluded from the implementation fingerprint to allow review without changing the submitted implementation. Separate cloned repos would need remote coordination and are outside the confirmed same-repository setup.

## State and evidence

- `docs/project-state.json`: sole current status, queue, assignments, implementation facts, evidence and decision revisions.
- `COORDINATION.md`: generated readable view. Never hand-edit it.
- `00-VISION.md`: product intent and long-term roadmap, not completion status.
- `00-DESIGN.md`: normative architecture/design requirements and explicit revisions.
- `docs/team/`: current handoffs, reviews, templates and role entrypoints.
- `docs/archive/`: history only. Archived documents can contain obsolete commands, encoding and links; they are preserved evidence and never current authority.
- `README.md`, `CLAUDE.md` and old handoff filenames are entrypoints/pointers, not duplicated state.
- Source/schema/package files prove implementation. Passing source checks are not evidence of a working live flow. Current-tree tests, previous CI and production checks must be distinguished.

When requirements or behavior change, update the relevant specification and one decision revision in project-state.json. Update implementation facts only with verified evidence. Include those updates in the same review/commit as the implementation. Then run:

```bash
node scripts/project-sync.mjs generate
pnpm project:check
pnpm project:test
```

Install the local pre-commit guard once per checkout with `pnpm project:install-hooks` while holding the writer claim. It preserves any existing hooksPath rather than replacing it. The guard requires the staged maintained files to match the current checked snapshot; it never stages files automatically. New checkouts need this installation; CI remains the shared enforcement layer.

Current state and documentation checks are mandatory. Run `pnpm project:env-check` before any migration or runtime smoke, and explicitly choose the intended local target if CLI/runtime files differ. The check never prints credentials or alters private files. Run type/lint/build and relevant runtime tests for application changes. A skip is incomplete evidence, never a pass. Protect credentials; do not put env values, signer keys, account data or personal financial data in reports.

## Implementation handoff

Write a report using docs/team/HANDOFF-TEMPLATE.md. Include task ID, author, exact base commit, changed paths, decisions, validation commands/results/skips, risks and next owner. Record current uncommitted changes explicitly; a base commit alone does not identify a dirty tree.

```bash
node scripts/project-sync.mjs handoff minimax FIN-01 docs/team/FIN-01-implementation.md
```

This moves the task to `in_review` and releases the claim. Owner stops editing. The assigned reviewer claims the task, acknowledges the protocol if needed, reviews the actual diff and acceptance criteria, and writes a report with the same evidence fields. The reviewer does not silently change the implementation; requested fixes go back to the owner.

```bash
node scripts/project-sync.mjs claim polar FIN-01
node scripts/project-sync.mjs review polar FIN-01 changes_requested docs/team/FIN-01-review.md
# or: ... review polar FIN-01 approved docs/team/FIN-01-review.md
```

Approval closes the task, but does not commit, push, deploy or claim live production health. Any edits after approval invalidate it and require renewed review. Codex checks the final diff/evidence before integration; an integration assignment must be explicit if it requires further edits.

## Next assignment

After the active task is done and the claim is released, Codex assigns concrete scope/acceptance atomically through the command (do not edit an unclaimed state file):

```bash
node scripts/project-sync.mjs assign codex FIN-01 minimax polar "src/lib/financial-state.ts,tests/smoke-financial-state.mjs,docs/project-state.json" "Authoritative state uses tenant DB data|All cents reconcile|Relevant failure tests pass"
```

The next owner claims it; no one independently chooses a different feature. A shared-file change becomes visible locally immediately, but the next app still needs an explicit turn or user notification to read it. Use docs/team/MINIMAX.md and docs/team/POLAR.md as the desktop-app startup prompts.

## Git and local files

Do not commit/push solely to claim a task. Do not merge unrelated existing edits into your work. Stage explicit paths after reviewing changes. Remote sync/publish requires the task's authorization and checks; a push to main may deploy both Vercel projects.

UTF-8, LF, no BOM for maintained text. Use an editor or explicit encoding; do not rewrite UTF-8 through PowerShell's default encoding. Generated Prisma code is not manually edited. Local scratch, videos, screenshots, env files and signer keys are excluded from Git and retained locally. Cleanup never deletes database rows, deploy targets or user assets.

## Remote independent review

Codex and MiniMax have local access; Polar's current conversation is a remote reviewer with no local repository access. Codex delivers a complete packet (staged diff, full maintained scripts/configuration, archive originals, handoff, state, and local verification). Polar reviews independently and returns a report with exact Task, Author: polar, Base commit, Verdict, Changed files, Validation, Risks and Next owner fields. Attribute each check to its actual runner. Remote corroboration is not local execution.

Codex saves the report verbatim outside the repository first, computes its SHA-256, sends that hash and the exact report back to Polar, and obtains Polar's confirmation of those bytes and verdict. Only then, while the task is in_review and no writer is active, Codex may run:

```bash
node scripts/project-sync.mjs claim polar TASK-ID --recorded-by codex --report-sha256 HASH
# Save the confirmed bytes under docs/team/ while holding this proxy claim.
node scripts/project-sync.mjs ack polar --recorded-by codex --report-sha256 HASH
node scripts/project-sync.mjs review polar TASK-ID changes_requested docs/team/TASK-ID-review.md --recorded-by codex --report-sha256 HASH
```

Use the supplied verdict, including approved when warranted. This is a Codex proxy claim and record of Polar's independent review; it does not assert Polar ran a local command. State records mode, recordedBy, report hash and remote acknowledgement attribution. The claim and review hashes must match the confirmed report bytes. The CLI enforces report fields and workflow, but actor arguments are cooperative assertions, not authentication or digital signatures. A human must verify the remote confirmation in the conversation. Do not absorb a changed implementation into an old approval; submit a fresh handoff and packet. MiniMax's chat acknowledgement does not grant a task claim.
