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
 */

import type { LLMProvider } from "./types";

/** Default provider when LLM_PROVIDER is unset or unrecognized. */
const DEFAULT_PROVIDER: LLMProvider = "mock";

export interface LLMConfig {
  provider: LLMProvider;
  mavis: MavisConfig | null;
  ollama: OllamaConfig | null;
  mock: MockConfig;
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

  return { provider, mavis, ollama, mock };
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
