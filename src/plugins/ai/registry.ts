/**
 * AI Provider Registry (per 00-DESIGN.md §5a).
 *
 * The active provider is selected by config (`COMPASS_AI_PROVIDER`).
 * Switching providers is a config change, not a code change. The rest of
 * the app code only ever sees `getAiProvider()`.
 *
 * The registry is lazy: the provider is built on first call. If the
 * configured provider id is unknown, we fall back to Mavis internal and
 * log a warning — never block app startup over a missing AI provider.
 */
import { config } from "@/lib/config";
import type { AiProviderPlugin } from "./types";
import { createMavisInternalProvider } from "./providers/mavis-internal";
import { createOllamaProvider } from "./providers/ollama";

type ProviderFactory = () => AiProviderPlugin;

const FACTORIES: Record<string, ProviderFactory> = {
  "mavis-internal": createMavisInternalProvider,
  ollama: createOllamaProvider,
};

let cached: AiProviderPlugin | null = null;
let cachedId: string | null = null;

/** Get the active AI provider, building it on first call. */
export function getAiProvider(): AiProviderPlugin {
  if (cached && cachedId === config.ai.provider) return cached;

  const factory = FACTORIES[config.ai.provider];
  if (!factory) {
    console.warn(
      `[plugins/ai] Unknown provider "${config.ai.provider}", falling back to "mavis-internal".`,
    );
    cached = createMavisInternalProvider();
    cachedId = "mavis-internal";
    return cached;
  }

  cached = factory();
  cachedId = config.ai.provider;
  return cached;
}

/** For tests / hot-reload. Not part of the public feature surface. */
export function _resetAiProviderCacheForTests(): void {
  cached = null;
  cachedId = null;
}
