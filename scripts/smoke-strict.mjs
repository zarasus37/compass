/**
 * smoke-strict — run the full smoke chain with skipped assertions
 * treated as failures.
 *
 * Why a runner instead of `SMOKE_REQUIRE_SERVER=1 pnpm smoke`:
 * that env-var form works in bash (CI) but not in PowerShell/cmd, so
 * a local dev on Windows would silently get the tolerant behaviour —
 * the exact failure mode this whole change exists to remove.
 *
 * This runner also deliberately does NOT short-circuit. The package.json
 * chain is joined with `&&`, so the first failing file hides every file
 * after it. That is how a single `/accounts` 500 masked 22 dead entries
 * for weeks. Here every stage runs and the summary is printed at the end.
 *
 * Exit codes:
 *   0  everything ran and passed
 *   1  at least one stage failed
 *   2  a stage failed OR skipped under strict mode
 */
import { spawn } from "node:child_process";

const STAGES = [
  ["smoke", "run-smoke"],
  ["smoke:ui", "run-smoke-ui"],
  ["smoke:integration", "run-smoke-integration"],
  ["smoke:deploy", "run-smoke-deploy"],
];

const npm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

function run(script) {
  return new Promise((resolve) => {
    const child = spawn(npm, ["run", script], {
      stdio: "inherit",
      shell: process.platform === "win32",
      env: { ...process.env, SMOKE_REQUIRE_SERVER: "1" },
    });
    child.on("close", (code) => resolve(code ?? 1));
    child.on("error", () => resolve(1));
  });
}

const results = [];
for (const [script, label] of STAGES) {
  console.log(`\n${"=".repeat(60)}\n>> ${script}\n${"=".repeat(60)}`);
  const code = await run(script);
  results.push({ script, code });
}

console.log(`\n${"=".repeat(60)}\nSTRICT SMOKE SUMMARY\n${"=".repeat(60)}`);
let failed = 0;
let skippedStages = 0;
for (const r of results) {
  const tag = r.code === 0 ? "PASS" : r.code === 2 ? "SKIP-FATAL" : "FAIL";
  if (r.code === 2) skippedStages += 1;
  else if (r.code !== 0) failed += 1;
  console.log(`  ${tag.padEnd(11)} ${r.script} (exit ${r.code})`);
}
console.log(
  `\n${failed} failed, ${skippedStages} stage(s) exited 2 (skipped assertions).`,
);
console.log(
  failed || skippedStages
    ? "Strict run did NOT pass. Start a server (pnpm dev, or pnpm build && pnpm start) and re-run."
    : "Strict run passed with no skipped assertions.",
);

process.exit(failed || skippedStages ? 2 : 0);
