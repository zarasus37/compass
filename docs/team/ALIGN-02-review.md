# ALIGN-02 — independent review (remote)

Task: ALIGN-02
Author: polar
Base commit: 08703d8216a9ba29b7d0e04d3c956a53768c8793
Verdict: approved
Changed files: none by the reviewer. Reviewed the six changed paths in the packet: scripts/project-sync.mjs, tests/project-sync.test.mjs, docs/team/ALIGN-01-implementation.md (CI sentence only), docs/team/ALIGN-02-implementation.md, docs/project-state.json, generated COORDINATION.md. The packet also carries unchanged context files (scan-encoding.mjs, PROTOCOL.md, HANDOFF-TEMPLATE.md, ci.yml).
Validation: Codex ran the local checks (16 tests, syntax, ESLint, consistency, encoding, staged whitespace) and owns the PR 11 CI statements. Polar ran none of those and has no local access. Polar's own sandbox corroboration, on files rebuilt from the packet and not on the real tree, is in section 2.
Risks: non-blocking findings N1 to N4 below; PR 11 full runtime CI was still pending and remote CI for this follow-up has not run; the staged-tree hash and the contentDigest in state could not be recomputed from the packet.
Next owner: codex (record this verdict through the remote-proxy commands after confirming this file's SHA-256; no implementation edits are required for approval)

Recommendation: approved. The scope is met, I could not break the pin, and no application code changed.

## 1. Packet

- ALIGN-02-PACKET.txt: 123,337 bytes, SHA-256 20b5297de957ecfe2a2f35616ec1517cf97df23abfa490e4be7de6f0ebf4509f. Matches the stated value.
- Contains the complete diff (6 files) and 10 full-file sections. The packet has no CR bytes.
- The handoff pin checks out: docs/team/ALIGN-02-implementation.md in the packet hashes to 993d82201d67e43e2204175cc171be71eb28866c7739d800fa8e4daa7d3b85ea, the value stored in state (after removing the one newline the packet adds between sections).
- The packet's COORDINATION.md equals the output of the packet's own render() applied to the packet's project-state.json (again ignoring the section-delimiter newline). ALIGN-02 is the single active task, in_review, owner codex, reviewer polar.
- The diff touches no application, dependency, schema or src paths.

## 2. Evidence and attribution

| Item | Who | Result |
| --- | --- | --- |
| 16 local tests, syntax, ESLint, consistency, encoding, staged whitespace, PR 11 coordination CI and previews | Codex (local and GitHub) | Reported in the handoff. Not re-observed by Polar |
| node --check on project-sync.mjs | Polar (sandbox) | OK |
| The 16 tests | Polar (sandbox, Node 20.20.2, git 2.34.1, Linux), on scripts/, tests/ and project-state.json rebuilt from the packet | 16 pass, 0 fail, 0 skipped |
| Hash-pin probes | Polar (sandbox) | see section 3 |
| Claim, ack, verdict | Nobody yet | To be recorded by Codex in remote-proxy mode after hash confirmation |

## 3. Behavior probed

The code change is small. handoff now computes SHA-256 of the exact report bytes and stores it as handoff.sha256. review recomputes it and refuses to record any verdict if it differs. validate(), already present from ALIGN-01, verifies any stored evidence hash, so project check also fails.

Probes on a fresh fixture each:
- Handoff edited after handoff: project check fails ("evidence hash changed"). Reviewer cannot record approval. The new test also covers restore-then-approve and edit-after-approval, and passes.
- Edit restored byte-for-byte: review and approval succeed.
- Intact handoff with a changes_requested verdict through the proxy: accepted.
- A handoff with no stored hash (legacy, simulated by deleting the field) edited afterwards: project check still passes. This is the stated backward-compatibility and is why ALIGN-01's handoff is not covered.
- A CRLF re-save of the same text: project check fails (see N2).

CI wording: the only stale "main/master" text in the packet was the ALIGN-01 handoff sentence. It is replaced with "pushes to main and pull requests targeting main ... intentional". ci.yml in the packet is main-only, so the wording now matches. No other "master" string remains in the packet's files.

## 4. Acceptance criteria

1. New handoffs store SHA-256 of exact report bytes: met (probed).
2. Changing a handoff before or after approval fails check: met for hash-pinned handoffs (probed). Not for legacy unpinned ones, as stated.
3. CI wording describes main-only triggers: met.
4. Coordination regression tests and consistency pass: met per Codex; the 16 tests also pass in my sandbox.

## 5. Non-blocking findings

- N1. A tampered handoff leaves no exit except restoring the exact bytes. Probe: after editing, the reviewer can claim but review fails for every verdict, the owner cannot claim (task expects polar), and release is limited to the claim holder. If the original bytes are lost, only a hand edit of state would unblock it. Consider letting the reviewer record changes_requested when the handoff hash differs, so the owner can re-hand-off, or document "restore from Git" in PROTOCOL.md.
- N2. The pin hashes raw bytes with no line-ending normalization, unlike the content fingerprint, which normalizes CRLF. Under .gitattributes eol=lf, a handoff written with CRLF on Windows would be hashed as CRLF locally, but committed and checked out in CI as LF, so CI project check would fail with "evidence hash changed". This packet's handoff is LF and matches its pin, so this change is not affected. Fix before FIN-01: hash after CRLF to LF normalization for text evidence (LF files give identical hashes, so existing pins, including the ALIGN-01 review hash, are unchanged), or have the tool refuse CRLF evidence at handoff time.
- N3. ALIGN-01-implementation.md, the handoff of a task already approved, was edited, and as an unpinned legacy handoff the edit is invisible to the checks. The edit is disclosed and limited to the CI sentence, but it changes the file I reviewed under ALIGN-01. An errata note in the ALIGN-02 handoff would have preserved that file's bytes. Accepting as disclosed.
- N4. PROTOCOL.md and HANDOFF-TEMPLATE.md are unchanged and do not mention that handoffs are now hash-pinned or that editing one after handoff blocks review. Add two sentences when N1 or N2 is handled.

## 6. Closing

No claim, ack or verdict has been recorded for Polar by this report. To record: Codex saves this file's exact bytes (LF only; any line-ending conversion changes the hash), computes its SHA-256 and byte length, sends them back for confirmation, then runs claim, ack and review with --recorded-by codex --report-sha256 <confirmed hash>. Nothing here authorizes a push, commit or deployment.
