#!/usr/bin/env node
/**
 * scan-encoding.mjs — detect PowerShell double-encoding in source files.
 *
 * THE PROBLEM
 * -----------
 * On Windows, `Set-Content` / `Out-File` under PowerShell 5.1 write in
 * the ANSI codepage unless you pass `-Encoding UTF8`. When the file
 * being rewritten already contained UTF-8, every non-ASCII character
 * survives as mojibake: an em-dash (U+2014, three UTF-8 bytes) comes
 * back as three codepoints that render as a-circumflex + euro +
 * right-double-quote.
 *
 * This has silently broken this repo four times, including in live JSX
 * where every dash on the Goals and Envelopes pages rendered as three
 * visible garbage characters.
 *
 * WHY THE OBVIOUS CHECK DOES NOT WORK
 * ----------------------------------
 * A double-encoded file is PERFECTLY VALID UTF-8. The bytes were
 * re-encoded, not corrupted, so this passes:
 *
 *     new TextDecoder("utf-8", { fatal: true }).decode(buf)
 *
 * That check is necessary but not sufficient. The structural tell is a
 * run where an accented Latin-1 letter — the cp1252 mis-decode of a
 * UTF-8 lead byte — is immediately followed by a cp1252 punctuation
 * codepoint, which is the mis-decode of a continuation byte. A
 * correctly authored em-dash is ONE codepoint, normally preceded by
 * ASCII, so it does not match.
 *
 * FALSE POSITIVES
 * ---------------
 * A deliberate quotation of corrupted text will match, and so will this
 * file if it ever embeds an example. That is correct behaviour, not
 * noise: this repo's HANDOVERs quote the mangled `payeeKey` character
 * class and the mojibake table above, and the scanner reporting them is
 * the point. Confirm any hit is a real corruption before "fixing" it,
 * and never let a guard file quote the thing it detects.
 *
 * Usage:
 *   node scripts/scan-encoding.mjs [rootDir]     # default: "."
 * Exit: 0 clean, 1 if any file has double-encoded runs.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.argv[2] ?? ".";
const SKIP = new Set([
  "node_modules", ".git", ".next", "turbopack", "dist", "coverage",
  ".tmp.driveupload", ".codex-screen", "videos",
]);
const EXT = /\.(ts|tsx|mjs|js|jsx|md|prisma|json|css|sql|yml|yaml)$/;

// lead: cp1252 rendering of a UTF-8 lead byte (a-circumflex, A-tilde...)
// follower: cp1252 rendering of a continuation byte (euro, curly quotes,
// dashes, bullet, C1 controls)
const MOJIBAKE = new RegExp(
  "[\\u00C2-\\u00F4][\\u0080-\\u00BF\\u20AC\\u201A-\\u201E\\u2022\\u2026" +
    "\\u2030\\u2039\\u203A\\u2122\\u0152\\u0153\\u017D\\u017E\\u0178]",
  "g"
);

const hits = [];

function walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (SKIP.has(e.name)) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      walk(p);
      continue;
    }
    if (!EXT.test(e.name)) continue;
    let text;
    try {
      if (statSync(p).size > 4000000) continue;
      text = readFileSync(p, "utf8");
    } catch {
      continue;
    }
    const m = text.match(MOJIBAKE);
    if (m && m.length) {
      const i = text.indexOf(m[0]);
      const line = text.slice(0, i).split("\n").length;
      const sample = text.slice(Math.max(0, i - 40), i + 40).replace(/\s+/g, " ");
      hits.push([relative(ROOT, p).split("\\").join("/"), m.length, line, sample]);
    }
  }
}

walk(ROOT);
hits.sort((a, b) => b[1] - a[1]);

if (hits.length === 0) {
  console.log("encoding: clean — no double-encoded runs");
  process.exit(0);
}

console.log(`encoding: ${hits.length} file(s) with double-encoded runs\n`);
for (const [p, n, line, sample] of hits) {
  console.log(`  ${String(n).padStart(5)}  ${p}  (first at line ${line})`);
  console.log(`         ${sample}`);
}
console.log(
  "\nRecover with `git checkout -- <file>` and re-apply using an editor\n" +
    "that writes UTF-8. NEVER patch the mangled bytes, and never rewrite\n" +
    "a source file with PowerShell Set-Content without -Encoding UTF8."
);
process.exit(1);
