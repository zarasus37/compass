# Cluster 7.35 — Onboarding extractor fixes + stuck-detector refinement

**Status (2026-09-24): SPEC.** Mom's second feedback round.

## Bug A — extractDollars / extractCadence don't parse natural phrasing (the actual stuck)

### Symptom (mom's screenshot, 2026-09-24)

Mom: "i currently get paid twice a month. first check on the 10th and second check on the 25th"
Agent: "Cadence noted — semi_monthly. What's the rough take-home per paycheck?" [calls `saveIncomeSource` with cadence=semi_monthly, amount=null]
Mom: "every check i receive 2,000"
Agent: "Tell me a bit more — what kind of work do you do, and how often does the money come in?" [no tool call, canned fallback]

### Root cause

Two regex gaps in `src/lib/llm/providers/mock.ts::extractDollars` and `extractCadence`:

- `extractDollars` requires `$` prefix or `dollars`/`bucks` suffix. Bare numbers like `"2,000"` in natural prose ("every check I receive 2,000") don't match.
- `extractCadence` doesn't match `"every check"`, `"each paycheck"`, `"per pay period"`, `"twice a month on the 10th and 25th"`.

### Fix

Widen the regexes to accept bare numerals in income-sensible ranges ($100-$1M per pay period) and add common per-check phrasings to the cadence patterns.

| Function | Current | New |
|---|---|---|
| `extractDollars` regex 1 | `\$\s*\d{1,3}...` (needs `$`) | Also match bare numerals in the $100-$1M range |
| `extractCadence` | 4 patterns (weekly/biweekly/semi_monthly/monthly) | Add: `every check`, `each paycheck`, `per pay period`, `a check`, `a paycheck`, `on the Nth and Nth` (e.g. "10th and 25th" → semi_monthly) |

Also: when `amountDollars` is captured but no `cadence` (e.g. mom says "2,000 per check"), keep the existing branch (ask "how often does that hit?") but the next turn's "every check" now resolves to a cadence.

## Bug B — stuck detector is too aggressive (made worse by 7.33)

### Symptom

After mom typed "ok" then "what do you need to know" (both follow-up attempts), the stuck detector fires immediately and shows the "I'm not making progress" nudge. But mom is mid-conversation — she's trying to figure out what the agent needs.

### Root cause

`consecutiveNoProgressTurns` counts assistant messages that didn't have tool calls. But:
1. A failed tool call (saveIncomeSource with all-null args, like in Bug A) still counts as "progress" (it had a tool call), but it's not real progress — the data wasn't extracted.
2. The user is mid-flow and the detector bails them out before they have a chance to answer.

### Fix

- Add a `minTurnsBeforeDetect = 2` floor: don't fire the nudge until at least 2 user messages have been sent.
- Don't fire the nudge if the agent's LAST response ended with a specific clarifying question (recognize "?", "...", etc.). The detector should only fire when the agent is asking the same vague opener.
- (Better, longer-term) Track what the agent ASKED for in its last message. If mom is answering that question (even if the extractor can't parse it yet), don't fire.

## Files

| File | Change |
|---|---|
| `src/lib/llm/providers/mock.ts` | `extractDollars` regex widen + `extractCadence` pattern additions (~15 LOC) |
| `src/lib/onboarding/stuck-detector.ts` | `minTurnsBeforeDetect` floor + "agent asked a question last" check (~20 LOC) |
| `src/lib/onboarding/agent.ts` | Update detector call to pass turn count (~3 LOC) |
| `tests/smoke-extract-fix.mjs` (new, ~12 checks) | extractDollars matches "2,000" / "$2000" / "two thousand" (number-only); extractCadence matches "every check" / "each paycheck" / "10th and 25th"; full agent.ts turn sequence: TURN 1 cadence+TURN 2 amount produces a saveIncomeSource call with both args; stuck detector doesn't fire on TURN 2 even if user says "ok" |
| `tests/smoke-onboarding-stuck-detector.mjs` (update, +3 checks) | Detector waits for `minTurnsBeforeDetect=2`; detector doesn't fire if agent ended with "?" |
