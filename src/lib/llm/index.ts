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
 * Cluster 5.3.1 added the **advisor-specific dispatcher** —
 * `callLLMForAdvisor`. The advisor uses a separate env var
 * (`LLM_PROVIDER_ADVISOR`, default `ollama`) so the post-onboarding
 * advisor can run on a small local model independently of the
 * extraction flow's `LLM_PROVIDER`. Same L1 fallback semantics.
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
  return dispatch(req, c.provider, c, "l1-fallback-default");
}

/**
 * Cluster 5.3.1. Call the LLM for the post-onboarding advisor
 * surface. Uses the advisor-specific provider
 * (`LLM_PROVIDER_ADVISOR`, default `ollama`). Same L1 fallback
 * semantics as `callLLM`. Independent of the global provider,
 * so you can run Mavis on onboarding + Ollama on the advisor.
 *
 * If the advisor's selected provider is misconfigured (e.g.
 * ollama is selected but the Ollama env is missing), this
 * function falls through to the mock on the FIRST call
 * (rather than throwing at config-load time) so a misconfigured
 * dev environment can still serve advisor traffic (with a
 * warning in the meta).
 */
export async function callLLMForAdvisor(req: LLMRequest): Promise<LLMResponse> {
  const c = config();
  const wanted = c.advisor.provider;
  // The user picked Mavis/Ollama but the env is missing — the
  // dispatcher logs a warning and falls through to the mock. We
  // surface this as meta.fellBack so the advisor can show a
  // "running on backup" banner (same UX as the main flow).
  if (wanted === "mavis" && c.advisor.mavisMissing) {
    return fallbackToMock(req, wanted, "Mavis env missing — falling back to L1 mock for advisor");
  }
  if (wanted === "ollama" && c.advisor.ollamaMissing) {
    return fallbackToMock(req, wanted, "Ollama env missing — falling back to L1 mock for advisor");
  }
  return dispatch(req, wanted, c, "l1-fallback-advisor");
}

/**
 * Internal — shared dispatch logic. `fallbackSeed` namespaces the
 * mock's per-seed topic tracking so a user who flips between
 * the main flow and the advisor doesn't carry topic state
 * across surfaces.
 */
async function dispatch(
  req: LLMRequest,
  provider: "mavis" | "ollama" | "mock",
  c: LLMConfig,
  fallbackSeed: string,
): Promise<LLMResponse> {
  try {
    switch (provider) {
      case "mavis":
        if (!c.mavis) {
          throw new Error(
            "[llm] Mavis config is null at dispatch time. Check .env.local.",
          );
        }
        return await callMavis(c.mavis, req);
      case "ollama":
        if (!c.ollama) {
          throw new Error(
            "[llm] Ollama config is null at dispatch time. Check .env.local.",
          );
        }
        return await callOllama(c.ollama, req);
      case "mock":
        return await callMock(req);
      default: {
        const _exhaustive: never = provider;
        throw new Error(`[llm] Unknown provider: ${String(_exhaustive)}`);
      }
    }
  } catch (err) {
    if (provider === "mavis" || provider === "ollama") {
      return fallbackToMock(req, provider, err instanceof Error ? err.message : String(err), fallbackSeed);
    }
    throw err;
  }
}

async function fallbackToMock(
  req: LLMRequest,
  originalProvider: "mavis" | "ollama" | "mock",
  errorMsg: string,
  seed: string = "l1-fallback-advisor",
): Promise<LLMResponse> {
  console.warn(
    `[llm/advisor] ${originalProvider} failed; falling back to L1 rules engine: ${errorMsg}`,
  );
  const fallbackReq: LLMRequest = { ...req, model: seed };
  const fallbackRes = await callMock(fallbackReq);
  return {
    ...fallbackRes,
    provider: fallbackRes.provider,
    meta: {
      ...(fallbackRes.meta ?? {}),
      fellBack: true,
      originalProvider,
      l1Error: errorMsg,
    },
  };
}

// ──────────────────────────────────────────────────────────────────────
// Re-exports for convenience — callers should import the types
// from `lib/llm` rather than reaching into `./types`.
// ──────────────────────────────────────────────────────────────────────

export type { LLMProvider, LLMRequest, LLMResponse, LLMMessage, LLMTool, LLMToolCall } from "./types";
export type { LLMConfig, MavisConfig, OllamaConfig, MockConfig, AdvisorConfig } from "./config";
export { loadLLMConfig } from "./config";
