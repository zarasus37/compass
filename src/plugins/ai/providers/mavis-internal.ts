/**
 * Mavis Internal AI provider adapter.
 *
 * The internal Mavis endpoint follows the same shape used elsewhere in
 * the workspace (e.g. Ice Depot). POST {baseUrl}/v1/chat/completions
 * with a bearer API key, OpenAI-compatible request/response.
 *
 * IMPORTANT: this is the ONLY place that knows the Mavis URL/headers.
 * Everything else in the app talks to the AiProviderPlugin interface.
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
  id?: string;
  model?: string;
  choices?: Array<{ message?: { content?: string } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
}

const DEFAULT_MODEL = "m3";

export function createMavisInternalProvider(): AiProviderPlugin {
  const { baseUrl, apiKey } = config.ai.mavis;

  async function postJson<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(
        `Mavis internal ${path} -> HTTP ${res.status}: ${text.slice(0, 200)}`,
      );
    }
    return (await res.json()) as T;
  }

  return {
    id: "mavis-internal",
    displayName: "Mavis Internal",
    capabilities: ["chat", "categorize", "stream"],
    async complete(req: CompleteRequest): Promise<CompleteResponse> {
      const messages: OpenAiStyleMessage[] = [];
      if (req.system) messages.push({ role: "system", content: req.system });
      messages.push({ role: "user", content: req.prompt });

      const body: OpenAiStyleRequest = {
        model: DEFAULT_MODEL,
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
        providerId: "mavis-internal",
      };
    },

    async health(): Promise<ProviderHealth> {
      const start = Date.now();
      try {
        const data = await postJson<OpenAiStyleResponse>(
          "/v1/chat/completions",
          {
            model: DEFAULT_MODEL,
            messages: [{ role: "user", content: "ping" }],
            max_tokens: 1,
          },
        );
        return {
          ok: true,
          latencyMs: Date.now() - start,
          model: data.model ?? DEFAULT_MODEL,
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
