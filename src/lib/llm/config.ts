/**
 * LLM config — env-driven provider selection.
 *
 * Cluster 5.0 Part A. The user can flip from mock → Mavis by:
 *   1. Filling the 3 required Mavis env vars in .env.local:
 *        MAVIS_API_BASE, MAVIS_API_KEY, MAVIS_MODEL
 *      (MAVIS_TOOL_FORMAT defaults to "openai" if blank — the only
 *      format implemented today.)
 *   2. Setting LLM_PROVIDER=mavis
 * No code changes required.
 *
 * If Mavis is selected but a required env var is missing, we throw
 * a clear error pointing at the missing var (not a silent fallback
 * to mock — silent fallback would be a worse failure mode).
 *
 * Cluster 5.3.1 — added the **advisor-specific provider** via
 * `LLM_PROVIDER_ADVISOR` (default `ollama`). The two-tier pattern
 * (Mavis for extraction, Ollama for advisory) is the project
 * intent — the advisor is the post-onboarding "ask me anything"
 * surface and benefits from a smaller, local, privacy-first
 * model. Independent of `LLM_PROVIDER` so you can run Mavis on
 * onboarding + Ollama on the advisor with zero cross-talk.
 */

import type { LLMProvider } from "./types";

/** Default provider when LLM_PROVIDER is unset or unrecognized. */
const DEFAULT_PROVIDER: LLMProvider = "mock";

/** Default provider when LLM_PROVIDER_ADVISOR is unset or unrecognized. */
const DEFAULT_ADVISOR_PROVIDER: LLMProvider = "ollama";

export interface LLMConfig {
  provider: LLMProvider;
  mavis: MavisConfig | null;
  ollama: OllamaConfig | null;
  mock: MockConfig;
  /** Cluster 5.3.1 — the advisor's provider, independent of the global one. */
  advisor: AdvisorConfig;
}

export interface AdvisorConfig {
  provider: LLMProvider;
  /** Set when the advisor provider is Mavis but its env is missing/invalid. */
  mavisMissing: boolean;
  /** Set when the advisor provider is Ollama but its env is missing/invalid. */
  ollamaMissing: boolean;
}

export interface MavisConfig {
  apiKey: string;
  apiBase: string;
  model: string;
  toolFormat: "openai" | "anthropic";
}

export interface OllamaConfig {
  base: string;
  model: string;
  toolFormat: "openai"; // Ollama is OpenAI-compatible
}

export interface MockConfig {
  /** A seed string so the mock can produce deterministic-but-distinct responses across sessions. */
  seed: string;
}

/**
 * Read the LLM config from process.env. Throws on misconfiguration of
 * the *selected* provider — never silently falls back to mock.
 */
export function loadLLMConfig(): LLMConfig {
  const provider = readProvider();

  const mavis = readMavisConfig();
  const ollama = readOllamaConfig();
  const mock: MockConfig = {
    seed: process.env.MOCK_LLM_SEED ?? "compass-mock-1",
  };

  if (provider === "mavis" && !mavis) {
    throw new Error(
      "[llm] LLM_PROVIDER=mavis but Mavis env vars are missing or invalid. " +
        "Required: MAVIS_API_KEY, MAVIS_API_BASE, MAVIS_MODEL. " +
        "(MAVIS_TOOL_FORMAT defaults to \"openai\" if blank.) " +
        "See .env.local.example for the format. " +
        "To run on the mock provider instead, set LLM_PROVIDER=mock.",
    );
  }
  if (provider === "ollama" && !ollama) {
    throw new Error(
      "[llm] LLM_PROVIDER=ollama but Ollama env vars are missing. " +
        "Required: OLLAMA_BASE, OLLAMA_MODEL. " +
        "To run on the mock provider instead, set LLM_PROVIDER=mock.",
    );
  }

  // Cluster 5.3.1 — the advisor's provider is independent. We
  // surface "missing" as a flag instead of throwing so the
  // advisor can be configured (e.g. set to ollama) even when
  // the Ollama env is absent — the dispatcher will fall through
  // to the mock on the first call rather than crashing the
  // server at config-load time. (The smoke tests this.)
  const advisorProvider = readAdvisorProvider();
  const advisor: AdvisorConfig = {
    provider: advisorProvider,
    mavisMissing: advisorProvider === "mavis" && !mavis,
    ollamaMissing: advisorProvider === "ollama" && !ollama,
  };

  return { provider, mavis, ollama, mock, advisor };
}

function readProvider(): LLMProvider {
  const raw = (process.env.LLM_PROVIDER ?? "").trim().toLowerCase();
  if (raw === "mavis") return "mavis";
  if (raw === "ollama") return "ollama";
  if (raw === "mock") return "mock";
  if (raw === "") return DEFAULT_PROVIDER;
  // Unrecognized value: log a warning and fall through to mock rather
  // than crashing the dev server. The user will see the wrong
  // provider in the smoke and fix it.
  console.warn(
    `[llm] LLM_PROVIDER="${raw}" is not recognized. Expected one of: mavis, ollama, mock. Falling through to mock.`,
  );
  return DEFAULT_PROVIDER;
}

/**
 * Cluster 5.3.1. Reads the advisor-specific provider from
 * `LLM_PROVIDER_ADVISOR`. Defaults to `ollama` (the project's
 * intent for the post-onboarding advisor surface — privacy-
 * first, local, smaller model). Independent of `LLM_PROVIDER`.
 */
function readAdvisorProvider(): LLMProvider {
  const raw = (process.env.LLM_PROVIDER_ADVISOR ?? "").trim().toLowerCase();
  if (raw === "mavis") return "mavis";
  if (raw === "ollama") return "ollama";
  if (raw === "mock") return "mock";
  if (raw === "") return DEFAULT_ADVISOR_PROVIDER;
  console.warn(
    `[llm] LLM_PROVIDER_ADVISOR="${raw}" is not recognized. Expected one of: mavis, ollama, mock. Falling through to ollama.`,
  );
  return DEFAULT_ADVISOR_PROVIDER;
}

function readMavisConfig(): MavisConfig | null {
  const apiKey = process.env.MAVIS_API_KEY?.trim();
  const apiBase = process.env.MAVIS_API_BASE?.trim();
  const model = process.env.MAVIS_MODEL?.trim();
  // Tool format defaults to "openai" — the only format we've
  // implemented. User can override to "anthropic" once that
  // branch is added. Leaving it blank is the recommended path.
  const toolFormatRaw = (process.env.MAVIS_TOOL_FORMAT ?? "openai").trim().toLowerCase();

  if (!apiKey || !apiBase || !model) return null;
  if (toolFormatRaw !== "openai" && toolFormatRaw !== "anthropic") {
    console.warn(
      `[llm] MAVIS_TOOL_FORMAT="${toolFormatRaw}" is not recognized. Expected "openai" or "anthropic". Defaulting to "openai".`,
    );
    return null;
  }

  return {
    apiKey,
    apiBase: stripTrailingSlash(apiBase),
    model,
    toolFormat: toolFormatRaw,
  };
}

function readOllamaConfig(): OllamaConfig | null {
  const base = process.env.OLLAMA_BASE?.trim();
  const model = process.env.OLLAMA_MODEL?.trim();
  if (!base || !model) return null;
  return { base: stripTrailingSlash(base), model, toolFormat: "openai" };
}

function stripTrailingSlash(s: string): string {
  return s.endsWith("/") ? s.slice(0, -1) : s;
}
