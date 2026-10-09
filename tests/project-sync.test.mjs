import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, cpSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "compass-coordination-"));
  for (const folder of ["scripts", "docs/team", "prisma", "src/server"]) mkdirSync(join(root, folder), { recursive: true });
  cpSync(resolve("scripts/project-sync.mjs"), join(root, "scripts/project-sync.mjs"));
  const git = (...args) => {
    const r = spawnSync("git", args, { cwd: root, encoding: "utf8" });
    assert.equal(r.status, 0, r.stderr); return r.stdout.trim();
  };
  git("init", "-b", "main"); git("config", "user.name", "Coordination fixture"); git("config", "user.email", "fixture@invalid.local");
  writeFileSync(join(root, "seed.txt"), "fixture\n"); git("add", "seed.txt"); git("commit", "-m", "isolated fixture");
  const original = { schemaVersion: 1, project: "Compass", updatedOn: "2026-10-08", repository: { branch: "main", baselineCommit: "fixture" }, team: { codex: {}, minimax: {}, polar: {} }, activeTask: "ALIGN-01", tasks: [{ id: "ALIGN-01", title: "Fixture", scope: ["scripts/"], acceptance: ["Tests pass"], status: "in_progress", owner: "codex", reviewer: "polar", handoff: null, review: null }], implementation: {}, verification: [], decisions: [], deployments: { status: "not verified", note: "fixture", reference: "fixture" } };
  writeFileSync(join(root, "docs/project-state.json"), `${JSON.stringify(original, null, 2)}\n`);
  writeFileSync(join(root, "prisma/schema.prisma"), 'datasource db { provider = "postgresql" }\n');
  writeFileSync(join(root, "src/server/db.ts"), "PrismaPg\n");
  for (const f of ["AGENTS.md", "README.md", "HANDOVER.md", "HANDOVER-TEST-INTEGRITY.md", "CLAUDE.md", "docs/team/MINIMAX.md", "docs/team/POLAR.md"]) writeFileSync(join(root, f), "Read COORDINATION.md\n");
  git("add", ".");
  const run = (...args) => {
    const r = spawnSync(process.execPath, ["scripts/project-sync.mjs", ...args], { cwd: root, encoding: "utf8" });
    return { code: r.status, output: r.stdout + r.stderr };
  };
  const report = (name) => {
    const path = `docs/team/${name}.md`;
    writeFileSync(join(root, path), `Task: ALIGN-01\nAuthor: ${name === "review" ? "polar" : "codex"}\nBase commit: ${git("rev-parse", "HEAD")}\nVerdict: approved\nChanged files: fixture\nValidation: isolated tests\nRisks: none\nNext owner: polar\n`);
    return path;
  };
  return { root, run, report, git, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

test("only the assigned actor can claim, and another app cannot steal or release a claim", () => {
  const f = fixture();
  try {
    assert.equal(f.run("claim", "minimax", "ALIGN-01").code, 1);
    assert.equal(f.run("claim", "codex", "ALIGN-01").code, 0);
    assert.equal(f.run("claim", "codex", "ALIGN-01").code, 1);
    assert.equal(f.run("claim", "polar", "ALIGN-01").code, 1);
    assert.equal(f.run("release", "polar", "ALIGN-01").code, 1);
    assert.equal(f.run("generate").code, 0);
    assert.equal(f.run("check").code, 0);
    assert.equal(f.run("release", "codex", "ALIGN-01").code, 0);
    assert.equal(f.run("generate").code, 1);
  } finally { f.cleanup(); }
});

test("owner hands off to independent reviewer; approval requires evidence and closes the task", () => {
  const f = fixture();
  try {
    assert.equal(f.run("claim", "codex", "ALIGN-01").code, 0);
    assert.equal(f.run("handoff", "codex", "ALIGN-01", "missing.md").code, 1);
    assert.equal(f.run("handoff", "codex", "ALIGN-01", f.report("implementation")).code, 0);
    assert.equal(f.run("claim", "codex", "ALIGN-01").code, 1);
    assert.equal(f.run("claim", "polar", "ALIGN-01").code, 0);
    assert.equal(f.run("review", "polar", "ALIGN-01", "approved", "missing.md").code, 1);
    assert.equal(f.run("review", "polar", "ALIGN-01", "approved", f.report("review")).code, 0);
    const s = JSON.parse(readFileSync(join(f.root, "docs/project-state.json"), "utf8"));
    assert.equal(s.activeTask, null); assert.equal(s.tasks[0].status, "done");
    assert.equal(s.tasks[0].review.actor, "polar"); assert.equal(f.run("check").code, 0);
    assert.equal(f.run("claim", "codex", "ALIGN-01").code, 1);
  } finally { f.cleanup(); }
});

test("requested changes return edit ownership to the implementer and invalidate prior review", () => {
  const f = fixture();
  try {
    f.run("claim", "codex", "ALIGN-01");
    f.run("handoff", "codex", "ALIGN-01", f.report("implementation"));
    f.run("claim", "polar", "ALIGN-01");
    const review = f.report("review"); writeFileSync(join(f.root, review), readFileSync(join(f.root, review), "utf8").replace("Verdict: approved", "Verdict: changes_requested"));
    assert.equal(f.run("review", "polar", "ALIGN-01", "changes_requested", review).code, 0);
    assert.equal(f.run("claim", "polar", "ALIGN-01").code, 1);
    assert.equal(f.run("claim", "codex", "ALIGN-01").code, 0);
    assert.equal(f.run("handoff", "codex", "ALIGN-01", f.report("revision")).code, 0);
    assert.equal(JSON.parse(readFileSync(join(f.root, "docs/project-state.json"), "utf8")).tasks[0].review, null);
  } finally { f.cleanup(); }
});

test("drift, duplicate task IDs and a different branch are rejected", () => {
  const f = fixture();
  try {
    f.run("claim", "codex", "ALIGN-01"); f.run("generate");
    writeFileSync(join(f.root, "COORDINATION.md"), "stale status\n"); assert.equal(f.run("check").code, 1);
    f.run("generate");
    const p = join(f.root, "docs/project-state.json"); const s = JSON.parse(readFileSync(p, "utf8"));
    s.tasks.push(s.tasks[0]); writeFileSync(p, JSON.stringify(s)); assert.equal(f.run("check").code, 1);
    s.tasks.pop(); writeFileSync(p, JSON.stringify(s)); f.run("generate");
    f.git("checkout", "-b", "unexpected"); assert.equal(f.run("check").code, 1); assert.equal(f.run("release", "codex", "ALIGN-01").code, 1);
  } finally { f.cleanup(); }
});

test("unreported code changes fail consistency, and changed submissions cannot receive stale approval", () => {
  const f = fixture();
  try {
    f.run("claim", "codex", "ALIGN-01"); f.run("generate");
    writeFileSync(join(f.root, "src/server/new-behavior.ts"), "export const changed = true;\n");
    f.git("add", "src/server/new-behavior.ts");
    assert.equal(f.run("check").code, 1);
    assert.equal(f.run("generate").code, 0); assert.equal(f.run("check").code, 0);
    assert.equal(f.run("handoff", "codex", "ALIGN-01", f.report("implementation")).code, 0);
    assert.equal(f.run("claim", "polar", "ALIGN-01").code, 0);
    writeFileSync(join(f.root, "src/server/new-behavior.ts"), "export const changed = false;\n");
    assert.equal(f.run("review", "polar", "ALIGN-01", "approved", f.report("review")).code, 1);
    const report = f.report("review"); writeFileSync(join(f.root, report), readFileSync(join(f.root, report), "utf8").replace("Verdict: approved", "Verdict: changes_requested"));
    assert.equal(f.run("review", "polar", "ALIGN-01", "changes_requested", report).code, 0);
  } finally { f.cleanup(); }
});

test("detached PR merge is allowed for read-only Actions check, never writer commands", () => {
  const f = fixture();
  try {
    f.run("claim", "codex", "ALIGN-01"); f.run("generate"); f.run("release", "codex", "ALIGN-01");
    f.git("checkout", "--detach");
    const env = { ...process.env, GITHUB_ACTIONS: "true", GITHUB_BASE_REF: "main" };
    const check = spawnSync(process.execPath, ["scripts/project-sync.mjs", "check"], { cwd: f.root, env, encoding: "utf8" });
    assert.equal(check.status, 0, check.stderr);
    const claim = spawnSync(process.execPath, ["scripts/project-sync.mjs", "claim", "codex", "ALIGN-01"], { cwd: f.root, env, encoding: "utf8" });
    assert.equal(claim.status, 1);
  } finally { f.cleanup(); }
});

test("commit guard rejects partial staging, and hook installation preserves a prior hook path", () => {
  const f = fixture();
  try {
    f.run("claim", "codex", "ALIGN-01"); f.run("generate");
    assert.equal(f.run("check-index").code, 1);
    f.git("add", "."); assert.equal(f.run("check-index").code, 0);
    writeFileSync(join(f.root, "src/server/new-behavior.ts"), "export const changed = true;\n");
    f.run("generate"); assert.equal(f.run("check-index").code, 1);
    f.git("add", "."); f.run("generate"); f.git("add", "."); assert.equal(f.run("check-index").code, 0);
    f.git("config", "core.hooksPath", "existing-hooks"); assert.equal(f.run("install-hooks").code, 1);
    assert.equal(f.git("config", "--get", "core.hooksPath"), "existing-hooks");
    f.git("config", "--unset", "core.hooksPath"); assert.equal(f.run("install-hooks").code, 0);
    assert.equal(f.git("config", "--get", "core.hooksPath"), ".githooks");
  } finally { f.cleanup(); }
});

test("coordinator assigns the next owner and scope atomically only after independent approval", () => {
  const f = fixture();
  try {
    const path = join(f.root, "docs/project-state.json"); const s = JSON.parse(readFileSync(path, "utf8"));
    s.tasks.push({ id: "FIN-01", title: "Next task", status: "backlog", owner: null, reviewer: null, scope: [], acceptance: [], handoff: null, review: null });
    writeFileSync(path, JSON.stringify(s));
    assert.equal(f.run("assign", "codex", "FIN-01", "minimax", "polar", "src/server/state.ts", "Cents reconcile").code, 1);
    f.run("claim", "codex", "ALIGN-01"); f.run("generate");
    f.run("handoff", "codex", "ALIGN-01", f.report("implementation")); f.run("claim", "polar", "ALIGN-01");
    f.run("review", "polar", "ALIGN-01", "approved", f.report("review"));
    assert.equal(f.run("assign", "minimax", "FIN-01", "minimax", "polar", "src/server/state.ts", "Cents reconcile").code, 1);
    assert.equal(f.run("assign", "codex", "FIN-01", "minimax", "polar", "src/server/state.ts", "Cents reconcile|Tenant scoped").code, 0);
    assert.equal(f.run("check").code, 0);
    assert.equal(f.run("claim", "minimax", "FIN-01").code, 0);
    const next = JSON.parse(readFileSync(path, "utf8"));
    assert.equal(next.tasks[1].status, "in_progress"); assert.deepEqual(next.tasks[1].scope, ["src/server/state.ts"]);
    assert.deepEqual(next.tasks[1].acceptance, ["Cents reconcile", "Tenant scoped"]);
  } finally { f.cleanup(); }
});

test("database target check detects CLI/runtime drift without printing connection values", () => {
  const f = fixture();
  try {
    const first = "postgresql://fixture:PRIVATE_TEST_VALUE@localhost:5433/fixture";
    const second = "postgresql://fixture:OTHER_PRIVATE_VALUE@localhost:5432/fixture";
    writeFileSync(join(f.root, ".env"), `DATABASE_URL="${first}"\n`);
    writeFileSync(join(f.root, ".env.local"), `DATABASE_URL='${second}'\n`);
    const run = () => spawnSync(process.execPath, ["scripts/project-sync.mjs", "env-check"], { cwd: f.root, env: { ...process.env, DATABASE_URL: "" }, encoding: "utf8" });
    const mismatch = run(); assert.equal(mismatch.status, 1);
    assert.ok(!(mismatch.stdout + mismatch.stderr).includes("PRIVATE"));
    writeFileSync(join(f.root, ".env.local"), `DATABASE_URL='${first}'\n`);
    assert.equal(run().status, 0);
  } finally { f.cleanup(); }
});

test("Windows CRLF and Linux LF produce the same fingerprint, including Prisma TOML", () => {
  const f = fixture();
  try {
    const path = join(f.root, "prisma/migration_lock.toml"); writeFileSync(path, 'provider = "postgresql"\r\n');
    f.git("add", "prisma/migration_lock.toml");
    f.run("claim", "codex", "ALIGN-01"); f.run("generate");
    writeFileSync(path, 'provider = "postgresql"\n'); assert.equal(f.run("check").code, 0);
    writeFileSync(path, 'provider = "sqlite"\n'); assert.equal(f.run("check").code, 1);
  } finally { f.cleanup(); }
});

test("reviews reject owner evidence, forged fields and mismatched verdicts", () => {
  const f = fixture();
  try {
    f.run("claim", "codex", "ALIGN-01"); const implementation = f.report("implementation");
    assert.equal(f.run("handoff", "codex", "ALIGN-01", implementation).code, 0);
    f.run("claim", "polar", "ALIGN-01");
    assert.equal(f.run("review", "polar", "ALIGN-01", "approved", implementation).code, 1);
    for (const [old, replacement] of [["Author: polar", "Author: codex"], ["Task: ALIGN-01", "Task: FIN-01"], ["Verdict: approved", "Verdict: changes_requested"], [f.git("rev-parse", "HEAD"), "0".repeat(40)]]) {
      const report = f.report("review"); writeFileSync(join(f.root, report), readFileSync(join(f.root, report), "utf8").replace(old, replacement));
      assert.equal(f.run("review", "polar", "ALIGN-01", "approved", report).code, 1);
    }
    assert.equal(f.run("review", "polar", "ALIGN-01", "approved", f.report("review")).code, 0);
  } finally { f.cleanup(); }
});

test("remote proxy records attribution and rejects altered report bytes or mode", () => {
  const f = fixture();
  try {
    f.run("claim", "codex", "ALIGN-01"); f.run("handoff", "codex", "ALIGN-01", f.report("implementation"));
    const report = f.report("review"); const bytes = readFileSync(join(f.root, report));
    const hash = createHash("sha256").update(bytes).digest("hex"); const options = ["--recorded-by", "codex", "--report-sha256", hash];
    assert.equal(f.run("claim", "polar", "ALIGN-01", "--recorded-by", "minimax", "--report-sha256", hash).code, 1);
    assert.equal(f.run("claim", "polar", "ALIGN-01", ...options).code, 0);
    assert.equal(f.run("ack", "polar").code, 1);
    assert.equal(f.run("ack", "polar", ...options).code, 0);
    writeFileSync(join(f.root, report), Buffer.concat([bytes, Buffer.from("\nAltered report\n")]));
    assert.equal(f.run("review", "polar", "ALIGN-01", "approved", report, ...options).code, 1);
    writeFileSync(join(f.root, report), bytes);
    assert.equal(f.run("review", "polar", "ALIGN-01", "approved", report).code, 1);
    assert.equal(f.run("review", "polar", "ALIGN-01", "approved", report, ...options).code, 0);
    const s = JSON.parse(readFileSync(join(f.root, "docs/project-state.json"), "utf8"));
    assert.equal(s.tasks[0].review.recordedBy, "codex"); assert.equal(s.tasks[0].review.mode, "remote-proxy"); assert.equal(s.tasks[0].review.sha256, hash);
    assert.match(s.team.polar.status, /no local acknowledgement/);
    assert.match(readFileSync(join(f.root, "COORDINATION.md"), "utf8"), /remote; recorded by codex/);
    assert.equal(f.run("check").code, 0);
  } finally { f.cleanup(); }
});

test("Git membership excludes ignored scratch, includes newly staged files and catches tracked drift", () => {
  const f = fixture();
  try {
    writeFileSync(join(f.root, ".gitignore"), "scripts/ignored.key\n"); f.git("add", ".gitignore");
    f.run("claim", "codex", "ALIGN-01"); f.run("generate");
    writeFileSync(join(f.root, "scripts/ignored.key"), "local-only fixture\n");
    assert.equal(f.run("check").code, 0); f.git("add", "."); assert.equal(f.run("check-index").code, 0);
    writeFileSync(join(f.root, "scripts/new.mjs"), "export const fixture = true;\n");
    assert.equal(f.run("check-index").code, 1);
    f.git("add", "scripts/new.mjs"); assert.equal(f.run("check").code, 1);
    f.run("generate"); f.git("add", "."); assert.equal(f.run("check-index").code, 0);
    writeFileSync(join(f.root, "scripts/new.mjs"), "export const fixture = false;\n"); assert.equal(f.run("check").code, 1);
  } finally { f.cleanup(); }
});

test("broken pointer links and malformed scope fail with clear diagnostics", () => {
  const f = fixture();
  try {
    f.run("claim", "codex", "ALIGN-01");
    writeFileSync(join(f.root, "HANDOVER.md"), "Read COORDINATION.md [missing](docs/archive/missing.md)\n"); f.run("generate");
    assert.match(f.run("check").output, /broken link/);
    writeFileSync(join(f.root, "HANDOVER.md"), "Read COORDINATION.md\n");
    const path = join(f.root, "docs/project-state.json"); const s = JSON.parse(readFileSync(path, "utf8")); delete s.tasks[0].scope; writeFileSync(path, JSON.stringify(s)); f.run("generate");
    assert.match(f.run("check").output, /lacks assignment, scope or acceptance/);
  } finally { f.cleanup(); }
});

test("encoding scanner examines nested design and patch folders while preserving root history", () => {
  const root = mkdtempSync(join(tmpdir(), "compass-encoding-"));
  try {
    const corrupt = String.fromCharCode(0xc3, 0xa9);
    for (const p of ["design", "patch", "docs/archive", "src/ui/design", "src/ui/patch"]) mkdirSync(join(root, p), { recursive: true });
    for (const p of ["design", "patch", "docs/archive"]) writeFileSync(join(root, p, "old.md"), corrupt);
    const run = () => spawnSync(process.execPath, [resolve("scripts/scan-encoding.mjs"), root], { encoding: "utf8" });
    assert.equal(run().status, 0);
    for (const p of ["src/ui/design", "src/ui/patch"]) writeFileSync(join(root, p, "new.ts"), corrupt);
    const result = run(); assert.equal(result.status, 1); assert.match(result.stdout, /src\/ui\/design/); assert.match(result.stdout, /src\/ui\/patch/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test("handoff bytes are pinned and tampering fails before and after approval", () => {
  const f = fixture();
  try {
    f.run("claim", "codex", "ALIGN-01"); const report = f.report("implementation"); const original = readFileSync(join(f.root, report));
    assert.equal(f.run("handoff", "codex", "ALIGN-01", report).code, 0);
    const s = JSON.parse(readFileSync(join(f.root, "docs/project-state.json"), "utf8"));
    assert.equal(s.tasks[0].handoff.sha256, createHash("sha256").update(original).digest("hex"));
    f.run("claim", "polar", "ALIGN-01");
    writeFileSync(join(f.root, report), Buffer.concat([original, Buffer.from("\nAltered evidence\n")]));
    assert.equal(f.run("check").code, 1);
    assert.equal(f.run("review", "polar", "ALIGN-01", "approved", f.report("review")).code, 1);
    writeFileSync(join(f.root, report), original);
    assert.equal(f.run("review", "polar", "ALIGN-01", "approved", f.report("review")).code, 0);
    writeFileSync(join(f.root, report), Buffer.concat([original, Buffer.from("\nAltered after approval\n")]));
    assert.match(f.run("check").output, /evidence hash changed/);
  } finally { f.cleanup(); }
});
