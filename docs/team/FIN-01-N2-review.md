Task: FIN-01-N2
Author: polar
Base commit: 0d8c5ef38840ffc3267e8e8911804fdab0f78284
Verdict: approved
Changed files: src/app/page.tsx; src/components/dashboard/OpportunitiesToGrow.tsx; src/components/dashboard/cards/safe-to-spend-hero.tsx; tests/dashboard-opportunities.test.mjs; package.json (test:dashboard script, project:test chain); docs/project-state.json; COORDINATION.md (generated); docs/team/FIN-01-N2-implementation.md. Staged tree 95f55c76448c5472f79a5ae77b049da105e09d55.
Validation: Polar sandbox only: packet and per-section hash checks, staged diff read in full, consumer search, test and log reading, handoff pin, COORDINATION render. Polar ran no local Compass command and did not execute the dashboard test (the sandbox has no react-dom, tsx or project dependencies). All test, type, lint, build and baseline-probe runs are Codex's.
Risks: Failure cause is not logged (fixed message only); the test relies on esbuild being reachable through tsx; the your-numbers page still has no local catch; no full database smoke, CI run, browser check or production check exists for this delta yet.
Next owner: codex

# FIN-01-N2 review (Polar, independent remote)

## 1. Packet
- POLAR-REVIEW-FIN-01-N2.txt: 372,839 bytes, SHA-256 c8873522f37cbf78b6dab1b8bf364ea4ca8a5c21a5cd0390e4cca38d6641b6e0. Matches the stated values.
- 31 sections extracted as bytes; every byte count and SHA-256 matched. Source and docs sections have no CR; only the Windows evidence logs do.
- Handoff docs/team/FIN-01-N2-implementation.md (4,817 bytes) hashes to 7e0a3654...9a67b, which is the pin in docs/project-state.json (status in_review, owner codex, reviewer polar, head = base, review null).
- COORDINATION.md equals render(project-state.json) byte for byte.
- src/lib/state/financial-state.ts is byte-identical to the approved FIN-01 file (e485a764...8028c).
- src/lib/opportunities.ts in this packet (LF index bytes, 24f279e1...c453) is identical to the approved FIN-01 file (435e52f8...8e46) once that file's CRLF working-tree line endings are converted to LF. I checked this by hash after conversion, so the engine is unchanged apart from line endings.

## 2. Evidence attribution
| Evidence | Who |
| --- | --- |
| Dashboard test 4/4, project:test (coordination 18/18 plus dashboard), tsc, lint (0 errors, 459 baseline warnings), build, env-check, baseline probe | Codex, logs read by Polar, not re-run |
| Packet and section hashes, diff read, consumer search, pin and render checks | Polar sandbox |
| Authorship of the whole delta | Codex (no MiniMax work) |

## 3. What the change does
- src/app/page.tsx: topOpportunities(user.id, {limit: 3}) now has a .catch that logs the fixed string "[dashboard] Recommendations unavailable" and returns null. Tenant id and limit are unchanged. Authentication and the required reads stay outside the catch and still reject. topOpportunities is async, so a synchronous throw cannot bypass the .catch.
- OpportunitiesToGrow.tsx: opportunities is now Opportunity[] | null. null renders a section with role="status" and a fixed retry message. An empty array still takes the old empty path, so unavailable and empty remain distinct.
- safe-to-spend-hero.tsx: type only, opportunities: Opportunity[] | null.
- package.json: adds test:dashboard and chains it into project:test, which CI already runs.

## 4. Review findings
- No other consumer is left unguarded. The only readers of the value are page.tsx line 929 (passes it through), the hero (passes it through), and OpportunitiesToGrow, where the null return comes before opportunities.length and opportunities.map. Codex's tsc exit 0 agrees with this.
- The error object is neither rendered nor logged, and the test requires the injected "Prisma secret-host secret-user" strings to be absent from the HTML and the log.
- The failure test checks the right things: the dashboard heading, the hero, the $1,000 safe-to-spend value, role="status", the exact message, no PLAN TIGHT text (so a failure is not shown as an empty plan), the exact single log line, and the exact call arguments (tenant-n2, limit 3).
- The test is not vacuous. The baseline probe log shows the same test run against the original page: exactly one failure, with the raw "Prisma secret-host secret-user" error propagating, while the other three tests pass. That is the evidence I would want, and it is Codex's run.
- The controls cover a healthy empty result (PLAN TIGHT retained), a healthy populated result (title, detail, 123.45, link retained), and propagation of both an authentication error and a required-read error without calling topOpportunities. This supports the scope claim that only the optional section is isolated.
- The test runs the real async Dashboard, carousel, hero and recommendations component. It mocks authentication, data and unrelated widgets. It proves the page handles a rejected recommendations call; it does not prove the real engine's failure path. That is consistent with the handoff's stated boundary.

## 5. Non-blocking findings
- N1. The catch records no cause. With the fixed string alone an operator cannot tell a database outage from a bug in the recommendation engine. A stable code (for example the Prisma P-code or "unknown", as FIN-01 already does) would keep the diagnostic without leaking anything. Optional follow-up.
- N2. The test gets esbuild through createRequire(require.resolve("tsx"))("esbuild"). That depends on tsx's transitive layout, and esbuild is not a direct dependency. It passed locally on Windows. The PR CI run on Linux will be the first test of it, because project:test runs in CI.
- N3. src/app/(app)/learn/your-numbers/page.tsx still awaits topOpportunities with no local catch. It is covered by (app)/error.tsx and is out of this task's scope as stated. Worth a one-line follow-up.
- N4. The retry text says "Refresh the page". That is accurate for a server-rendered page. A retry control would be a design change, not a defect.
- N5. The task adds a manually inserted task entry because the CLI cannot create a task ID. It follows the normal lock and handoff format and passes the render and pin checks I ran.
- N6. FIN-01's M5 integration-test mystery and the other FIN-01 follow-ups are unchanged and not part of this review.

## 6. Acceptance summary
| Criterion | Result |
| --- | --- |
| A rejected recommendations read does not reject the healthy root dashboard | Met (test plus baseline probe, Codex-run) |
| Unavailable shows a fixed retry message, distinct from healthy empty | Met |
| Healthy content and tenant/limit arguments preserved | Met |
| Failure test runs the real dashboard and UI; type, lint, build, coordination pass | Met on Codex's evidence; PR CI is the independent confirmation |
| Scope: no DAL, engine, schema, writer or other page changes | Confirmed from the diff and file hashes |

## 7. Closing
Recommendation: approved for staged tree 95f55c76448c5472f79a5ae77b049da105e09d55 at base 0d8c5ef38840ffc3267e8e8911804fdab0f78284. Any edit after approval invalidates it. No full database smoke, remote CI run, authenticated browser check or production check exists for this delta, and none is claimed. CI on the exact approved tree is the remaining gate.

No claim, ack or verdict recorded by Polar. Recording is Codex's, in remote-proxy mode, after the exact bytes and SHA-256 are confirmed. Nothing here authorizes a commit, push or deployment.
