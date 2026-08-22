/**
 * AI Provider Plugin Contract (per 00-DESIGN.md §5a).
 *
 * The app code only knows this interface. Every concrete implementation
 * (Mavis internal, Ollama, future OpenAI/Anthropic) lives in
 * `src/plugins/ai/providers/` and is loaded via the registry.
 *
 * The registry is config-driven (see `registry.ts`). Switching providers is
 * a config change, not a code change.
 */

import { z } from "zod";

/** Capabilities a provider can advertise. */
export const AiCapabilitySchema = z.enum([
  "chat",
  "categorize",
  "embed",
  "stream",
]);
export type AiCapability = z.infer<typeof AiCapabilitySchema>;

/** Plain completion request — non-streaming. */
export interface CompleteRequest {
  prompt: string;
  /** Optional system prompt for grounding. */
  system?: string;
  /** Sampling temperature. 0 = deterministic. */
  temperature?: number;
  /** Max output tokens (provider-specific ceiling). */
  maxTokens?: number;
}

/** Plain completion response. */
export interface CompleteResponse {
  text: string;
  /** Tokens used (when provider reports it). */
  usage?: { prompt: number; completion: number; total: number };
  /** Which provider produced this (for audit). */
  providerId: string;
}

/** A health snapshot — does the provider respond? */
export interface ProviderHealth {
  ok: boolean;
  /** ms round-trip for the probe. */
  latencyMs?: number;
  /** Free-form status, surfaced to the user. */
  message?: string;
  /** Provider-reported model id, when reachable. */
  model?: string;
}

/** The contract every AI provider plugin must satisfy. */
export interface AiProviderPlugin {
  /** Stable id, used in config + audit log. */
  id: string;
  /** Human-readable name for the UI. */
  displayName: string;
  /** Capabilities this provider supports. */
  capabilities: ReadonlyArray<AiCapability>;
  /** Run a completion. Throws on transport / validation failure. */
  complete(req: CompleteRequest): Promise<CompleteResponse>;
  /** Lightweight reachability probe. Never throws. */
  health(): Promise<ProviderHealth>;
}
