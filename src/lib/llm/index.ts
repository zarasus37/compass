/**
 * LLM dispatcher — single entry point for every call.
 *
 * Cluster 5.0 Part A. Loads the env-driven config and routes
 * the request to the configured provider. The orchestrator and
 * any other call site only ever touch `callLLM`; provider
 * details stay behind the dispatch.
 *
 * Cluster 5.0 Part B added the **L1 rules fallback** — when the
 * user has selected a real provider (Mavis / Ollama) and the call
 * throws (out of credit, network down, malformed response), we
 * silently fall through to the deterministic mock engine so the
 * user can keep the conversation going. The fallback is marked
 * in the response's `meta` so the orchestrator + chat UI can
 * surface a "we had trouble reaching Mavis; using a backup" banner.
 *
 * The dispatcher is intentionally a thin layer: load config
 * once (cached), pick the branch, delegate.
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

/**
 * Call the configured LLM. If the primary provider (Mavis / Ollama)
 * errors, fall back to the L1 rules engine (the deterministic
 * mock) so the user can keep going. The fallback is marked in
 * `meta.fellBack` with the original provider + error message.
 *
 * The mock provider never falls back (it IS the L1 rules engine);
 * if it errors, the error propagates.
 */
export async function callLLM(req: LLMRequest): Promise<LLMResponse> {
  const c = config();
  try {
    switch (c.provider) {
      case "mavis":
        if (!c.mavis) {
          // loadLLMConfig already throws on this case, but keep the
          // null-check for type-safety.
          throw new Error(
            "[llm] LLM_PROVIDER=mavis but Mavis config is null. Check .env.local.",
          );
        }
        return await callMavis(c.mavis, req);
      case "ollama":
        if (!c.ollama) {
          throw new Error(
            "[llm] LLM_PROVIDER=ollama but Ollama config is null. Check .env.local.",
          );
        }
        return await callOllama(c.ollama, req);
      case "mock":
        return await callMock(req);
      default: {
        // Exhaustiveness check.
        const _exhaustive: never = c.provider;
        throw new Error(`[llm] Unknown provider: ${String(_exhaustive)}`);
      }
    }
  } catch (err) {
    // L1 rules fallback: a real provider (Mavis or Ollama) errored.
    // The mock provider has no fallback (it IS the rules engine);
    // if it throws, propagate.
    if (c.provider === "mavis" || c.provider === "ollama") {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.warn(
        `[llm] ${c.provider} failed; falling back to L1 rules engine: ${errorMsg}`,
      );
      // Stable per-(primary-provider) seed so the mock's per-seed
      // topic tracking survives across turns within a conversation.
      // Different primaries get different seeds so a user who flips
      // Mavis → Ollama mid-onboarding doesn't carry topic state.
      const fallbackSeed = `l1-fallback-${c.provider}`;
      const fallbackReq: LLMRequest = { ...req, model: fallbackSeed };
      const fallbackRes = await callMock(fallbackReq);
      return {
        ...fallbackRes,
        // Keep `provider` as the one that actually produced the
        // response (mock), so callers can route on it. The
        // original primary that failed is in `meta.originalProvider`.
        provider: fallbackRes.provider,
        meta: {
          ...(fallbackRes.meta ?? {}),
          fellBack: true,
          originalProvider: c.provider,
          l1Error: errorMsg,
        },
      };
    }
    throw err;
  }
}

// ──────────────────────────────────────────────────────────────────────
// Re-exports for convenience — callers should import the types
// from `lib/llm` rather than reaching into `./types`.
// ──────────────────────────────────────────────────────────────────────

export type { LLMProvider, LLMRequest, LLMResponse, LLMMessage, LLMTool, LLMToolCall } from "./types";
export type { LLMConfig, MavisConfig, OllamaConfig, MockConfig } from "./config";
export { loadLLMConfig } from "./config";
