import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * Lint severity policy.
 *
 * Compass carried 414 lint errors across 98 files with nothing failing
 * on them — lint was never wired into CI, so the number had no
 * consequence and simply accumulated.
 *
 * Rather than block CI on all 414 (a mass reformat with real
 * regression risk on financial calculations), rules are split by
 * whether a violation indicates a *correctness* bug:
 *
 *   error  — React 19 correctness rules. Each indicates a real bug
 *            class: refs mutated during render tear, setState inside
 *            an effect causes cascading renders or render loops, and
 *            mutating props/state breaks React change detection. These
 *            should block a merge.
 *
 *   warn   — style and hygiene. `jsx-no-comment-textnodes` fires on
 *            any JSX comment expression (mostly the Oracle Terminal
 *            section markers this codebase uses deliberately), and
 *            `no-unescaped-entities` fires on the apostrophes in that
 *            same voice. Noise at this volume.
 *
 * `pnpm lint` exits non-zero on errors only, which is what CI gates on.
 */
const CORRECTNESS_RULES = [
  "react-hooks/set-state-in-effect",
  "react-hooks/refs",
  "react-hooks/immutability",
  "react-hooks/purity",
  "react-hooks/exhaustive-deps",
  "react-hooks/rules-of-hooks",
];

const HYGIENE_RULES = {
  "react/jsx-no-comment-textnodes": "warn",
  "react/no-unescaped-entities": "warn",
  "@typescript-eslint/no-unused-vars": "warn",
  "@typescript-eslint/no-require-imports": "warn",
  "@typescript-eslint/no-explicit-any": "warn",
};

// The `react-hooks` plugin is registered by eslint-config-next on the
// first core-web-vitals entry, and `@typescript-eslint` on the
// typescript entry. Flat config requires a rule's plugin to be defined
// in the same object where the rule is given a severity, and later
// objects win — so the stock configs are spread first and the merged
// entries (which carry the plugins) are applied last.
const [reactEntry, ...vitalsRest] = nextVitals;
const [tsEntry, ...tsRest] = nextTs;

const reactRules = {
  ...Object.fromEntries(CORRECTNESS_RULES.map((r) => [r, "error"])),
  "react/jsx-no-comment-textnodes": "warn",
  "react/no-unescaped-entities": "warn",
};

const tsRules = {
  "@typescript-eslint/no-unused-vars": "warn",
  "@typescript-eslint/no-require-imports": "warn",
  "@typescript-eslint/no-explicit-any": "warn",
};

const eslintConfig = defineConfig([
  reactEntry,
  ...vitalsRest,
  tsEntry,
  ...tsRest,
  { ...reactEntry, rules: { ...(reactEntry.rules ?? {}), ...reactRules } },
  { ...tsEntry, rules: { ...(tsEntry.rules ?? {}), ...tsRules } },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated Prisma client — code we don't own, don't lint.
    "src/generated/**",
    "tests/**",
    // Local diagnostic scratch from past sessions.
    "scratch-*.txt",
  ]),
]);

export default eslintConfig;
