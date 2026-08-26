/**
 * Dev-only API route for testing the L1 rules fallback (Cluster 5.0 Part B).
 *
 * NOT for production use. The route mutates process.env to force a specific
 * LLM provider, resets the cached config, calls the dispatcher, then
 * restores the original env. Used by `tests/smoke-onboarding-agent.mjs`
 * to verify that a failing Mavis call falls through to the L1 rules
 * engine (the deterministic mock) instead of erroring.
 *
 * The mutation is contained to this single request handler. Next.js
 * dev mode is effectively single-threaded for our purposes, and the
 * smoke is single-threaded, so there's no race risk. The env is
 * always restored in a `finally` block.
 *
 * Body:
 *   {
 *     provider: "mavis" | "ollama",       // forced primary (mock is the fallback target)
 *     mavis?:   { apiKey, apiBase, model },  // required when provider="mavis"
 *     ollama?:  { base, model },             // required when provider="ollama"
 *     userMessage: string,                   // the prompt to send
 *   }
 *
 * Returns:
 *   {
 *     provider: "mavis" | "ollama" | "mock",     // who actually responded
 *     fellBack: boolean,                          // was the L1 fallback used?
 *     originalProvider: "mavis" | "ollama" | undefined,  // the primary that failed
 *     l1Error: string | undefined,                // the primary's error message
 *     content: string,                            // the LLM's text response
 *     toolCalls: LLMToolCall[],                   // any tool calls
 *   }
 */

import { NextRequest, NextResponse } from "next/server";
import { callLLM, resetLLMConfig } from "@/lib/llm";
import { ONBOARDING_SYSTEM_PROMPT } from "@/lib/onboarding/system-prompt";
import { ONBOARDING_TOOLS } from "@/lib/onboarding/tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RequestBody {
  provider?: "mavis" | "ollama";
  mavis?: { apiKey?: string; apiBase?: string; model?: string };
  ollama?: { base?: string; model?: string };
  userMessage?: string;
}

const ENV_KEYS = [
  "LLM_PROVIDER",
  "MAVIS_API_KEY",
  "MAVIS_API_BASE",
  "MAVIS_MODEL",
  "MAVIS_TOOL_FORMAT",
  "OLLAMA_BASE",
  "OLLAMA_MODEL",
];

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "_dev routes are disabled in production" },
      { status: 404 },
    );
  }

  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  if (
    (body.provider !== "mavis" && body.provider !== "ollama") ||
    typeof body.userMessage !== "string"
  ) {
    return NextResponse.json(
      { error: "provider must be 'mavis' or 'ollama'; userMessage is required" },
      { status: 400 },
    );
  }

  // Save current env.
  const saved: Record<string, string | undefined> = {};
  for (const k of ENV_KEYS) {
    saved[k] = process.env[k];
  }

  try {
    // Force the requested provider with the bogus creds from the body.
    if (body.provider === "mavis") {
      process.env.LLM_PROVIDER = "mavis";
      process.env.MAVIS_API_KEY = body.mavis?.apiKey ?? "sk-bogus-fallback-test";
      process.env.MAVIS_API_BASE = body.mavis?.apiBase ?? "http://127.0.0.1:1";
      process.env.MAVIS_MODEL = body.mavis?.model ?? "Mavis-3-test";
      process.env.MAVIS_TOOL_FORMAT = "openai";
    } else {
      process.env.LLM_PROVIDER = "ollama";
      process.env.OLLAMA_BASE = body.ollama?.base ?? "http://127.0.0.1:1";
      process.env.OLLAMA_MODEL = body.ollama?.model ?? "llama3.2-test";
    }
    // Force the dispatcher to re-read the env.
    resetLLMConfig();

    // Make a minimal LLM call. The primary will fail (bogus URL / key)
    // and the dispatcher should fall through to the L1 rules engine.
    const res = await callLLM({
      systemPrompt: ONBOARDING_SYSTEM_PROMPT,
      messages: [{ role: "user", content: body.userMessage }],
      tools: ONBOARDING_TOOLS,
      temperature: 0.7,
      maxTokens: 500,
    });

    return NextResponse.json({
      provider: res.provider,
      fellBack: res.meta?.fellBack === true,
      originalProvider: res.meta?.originalProvider as string | undefined,
      l1Error: res.meta?.l1Error as string | undefined,
      content: res.content,
      toolCalls: res.toolCalls.map((tc) => ({ name: tc.name, args: tc.args })),
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  } finally {
    // Always restore the original env, even if the call threw.
    for (const k of ENV_KEYS) {
      const v = saved[k];
      if (v === undefined) {
        delete process.env[k];
      } else {
        process.env[k] = v;
      }
    }
    resetLLMConfig();
  }
}

export async function GET() {
  return NextResponse.json({ error: "POST only" }, { status: 405 });
}
