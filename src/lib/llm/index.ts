/**
 * LLM dispatcher — single entry point for every call.
 *
 * Cluster 5.0 Part A. Loads the env-driven config and routes
 * the request to the configured provider. The orchestrator and
 * any other call site only ever touch `callLLM`; provider
 * details stay behind the dispatch.
 *
 * The dispatcher is intentionally a thin layer: load config
 * once (cached), pick the branch, delegate. No retry logic in v1
 * (the user can re-send; sophisticated retry is a follow-up).
 */

import type { LLMRequest, LLMResponse } from "./types";
import { loadLLMConfig, type LLMConfig } from "./config";
import { callMavis } from "./providers/mavis";
import { callOllama } from "./providers/ollama";
import { callMock } from "./providers/mock";

// ──────────────────────────────────────────────────────────────────────
// Cached config — load once per process so env reads don't repeat.
// ──────────────────────────────────────────────────────────────────────

let _config: LLMConfig | null = null;

function config(): LLMConfig {
  if (!_config) {
    _config = loadLLMConfig();
  }
  return _config;
}

/** Test-only — force re-read on next call (e.g. after env change in smoke). */
export function resetLLMConfig(): void {
  _config = null;
}

// ──────────────────────────────────────────────────────────────────────
// Public dispatcher
// ──────────────────────────────────────────────────────────────────────

export async function callLLM(req: LLMRequest): Promise<LLMResponse> {
  const c = config();
  switch (c.provider) {
    case "mavis":
      if (!c.mavis) {
        // loadLLMConfig already throws on this case, but keep the
        // null-check for type-safety.
        throw new Error(
          "[llm] LLM_PROVIDER=mavis but Mavis config is null. Check .env.local.",
        );
      }
      return callMavis(c.mavis, req);
    case "ollama":
      if (!c.ollama) {
        throw new Error(
          "[llm] LLM_PROVIDER=ollama but Ollama config is null. Check .env.local.",
        );
      }
      return callOllama(c.ollama, req);
    case "mock":
      return callMock(req);
    default: {
      // Exhaustiveness check.
      const _exhaustive: never = c.provider;
      throw new Error(`[llm] Unknown provider: ${String(_exhaustive)}`);
    }
  }
}

// ──────────────────────────────────────────────────────────────────────
// Re-exports for convenience — callers should import the types
// from `lib/llm` rather than reaching into `./types`.
// ──────────────────────────────────────────────────────────────────────

export type { LLMProvider, LLMRequest, LLMResponse, LLMMessage, LLMTool, LLMToolCall } from "./types";
export type { LLMConfig, MavisConfig, OllamaConfig, MockConfig } from "./config";
export { loadLLMConfig } from "./config";
