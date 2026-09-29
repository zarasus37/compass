/**
 * Rebuild the smoke chain entries in package.json so every test that
 * imports tests/fixture.mjs runs under `tsx --conditions=react-server`.
 *
 * The fixture imports src/lib/*.ts and Next's `server-only` marker, so a
 * plain `node` invocation of a migrated test dies at module load with a
 * module-type error. Keeping this transformation in a script (rather
 * than hand-editing a 5KB string) means a newly migrated test cannot be
 * silently left behind on `node`.
 *
 * Run: node scripts/fix-smoke-runners.mjs
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const pkgPath = "package.json";
const raw = readFileSync(pkgPath, "utf8");

// Which tests need the tsx runner?
//
// Two independent reasons, and missing either one leaves a test broken:
//
//  1. It imports tests/fixture.mjs, which imports src/lib/*.ts and
//     Next's `server-only` marker.
//  2. It imports anything from ../src/ directly. This was the gap that
//     let smoke-onboarding-stuck-detector and smoke-extract-fix sit on
//     bare `node` in the chain: they import src/lib/onboarding/agent.ts,
//     which does a directory import (`../llm`) that Node's ESM resolver
//     rejects outright with ERR_UNSUPPORTED_DIR_IMPORT. The entry died
//     at module load, and because the chain is &&-joined, every entry
//     after it was dead too.
//
// tsx resolves both TypeScript and directory imports, so a test that
// matches either rule is safe to run under it.
const needsTsx = new Set();
for (const name of readdirSync("tests")) {
  if (!name.endsWith(".mjs")) continue;
  const src = readFileSync(join("tests", name), "utf8");
  const importsFixture = /from "\.\/fixture\.mjs"/.test(src);
  const importsSrc = /from "\.\.\/src\//.test(src);
  if (importsFixture || importsSrc) needsTsx.add(name);
}

let changed = 0;
let tsxCount = 0;
let nodeCount = 0;

const out = raw.replace(
  /("(?:smoke|smoke:ui|smoke:integration|smoke:deploy)": ")([^"]+)(")/g,
  (_m, head, chain, tail) => {
    // Split on && but keep the delimiter so we can rejoin exactly.
    const parts = chain.split(" && ");
    const rebuilt = parts.map((p) => {
      const t = p.trim();
      const m = t.match(/tests\/([\w\-.]+\.mjs)/);
      if (!m) return t;
      const file = m[1];
      if (needsTsx.has(file)) {
        tsxCount += 1;
        // Drop any existing runner prefix, then force the tsx form.
        const bare = t.replace(/^(node|tsx)\s+(--conditions=react-server\s+)?/, "");
        return `tsx --conditions=react-server ${bare}`;
      }
      nodeCount += 1;
      const bare = t.replace(/^(node|tsx)\s+(--conditions=react-server\s+)?/, "");
      return `node ${bare}`;
    });
    const next = rebuilt.join(" && ");
    if (next !== chain) changed += 1;
    return head + next + tail;
  },
);

if (out !== raw) {
  writeFileSync(pkgPath, out, "utf8");
  console.log(
    `package.json updated: ${changed} script(s) rewritten; ` +
      `${tsxCount} entries via tsx, ${nodeCount} via node.`,
  );
} else {
  console.log("package.json already correct — no change.");
}
console.log(`tests needing tsx (fixture import or ../src/ import): ${needsTsx.size}`);
