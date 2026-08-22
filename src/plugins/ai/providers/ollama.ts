/**
 * Ollama AI provider adapter.
 *
 * Talks to a local Ollama daemon. Ollama exposes an OpenAI-compatible endpoint
 * at /v1/chat/completions as of recent versions, plus the native /api/* surface.
 * We use the OpenAI-compatible path for consistency with the Mavis adapter.
 */
import { config } from "@/lib/config";
import type {
  AiProviderPlugin,
  CompleteRequest,
  CompleteResponse,
  ProviderHealth,
} from "../types";

interface OpenAiStyleMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OpenAiStyleRequest {
  model: string;
  messages: OpenAiStyleMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: false;
}

interface OpenAiStyleResponse {
  model?: string;
  choices?: Array<{ message?: { content?: string } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
}

export function createOllamaProvider(): AiProviderPlugin {
  const { baseUrl, model } = config.ai.ollama;

  async function postJson<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `Ollama ${path} -> HTTP ${res.status}: ${text.slice(0, 200)}`,
      );
    }
    return (await res.json()) as T;
  }

  return {
    id: "ollama",
    displayName: "Ollama (local)",
    capabilities: ["chat", "categorize", "embed", "stream"],
    async complete(req: CompleteRequest): Promise<CompleteResponse> {
      const messages: OpenAiStyleMessage[] = [];
      if (req.system) messages.push({ role: "system", content: req.system });
      messages.push({ role: "user", content: req.prompt });

      const body: OpenAiStyleRequest = {
        model,
        messages,
        ...(req.temperature !== undefined ? { temperature: req.temperature } : {}),
        ...(req.maxTokens !== undefined ? { max_tokens: req.maxTokens } : {}),
      };

      const data = await postJson<OpenAiStyleResponse>(
        "/v1/chat/completions",
        body,
      );

      const text = data.choices?.[0]?.message?.content ?? "";
      const usage = data.usage
        ? {
            prompt: data.usage.prompt_tokens ?? 0,
            completion: data.usage.completion_tokens ?? 0,
            total: data.usage.total_tokens ?? 0,
          }
        : undefined;

      return {
        text,
        ...(usage ? { usage } : {}),
        providerId: "ollama",
      };
    },

    async health(): Promise<ProviderHealth> {
      const start = Date.now();
      try {
        const data = await postJson<OpenAiStyleResponse>(
          "/v1/chat/completions",
          {
            model,
            messages: [{ role: "user", content: "ping" }],
            max_tokens: 1,
          },
        );
        return {
          ok: true,
          latencyMs: Date.now() - start,
          model: data.model ?? model,
          message: "Reachable",
        };
      } catch (err) {
        return {
          ok: false,
          message: err instanceof Error ? err.message : "Unknown error",
        };
      }
    },
  };
}
