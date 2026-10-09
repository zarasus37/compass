# ALIGN-01 — independent re-review (remote)

Task: ALIGN-01
Author: polar
Base commit: 36cf4ec5420549132d0349f2f8ce3771aba7bb14
Verdict: approved
Changed files: none by the reviewer. Reviewed the 46 staged paths in the revised packet (staged tree b39b0018c6f610e8b2814c306aa4ec806a3bb5d1), including the 8 archive snapshots plus the new archive README.
Validation: Codex ran the local checks (15/15 project:test, syntax, ESLint, check, check-index, clean-index export, 360 runtime hashes). Polar ran NONE of those and has no local access. Polar's own sandbox corroboration is listed in section 2 and ran on files rebuilt from the packet, not on the real tree.
Risks: remote CI, application runtime and production were not run by anyone; non-blocking findings N1 to N4 below; all Codex-side local results are taken from the packet, not re-observed.
Next owner: codex (record this verdict through the remote-proxy commands after confirming the report SHA-256; no implementation edits are required for approval)

Recommendation: approved. All three blocking findings from the first review are fixed and independently probed.

## 1. Packet confirmation

- POLAR-REVIEW-REVISED.txt: 2,443,379 bytes, SHA-256 3a8cb8d8843b9d3704aafa9a36630b6e5988e0ff27cf4d282bac0fe160a70c69. Matches the value you stated.
- All 46 "FULL FILE" sections match their own stated SHA-256 (46 of 46, none failed).
- The staged diff has 46 file entries. For the 29 new text files that appear as full additions, the added lines equal the full-file section exactly (0 mismatches). The remaining 17 are modified files, binary archive entries, or have no hunk; I did not line-match those.
- Header facts agree with state: HEAD 36cf4ec5420549132d0349f2f8ce3771aba7bb14, no unstaged tracked edits. I cannot confirm the staged-tree hash itself.

## 2. Evidence and attribution

| Item | Who | Result |
| --- | --- | --- |
| status, check, check-index, ESLint, git diff --check, clean-index export, 360/360 runtime hashes, 15/15 tests | Codex (local) | Reported in the packet. Not re-observed by Polar |
| scripts/project-sync.mjs syntax | Polar (sandbox) | node --check OK |
| tests/project-sync.test.mjs, 15 tests | Polar (sandbox, Node 20.20.2, git 2.34.1, Linux) on a reconstruction of scripts/ and tests/ plus project-state.json from the packet | 15 pass, 0 fail, 0 skipped. Test 15 needs scripts/scan-encoding.mjs beside the script; it passes once that packet file is present |
| Archive base64 vs manifest vs archive text | Polar (sandbox) | 8 of 8 decoded originals equal the manifest archiveSha256 and the staged archive file bytes |
| Probes of the proxy workflow | Polar (sandbox) | see section 3 |
| Claim, ack, verdict | Nobody yet | To be recorded by Codex in remote-proxy mode after the hash is confirmed |

## 3. First-review blockers

1. Remote reviewer / proxy mode: FIXED. Probes on the reconstruction (fixture state copied from the packet, so polar has accessMode remote):
   - claim polar with no proxy flags: refused ("Remote reviewer requires explicit proxy recording options").
   - proxy claim and ack with --recorded-by codex --report-sha256 <hash>: accepted.
   - review citing the implementation handoff as the report: refused (task, author, base commit must match).
   - Author line carrying extra text, e.g. "polar (remote)": refused. The Author line must be exactly "polar".
   - wrong hash: refused. Verdict argument not equal to the report's Verdict line: refused.
   - correct report: accepted; state stores mode remote-proxy, recordedBy codex, sha256, and COORDINATION.md renders "recorded by codex" with the hash.
   - editing the review report after approval makes project check fail (evidence hash changed).
   Remaining limit, already disclosed in DR-ALIGN-06: actor strings and accessMode are cooperative, and the hash binds bytes, not authorship. Authenticity rests on the out-of-band hash confirmation below.
2. HANDOVER.md link: FIXED. HANDOVER.md now says HEAD had no HANDOVER.md and points to docs/archive/README.md (present). validate() now checks relative .md links in the entrypoint and docs/team files; test 14 covers a broken link.
3. Fingerprint membership: FIXED in code. The digest now enumerates git ls-files --cached, filters to governed paths, and reads bytes from disk, so ignored scratch cannot change it. Test 13 covers ignored files, newly staged files and tracked drift. I could not reproduce a clean-clone CI run; Codex's clean-index export (local) is the evidence, and remote CI has not run.

Also addressed: scan-encoding skips docs/archive, _archive, design and patch only at the repo root (test 15); acquireClaim removes a partial lock on failure; clear diagnostics for malformed scope; README now has "Security and health checks" and "Script reference and smoke limitations"; smoke:strict exists in package.json (line 24).

## 4. Acceptance criteria

1. One current state, no competing handoffs: met (generated COORDINATION.md; pointer files; link check).
2. Preserve history, edits and assets: met for what is checkable. 8/8 archive originals match the pre-cleanup manifest; 7 of 8 differ from HEAD bytes, which Codex discloses (pre-existing working-tree differences). I cannot see what those differences are, but HEAD retains the committed versions in Git history. No src paths appear in the staged diff.
3. Single-writer owner/reviewer workflow: met, including remote proxy recording.
4. Automated consistency and encoding gates: met locally per Codex and corroborated by my test run; remote CI not run.
5. Evidence and live limits recorded: met. Statements are appropriately scoped; no live, CI or payment claims.

## 5. Non-blocking findings

- N1. Implementation handoff is not hash-pinned. validate() supports evidence.sha256, but handoff records carry none, and docs/team files other than the six contract files are outside the fingerprint. Probe: editing the handoff report after approval still passes project check. Store sha256 at handoff and verify it. This is a code change, so do it as a follow-up with its own handoff rather than as an edit to ALIGN-01.
- N2. Handoff text says CI triggers are "main/master pushes and PRs", but ci.yml is now branches [main] only, and the diff shows master was removed. Correct the sentence, and confirm that dropping master (and PRs to other base branches) is intended.
- N3. First CI run will happen on a push to main, and the protocol notes a push to main may deploy both Vercel projects. Deployment is separate from this check, but run the two new CI steps on a pull request first if you can.
- N4. The link check covers only .md links in a fixed set of files; it will not catch other broken pointers.

## 6. Closing

No claim, ack or verdict has been recorded for Polar by this report. To record: Codex saves this file's exact bytes, computes SHA-256, sends it back for confirmation, then runs claim, ack and review with --recorded-by codex --report-sha256 <confirmed hash>. The file is LF-only; convert nothing, since a line-ending change alters the hash.
