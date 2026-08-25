/**
 * LLM provider types — shared across the mock / Mavis / Ollama providers.
 *
 * The shape is normalized: every provider returns the same `LLMResponse`
 * regardless of whether the underlying API uses OpenAI's `tool_calls` or
 * Anthropic's `tool_use` blocks. The dispatcher (`callAgent`) and the
 * onboarding agent don't care which provider was used — they consume the
 * normalized shape.
 *
 * Cluster 5.0 Part A.
 */

export type LLMProvider = "mavis" | "ollama" | "mock";

/**
 * A single tool the LLM can call. The `parameters` field is a JSON
 * Schema (subset) describing the tool's input. Each provider renders
 * this into its native format (OpenAI `tools` array, Anthropic
 * `tools` array, etc.) — the agent never has to know.
 */
export interface LLMTool {
  name: string;
  description: string;
  parameters: LLMToolParameters;
}

/**
 * A constrained JSON Schema subset. `type: "object"` with `properties`
 * and `required`. Providers that need richer schemas (anyOf, oneOf,
 * etc.) can extend this — for v1, the onboarding tool shapes are all
 * simple flat objects.
 */
export interface LLMToolParameters {
  type: "object";
  properties: Record<string, LLMToolParameterProperty>;
  required?: string[];
}

export interface LLMToolParameterProperty {
  type: "string" | "number" | "integer" | "boolean";
  description: string;
  enum?: string[];
  /** Optional default for missing fields. */
  default?: string | number | boolean;
}

/**
 * A tool call the LLM wants to make. The agent's orchestrator runs
 * these after the LLM responds.
 */
export interface LLMToolCall {
  /** Stable id, unique per response. The agent pairs results back to calls via this. */
  id: string;
  name: string;
  args: Record<string, unknown>;
}

/**
 * A single message in the conversation. The agent's orchestrator builds
 * these from the conversation history (user + agent + tool results).
 */
export type LLMMessage =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; toolCalls?: LLMToolCall[] }
  | { role: "tool"; toolCallId: string; content: string };

/**
 * The full request to the LLM. The agent's orchestrator builds this
 * from the current conversation state + the tool registry.
 */
export interface LLMRequest {
  systemPrompt: string;
  messages: LLMMessage[];
  tools: LLMTool[];
  /** Optional model override (defaults to the provider's default). */
  model?: string;
  /** Sampling temperature (0 = deterministic, 1 = creative). */
  temperature?: number;
  /** Max tokens for the response. */
  maxTokens?: number;
}

/**
 * The normalized response from any provider.
 */
export interface LLMResponse {
  /** The text the LLM wants to show the user (may be empty if it only called tools). */
  content: string;
  /** Tool calls the LLM made (may be empty if it only responded with text). */
  toolCalls: LLMToolCall[];
  /** Why the LLM stopped. "tool_calls" means it wants tools run before continuing. */
  finishReason: "stop" | "tool_calls" | "length" | "error";
  /** The provider that produced the response. Useful for logging. */
  provider: LLMProvider;
  /** Any provider-specific metadata (model id, token count, etc.). */
  meta?: Record<string, unknown>;
}
