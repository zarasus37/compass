# ALIGN-03 — independent review (remote)

Task: ALIGN-03
Author: polar
Base commit: c563a8d233f904d86f797a51cecfd155cc8bc125
Verdict: approved
Changed files: none by the reviewer. Reviewed the seven changed paths in the packet: scripts/project-sync.mjs, tests/project-sync.test.mjs, docs/team/PROTOCOL.md, docs/team/HANDOFF-TEMPLATE.md, docs/team/ALIGN-03-implementation.md, docs/project-state.json, generated COORDINATION.md. The packet also carries unchanged context files (scan-encoding.mjs, ALIGN-02 handoff and review, .gitattributes, ci.yml).
Validation: Codex ran the local checks (18 tests, syntax, ESLint, consistency, encoding, staged snapshot, whitespace) and owns the PR 11 CI statements. Polar ran none of those and has no local access. Polar's sandbox corroboration, on files rebuilt from the packet and not on the real tree, is in sections 2 and 3.
Risks: non-blocking findings N1 to N3 below; remote CI for ALIGN-02 and ALIGN-03 has not run; the staged-tree hash and the contentDigest in state could not be recomputed from the packet.
Next owner: codex (record this verdict through the remote-proxy commands after confirming this file's SHA-256 and byte length; no implementation edits are required for approval)

Recommendation: approved. Both requested behaviors work as described, including the changed and missing handoff cases, and exact report hashes are unchanged.

## 1. Packet

- ALIGN-03-PACKET.txt: 135,513 bytes, SHA-256 6ea4558d181a82a1e48a30dd1562d7f8f875a38258bd758babe37397c7ebb5a9. Matches the stated value. No CR bytes.
- The packet has the staged diff for 7 files and 12 full-file sections, each with a stated byte count and SHA-256. All 12 match.
- ALIGN-03 handoff pin: docs/team/ALIGN-03-implementation.md in the packet hashes to 72c50072327f02cc32b447753d7ec869a64d973ef211f725d2f62df7c2b64122, the value stored in state.
- ALIGN-02 evidence is intact: docs/team/ALIGN-02-review.md in the packet is the confirmed file (SHA-256 7c785efe50af4a6859f3fcda31853d22501accbc6862c77bf38c4f4bd21cd4ea, 6,573 bytes), and state records it as approved, remote-proxy, recorded by codex.
- The packet's COORDINATION.md equals the output of the packet's own render() applied to its project-state.json. ALIGN-03 is the single active task, in_review, owner codex, reviewer polar.
- The diff touches no application, dependency, schema or src paths.

## 2. Evidence and attribution

| Item | Who | Result |
| --- | --- | --- |
| 18 local tests, syntax, ESLint, consistency, encoding, staged snapshot, whitespace; PR 11 full CI | Codex (local and GitHub) | Reported in the packet. Not re-observed by Polar |
| node --check on project-sync.mjs | Polar (sandbox) | OK |
| The 18 tests | Polar (sandbox, Node 20.20.2, git 2.34.1, Linux), on scripts/, tests/ and project-state.json rebuilt from the packet | 18 pass, 0 fail, 0 skipped |
| Recovery, refusal and pin probes | Polar (sandbox, fresh fixture per probe, remote-proxy mode) | see section 3 |
| Claim, ack, verdict | Nobody yet | To be recorded by Codex in remote-proxy mode after hash confirmation |

## 3. Behavior probed

Changed handoff and missing handoff, each run end to end in proxy mode:
- Approval is refused ("handoff bytes changed or missing"). State stays in_review with no review record.
- A separate changes_requested report is accepted. State shows status changes_requested, handoffIntact false, and the original pin unchanged.
- project check fails until fixed: "evidence hash changed" for the changed file, "missing evidence" for the deleted one.
- The owner can claim in that state. After the bytes are restored and a fresh handoff is made, the new pin equals the old pin, check is clean, the reviewer claims again, and approval succeeds with handoffIntact true.
- A changes_requested verdict with an intact handoff records handoffIntact true and check stays clean.

LF refusal:
- A CRLF handoff is refused with a clear message, state keeps handoff null, and the owner's claim is retained. A lone CR in the middle of a line is refused. The same file saved as LF is accepted.
- A CRLF review report is refused at review time, including in proxy mode.
- Hashing is unchanged (no normalization), so existing LF pins and both earlier report hashes still verify.

## 4. Acceptance criteria

1. Reject CRLF evidence before recording hashes: met (probed). Handoff and review reports both go through the same check.
2. A damaged handoff cannot approve, but an independent changes_requested lets the owner re-hand-off: met for both changed and missing evidence (probed).
3. Exact report hashes remain unchanged: met. No normalization was added, and the pinned values in the packet verify.
4. Pin and recovery workflow documented, regression tests pass: met. PROTOCOL.md and HANDOFF-TEMPLATE.md describe LF-only evidence, the pin, and the recovery path, and match the behavior I observed. The 18 tests pass in my sandbox.

The ALIGN-02 N3 errata for the legacy ALIGN-01 handoff is recorded in the ALIGN-03 handoff. That is sufficient.

## 5. Non-blocking findings

- N1. A fresh handoff does not require that the evidence was restored. Probe: after a changes_requested for damaged evidence, the owner can hand off again over the still-damaged bytes. That creates a new pin (different from the old one) and check goes clean. The documentation says the owner restores evidence, but the tool does not enforce it. A fresh handoff also sets review to null, so the handoffIntact false record is removed from state. Consider storing a supersedes field with the previous pin, and keeping a review history list, so the incident stays visible in state and not only in the report file and Git history. The reviewer should compare the new handoff to the damaged one.
- N2. A CRLF review report is only caught when review runs. In proxy mode the claim accepts the hash of a CRLF file first, so the writer claim is held when the refusal occurs. It is recoverable by the claim holder, but checking at proxy claim time would fail earlier.
- N3. A handoff with a leading byte order mark is refused with the unrelated message "Report task, author and exact base commit must match", because the first field no longer matches. The refusal is right, but the message is misleading. Say "BOM not allowed" or strip the check. Low priority.

## 6. Closing

No claim, ack or verdict has been recorded for Polar by this report. To record: Codex saves this file's exact bytes (LF only; any line-ending conversion changes the hash), computes its SHA-256 and byte length, sends them back for confirmation, then runs claim, ack and review with --recorded-by codex --report-sha256 <confirmed hash>. Nothing here authorizes a push, commit or deployment.
