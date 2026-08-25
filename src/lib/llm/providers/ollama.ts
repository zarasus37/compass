/**
 * Ollama local provider — calls a local Ollama server for chat +
 * tool use. OpenAI-compatible API surface (`/api/chat`).
 *
 * Cluster 5.0 Part A + 5.3. The provider is code-complete; it'll
 * be the default for the post-onboarding advisor ("Ask me anything
 * about your money") once 5.3 lands. For v1, the smoke doesn't
 * hit Ollama — the mock is the baseline.
 *
 * To activate:
 *   1. Run Ollama locally: `ollama serve` (default base: http://localhost:11434)
 *   2. Pull a model: `ollama pull llama3.2`
 *   3. Set in .env.local:
 *        OLLAMA_BASE=http://localhost:11434
 *        OLLAMA_MODEL=llama3.2
 *   4. Set LLM_PROVIDER=ollama
 *   5. Restart the dev server.
 */

import type {
  LLMProvider,
  LLMRequest,
  LLMResponse,
  LLMTool,
  LLMToolCall,
  LLMMessage,
} from "../types";
import type { OllamaConfig } from "../config";

export async function callOllama(
  config: OllamaConfig,
  req: LLMRequest,
): Promise<LLMResponse> {
  const url = `${config.base}/api/chat`;
  const body = {
    model: req.model ?? config.model,
    messages: buildOllamaMessages(req.systemPrompt, req.messages),
    tools: req.tools.length > 0 ? req.tools.map(toOllamaTool) : undefined,
    stream: false,
    options: {
      temperature: req.temperature ?? 0.7,
      num_predict: req.maxTokens ?? 2048,
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `[llm/ollama] HTTP ${res.status} from ${url}: ${text.slice(0, 500)}`,
    );
  }

  const data = (await res.json()) as OllamaChatResponse;
  return fromOllamaResponse(data);
}

function buildOllamaMessages(
  systemPrompt: string,
  messages: LLMMessage[],
): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = [];
  for (const m of messages) {
    if (m.role === "user") {
      out.push({ role: "user", content: m.content });
    } else if (m.role === "assistant") {
      const msg: Record<string, unknown> = { role: "assistant", content: m.content };
      if (m.toolCalls && m.toolCalls.length > 0) {
        msg.tool_calls = m.toolCalls.map((tc) => ({
          id: tc.id,
          type: "function",
          function: { name: tc.name, arguments: tc.args },
        }));
      }
      out.push(msg);
    } else if (m.role === "tool") {
      out.push({ role: "tool", tool_call_id: m.toolCallId, content: m.content });
    }
  }
  // Ollama's /api/chat takes a "system" message outside the messages
  // array OR as the first message. We pass it as the first message
  // for portability across Ollama versions.
  out.unshift({ role: "system", content: systemPrompt });
  return out;
}

function toOllamaTool(t: LLMTool): Record<string, unknown> {
  // Ollama's tool format mirrors OpenAI's. Confirmed in Ollama 0.4+.
  return {
    type: "function",
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  };
}

interface OllamaToolCall {
  id?: string;
  type: "function";
  function: { name: string; arguments: Record<string, unknown> | string };
}

interface OllamaChatResponse {
  model: string;
  message: {
    role: "assistant";
    content: string;
    tool_calls?: OllamaToolCall[];
  };
  done_reason?: string;
  total_duration?: number;
  eval_count?: number;
}

function fromOllamaResponse(data: OllamaChatResponse): LLMResponse {
  const m = data.message;
  const toolCalls: LLMToolCall[] = (m.tool_calls ?? []).map((tc, i) => {
    const args =
      typeof tc.function.arguments === "string"
        ? safeJson(tc.function.arguments)
        : tc.function.arguments;
    return {
      id: tc.id ?? `ollama_tc_${i}`,
      name: tc.function.name,
      args,
    };
  });

  return {
    content: m.content ?? "",
    toolCalls,
    finishReason: toolCalls.length > 0 ? "tool_calls" : "stop",
    provider: "ollama",
    meta: {
      model: data.model,
      totalDuration: data.total_duration,
      evalCount: data.eval_count,
    },
  };
}

function safeJson(s: string): Record<string, unknown> {
  try {
    return JSON.parse(s) as Record<string, unknown>;
  } catch {
    return { _raw: s };
  }
}
