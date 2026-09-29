/**
 * Full non-short-circuit smoke triage.
 * Runs every test in the chain individually so one failure does not
 * hide the rest, and prints a single summary table.
 */
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));

// Extract the file list from the smoke chain, preserving order, deduping.
function entriesFrom(script) {
  return (script.match(/tests\/[\w.-]+\.mjs/g) ?? []);
}

const smokeFiles = [...new Set(entriesFrom(pkg.scripts.smoke))];
const uiFiles = [...new Set(entriesFrom(pkg.scripts["smoke:ui"]))];
const integFiles = [...new Set(entriesFrom(pkg.scripts["smoke:integration"] ?? ""))];
const deployFiles = [...new Set(entriesFrom(pkg.scripts["smoke:deploy"] ?? ""))];

const needsTsx = new Set([
  "tests/smoke-onboarding-stuck-detector.mjs",
  "tests/smoke-extract-fix.mjs",
]);

const groups = [
  ["smoke", smokeFiles],
  ["smoke:ui", uiFiles],
  ["smoke:integration", integFiles],
  ["smoke:deploy", deployFiles],
];

const results = [];
for (const [group, files] of groups) {
  for (const f of files) {
    const args = needsTsx.has(f)
      ? ["--conditions=react-server", f]
      : [f];
    const code = await new Promise((resolve) => {
      const c = spawn(process.execPath, args, {
        stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env, SMOKE_REQUIRE_SERVER: "1" },
      });
      let out = "";
      c.stdout.on("data", (d) => (out += d));
      c.stderr.on("data", (d) => (out += d));
      const t = setTimeout(() => {
        c.kill("SIGKILL");
      }, 180_000);
      c.on("close", (rc) => {
        clearTimeout(t);
        resolve({ code: rc ?? 1, out });
      });
      c.on("error", () => {
        clearTimeout(t);
        resolve({ code: 1, out });
      });
    });
    const m = code.out.match(/checks:\s*(\d+)\s*pass\s*\/\s*(\d+)\s*miss/) ||
              code.out.match(/(\d+)\s+pass\s*\/\s*(\d+)\s+miss/);
    const skip = (code.out.match(/SKIP-NO-SERVER/g) ?? []).length;
    const fail = code.out.match(/✗ (.+)/) || code.out.match(/^  - (.+)$/m);
    results.push({
      group,
      file: f.replace("tests/", ""),
      code: code.code,
      pass: m ? Number(m[1]) : null,
      miss: m ? Number(m[2]) : null,
      skip,
      firstFail: fail ? fail[1].trim().slice(0, 110) : null,
    });
    const r = results[results.length - 1];
    console.log(
      `${r.code === 0 ? "OK  " : "FAIL"} ${r.file.padEnd(46)} ` +
        `${r.pass ?? "?"}/${r.miss ?? "?"} skip=${r.skip}` +
        (r.firstFail ? `  <- ${r.firstFail}` : ""),
    );
  }
}

console.log("\n" + "=".repeat(80));
const bad = results.filter((r) => r.code !== 0);
const totalPass = results.reduce((a, r) => a + (r.pass ?? 0), 0);
const totalMiss = results.reduce((a, r) => a + (r.miss ?? 0), 0);
const totalSkip = results.reduce((a, r) => a + r.skip, 0);
console.log(`files: ${results.length}  failing files: ${bad.length}`);
console.log(`checks: ${totalPass} pass / ${totalMiss} miss  (${totalSkip} skipped assertions)`);
console.log("=".repeat(80));
for (const b of bad) {
  console.log(`FAIL ${b.file}  exit=${b.code}  ${b.pass ?? "?"}/${b.miss ?? "?"}  ${b.firstFail ?? ""}`);
}
process.exit(0);
