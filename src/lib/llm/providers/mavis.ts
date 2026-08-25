/**
 * Mavis API provider — calls the Mavis endpoint for chat + tool use.
 *
 * Cluster 5.0 Part A. Code-complete; not exercised by smokes (which
 * run against the mock). The smoke is the deterministic baseline
 * that proves the agent pipeline; the Mavis provider is the
 * cap-on-top that delivers real CFP-grade reasoning.
 *
 * To activate:
 *   1. Fill the 3 required Mavis env vars in .env.local:
 *        MAVIS_API_BASE=https://api.MiniMax.com/v1
 *        MAVIS_API_KEY=sk-...
 *        MAVIS_MODEL=Mavis-3
 *      (MAVIS_TOOL_FORMAT defaults to "openai" if left blank — the
 *      only format this provider implements today.)
 *   2. Set LLM_PROVIDER=mavis
 *   3. Restart the dev server.
 *
 * Tool-call format: the v1 implementation is OpenAI-compatible
 * (`tools` array, `tool_calls` field on the assistant message).
 * Anthropic format can be added as a sibling provider if the Mavis
 * endpoint actually uses it.
 */

import type {
  LLMProvider,
  LLMRequest,
  LLMResponse,
  LLMTool,
  LLMToolCall,
  LLMMessage,
} from "../types";
import type { MavisConfig } from "../config";

export async function callMavis(
  config: MavisConfig,
  req: LLMRequest,
): Promise<LLMResponse> {
  if (config.toolFormat !== "openai") {
    throw new Error(
      `[llm/mavis] Tool-call format "${config.toolFormat}" is not yet implemented. ` +
        `Supported: openai. (Anthropic format support is a follow-up.)`,
    );
  }
  return callMavisOpenAI(config, req);
}

// ──────────────────────────────────────────────────────────────────────
// OpenAI-compatible implementation
// ──────────────────────────────────────────────────────────────────────

async function callMavisOpenAI(
  config: MavisConfig,
  req: LLMRequest,
): Promise<LLMResponse> {
  const url = `${config.apiBase}/chat/completions`;
  const body = {
    model: req.model ?? config.model,
    messages: buildOpenAIMessages(req.systemPrompt, req.messages),
    tools: req.tools.length > 0 ? req.tools.map(toOpenAITool) : undefined,
    temperature: req.temperature ?? 0.7,
    max_tokens: req.maxTokens ?? 2048,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `[llm/mavis] HTTP ${res.status} from ${url}: ${text.slice(0, 500)}`,
    );
  }

  const data = (await res.json()) as OpenAIResponse;
  return fromOpenAIResponse(data);
}

/**
 * Strip a leading `<think>...</think>` chain-of-thought block from
 * the assistant's content. Some models (notably MiniMax-M3) emit the
 * full reasoning trace before the user-facing reply, wrapped in
 * `<think>` tags. The user shouldn't see the trace — only the reply.
 *
 * If no `<think>` block is present, returns the content unchanged.
 * If the block is unclosed (e.g. truncated by max_tokens), strips
 * from `<think>` to the end of the content.
 */
function stripThinking(content: string): string {
  if (!content) return content;
  const open = content.indexOf("<think>");
  if (open === -1) return content;
  const close = content.indexOf("</think>", open);
  if (close === -1) {
    // Unclosed block — drop everything from `<think>` onward.
    return content.slice(0, open).trim();
  }
  // Closed block — drop the block + any surrounding whitespace.
  return (content.slice(0, open) + content.slice(close + "</think>".length)).trim();
}

function buildOpenAIMessages(
  systemPrompt: string,
  messages: LLMMessage[],
): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = [
    { role: "system", content: systemPrompt },
  ];
  for (const m of messages) {
    if (m.role === "user") {
      out.push({ role: "user", content: m.content });
    } else if (m.role === "assistant") {
      const msg: Record<string, unknown> = { role: "assistant", content: m.content };
      if (m.toolCalls && m.toolCalls.length > 0) {
        msg.tool_calls = m.toolCalls.map((tc, i) => ({
          id: tc.id,
          type: "function",
          function: {
            name: tc.name,
            arguments: JSON.stringify(tc.args),
          },
          index: i,
        }));
      }
      out.push(msg);
    } else if (m.role === "tool") {
      out.push({
        role: "tool",
        tool_call_id: m.toolCallId,
        content: m.content,
      });
    }
  }
  return out;
}

function toOpenAITool(t: LLMTool): Record<string, unknown> {
  return {
    type: "function",
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  };
}

interface OpenAIToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

interface OpenAIResponse {
  choices: Array<{
    finish_reason: string;
    message: {
      role: "assistant";
      content: string | null;
      tool_calls?: OpenAIToolCall[];
    };
  }>;
  model?: string;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

function fromOpenAIResponse(data: OpenAIResponse): LLMResponse {
  const choice = data.choices[0];
  if (!choice) {
    return {
      content: "",
      toolCalls: [],
      finishReason: "error",
      provider: "mavis" satisfies LLMProvider as "mavis",
      meta: { error: "no_choices_in_response" },
    };
  }

  const toolCalls: LLMToolCall[] = (choice.message.tool_calls ?? []).map((tc) => {
    let args: Record<string, unknown> = {};
    try {
      args = JSON.parse(tc.function.arguments) as Record<string, unknown>;
    } catch {
      // Malformed arguments — surface as empty so the agent can
      // surface a "couldn't parse" error.
      args = { _raw: tc.function.arguments };
    }
    return { id: tc.id, name: tc.function.name, args };
  });

  const finishReason: LLMResponse["finishReason"] =
    choice.finish_reason === "tool_calls"
      ? "tool_calls"
      : choice.finish_reason === "length"
        ? "length"
        : "stop";

  return {
    content: stripThinking(choice.message.content ?? ""),
    toolCalls,
    finishReason,
    provider: "mavis",
    meta: { model: data.model, usage: data.usage },
  };
}
