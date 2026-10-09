# ALIGN-01 — repository cleanup implementation handoff

Task: ALIGN-01
Author: codex
Base commit: 36cf4ec5420549132d0349f2f8ce3771aba7bb14
Changed files: authoritative root docs; docs/project-state.json; docs/team; docs/archive/2026-10-08 snapshots and archive index; design/README.md; DeFi/README.md; business-reference label; scripts/project-sync.mjs; scripts/scan-encoding.mjs; tests/project-sync.test.mjs; tests/smoke-envelope-goal-persistence.mjs (eight comment lines, encoding only); package.json script additions; .github/workflows/ci.yml; .gitignore; .gitattributes; .editorconfig; .githooks/pre-commit. Private .env local target alignment is intentionally not staged. Retired OneDrive entrypoints contain local retirement notices, not a second active coordination system.
Validation: shared-state check PASS; maintained-file encoding check PASS; coordination regression suite 15 PASS / 0 FAIL / 0 SKIP; JavaScript syntax checks PASS; git diff --check PASS. Final targeted ESLint on both maintained scripts PASS with zero errors. Test files are excluded by the existing lint config and are validated through node --test and syntax checks. All 360 tracked runtime source files match their pre-cleanup byte hashes exactly. Fresh git fetch confirmed canonical HEAD/origin/main both 36cf4ec, ahead 0 / behind 0 before this local cleanup. Env target comparison PASS after confirming both targets were loopback PostgreSQL and aligning only CLI DATABASE_URL to the app's existing local target.
Risks: Polar re-review of this revision is pending; MiniMax acknowledged reading the protocol in chat and will record a local acknowledgement on its first assignment. This cleanup is a staged local change, not a commit, push, live deployment or successful full application smoke run. GitHub CLI CI lookup was unavailable because gh is not authenticated. The initial desktop attempt failed; subsequent Computer Use delivery succeeded. MiniMax acknowledged reading the protocol; Polar reviewed the packet remotely and requested changes. No local execution by Polar is claimed. The filesystem claim is cooperative, not an OS edit lock; all apps must adopt it. Local hooks can be bypassed; CI is the shared gate. Private credentials and user assets were preserved, never printed or staged.
Next owner: polar (independent review of ALIGN-01); minimax remains unassigned until the queue explicitly assigns implementation.

## Main finding and canonical location

The folder originally attached to the chat was the retired OneDrive copy at e056df2, 29 commits behind. The working repo had moved to **C:\dev\compass** (WSL /mnt/c/dev/compass) and was already at 36cf4ec. Initial old-copy audit claims about global periods, missing auth throttles, missing migration verification and DST are superseded by the canonical source.

Only new coordination work was transferred. Canonical auth/tenant/persistence/security/migration changes and package/lockfile were preserved. The old copy's application/spec bytes were restored to their exact pre-turn hashes using recovery data; only local retirement entrypoints remain changed there. No reset/stash/merge, agent branch, dependency update, payment, production config change or database write was performed.

## Authority and communication

- Product intent: 00-VISION.md.
- Maintained requirements/revisions: 00-DESIGN.md, with older visual material explicitly marked superseded.
- Current state/queue/roles/evidence: docs/project-state.json only.
- Readable handoff: generated COORDINATION.md.
- Shared execution: AGENTS.md + docs/team/PROTOCOL.md.
- Desktop startup: docs/team/MINIMAX.md and docs/team/POLAR.md.
- Historical records: existing docs/archive/clusters and handovers plus pre-alignment current-doc snapshots. No duplicate editable vision/handoff remains active.

Default roles are Codex coordination/integration, MiniMax implementation, Polar independent review. They are inferred from prior mvs implementation handoffs and Polar review prompts, and are overridden by explicit task assignments. MiniMax Desktop is distinct from Compass's Mavis runtime provider.

## Enforcement

The atomic writer claim rejects competing owners. Owner/reviewer transitions require report evidence. A review cannot approve a changed implementation using a stale handoff. A content fingerprint forces maintained code/config/docs changes to refresh shared state; hand-edited generated coordination fails. Task IDs, one active task, reviewer independence and branch policy are checked. Detached GitHub PR merges are allowed only for read-only CI validation. The local pre-commit guard rejects partially staged maintained snapshots, never stages automatically, and preserves existing hook paths during installation. CI runs alignment/encoding and the coordination regression suite. The env checker detects CLI/runtime target drift without logging connection values or changing configuration.

## Acceptance map

1. One current state and no competing active handoffs: implemented and checked. Old root aliases now point to the generated state.
2. Preserve history, edits and assets: canonical originals captured locally and in dated archive; retired-copy original hashes restored; 360/360 runtime source hashes unchanged; scratch/media/keys retained and excluded.
3. Single-writer owner/reviewer workflow: implemented; regression tests cover exclusion, handoff, requested changes, stale approval, atomic next assignment and independent reviewer ownership.
4. Automated consistency/encoding gates: implemented locally and in CI; regression tests also cover staged snapshots, hook installation and credential-safe target checking and identical CRLF/LF fingerprints across Windows/Linux.
5. Evidence and live limits: recorded above and in state. No unverified production assertion or fabricated external acknowledgement.

## Polar review instructions

Review remotely from the renewed packet. Read the full maintained files, staged diff, archive contents/hash manifest and attributed local checks. Return a report with exact Task, Author: polar, Base commit and Verdict fields. Confirm its exact bytes and SHA-256 before Codex records it using the explicit remote proxy workflow. Do not claim local execution. No implementation edits, features, branch, commit, push, deployment or production fixtures.

## Recovery

Canonical private recovery snapshot: .git/compass-cleanup-backup/2026-10-08. It includes original working/index patches, tracked hashes and the private CLI env backup (Git-excluded). Retired-copy recovery data is inside that copy's own .git/compass-cleanup-backup/2026-10-08. These are local recovery paths, not report attachments or publishable files.

## Revision after independent remote review

Addressed blocking findings: explicit remote proxy mode and strict report identity/verdict/base/path/hash validation; corrected new HANDOVER.md archive pointer; Git-index membership for fingerprints, retaining disk-byte drift detection. Added targeted regression coverage, root-only historical encoding exclusions, and explicit evidence attribution. Initial report preserved verbatim in docs/team/ALIGN-01-review-initial.txt. Its legacy proxy record was entered by Codex, not Polar; current handoff supersedes it.

Full archive bytes, package.json, CI workflow and manifest are included in the renewed packet. At this handoff, CI had not run this staged change. smoke:strict exists in package.json. CI triggers are pushes to main and pull requests targeting main; independent feature branch pushes are not triggered. Main-only triggers are intentional under the canonical checkout policy. This wording correction belongs to ALIGN-02; ALIGN-01's original approved report remains preserved in Git history.

Initial review is verbatim UTF-8 .txt evidence, retaining deliberate quotations of old mojibake without treating those quotations as maintained-source corruption. Archive proof compares all eight original snapshots with pre-cleanup working byte hashes; the ninth file is new archive README metadata. Seven originals differ from HEAD byte hashes because the captured working bytes include pre-existing encoding/line-ending differences; those differences are disclosed in ALIGN-01-archive-proof.json.

Current revision validation by Codex: 15 coordination tests pass, 0 fail/skipped; current script/test syntax pass; targeted script ESLint pass; consistency/encoding and staged snapshot checks pass. A separate fresh index export passes project-sync check; all 360 runtime source files match original working-byte hashes. Remote CI and application/runtime/production checks were not run for this tooling/documentation revision. See ALIGN-01-clean-check.txt and ALIGN-01-archive-proof.json.
