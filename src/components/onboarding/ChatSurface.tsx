"use client";

/**
 * ChatSurface — the main chat UI for /onboarding.
 *
 * Cluster 5.1. Renders the conversation history (user + assistant
 * + tool calls), accepts new user input, and POSTs to the production
 * /api/onboarding/run route. After each turn the new state is
 * merged into the local state and the message list re-renders.
 *
 * Key UX:
 *   - User messages right-aligned with vessel-accent background.
 *   - Assistant messages left-aligned with vessel-surface background.
 *   - Tool calls collapsed under a "saved income source" line —
 *     mom doesn't need to see the raw tool shape.
 *   - When markOnboardingComplete fires, the chat shows a
 *     "your audit is ready" panel with a "Go to dashboard" CTA
 *     + a "Start over" link (server action that wipes the identity).
 *   - Submitting a message: textarea on Enter, Shift+Enter for
 *     newline, button "send" on click. Disabled while pending.
 *   - Auto-scrolls to the bottom on new messages.
 *
 * The component is "use client" because it manages local state.
 * The initial state comes from the server-rendered page.
 */

import { useEffect, useRef, useState, useTransition } from "react";
import type { OnboardingState } from "@/lib/onboarding/state";
import type { Milestone, MilestoneStatus } from "./ProgressRail";

interface ChatSurfaceProps {
  initialState: OnboardingState;
  milestones: Milestone[];
}

interface RunAgentResult {
  agentMessage: string;
  toolCalls: Array<{
    name: string;
    args: Record<string, unknown>;
    result: { ok: boolean; message: string; [key: string]: unknown } | { ok: false; error: string };
  }>;
  state: OnboardingState;
  rounds: number;
  provider: "mavis" | "ollama" | "mock";
  fellBack: boolean;
  fallbackError: string | null;
  onboardingCompleted: boolean;
}

export function ChatSurface({ initialState }: ChatSurfaceProps) {
  const [state, setState] = useState<OnboardingState>(initialState);
  const [input, setInput] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-scroll on new messages.
  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [state.messages.length, state.audit != null]);

  // Focus the input on first render (not after every state change).
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || pending) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/onboarding/run", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ userMessage: trimmed }),
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `HTTP ${res.status}`);
        }
        const result: RunAgentResult = await res.json();
        setState(result.state);
        setInput("");
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  const isComplete = state.completedAt != null;
  const lastAssistant = [...state.messages]
    .reverse()
    .find((m) => m.role === "assistant" && m.content);
  // The greeting on first load — the user hasn't sent anything yet,
  // so show the agent's first prompt as a welcome line.
  const greeting = isComplete
    ? null
    : lastAssistant && state.messages.length <= 1
      ? lastAssistant
      : null;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateRows: "1fr auto",
        height: "100%",
        minHeight: 0,
        maxWidth: 920,
        width: "100%",
        margin: "0 auto",
      }}
    >
      <div
        ref={scrollerRef}
        style={{
          overflowY: "auto",
          padding: "32px 24px 24px",
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        {/* Greeting — shown on first load before the user has spoken. */}
        {greeting ? <MessageBubble role="assistant" content={greeting.content} isFirst /> : null}

        {/* The conversation. Skip the assistant's greeting (rendered above)
            so we don't double-print. We track the message index to detect
            "first assistant message that has content" and skip it. */}
        <ConversationLog state={state} skipFirstAssistant={greeting != null} />

        {/* Completion panel — replaces the input affordance. */}
        {isComplete ? <CompletionPanel state={state} /> : null}

        {/* Error banner. */}
        {error ? (
          <div
            role="alert"
            style={{
              padding: "12px 16px",
              border: "1px solid var(--vessel-over)",
              borderRadius: 6,
              background: "rgba(239, 68, 68, 0.08)",
              color: "var(--ink-1, #f5f7fa)",
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 12,
            }}
          >
            [ERR] {error}
          </div>
        ) : null}
      </div>

      {/* Input — only when not complete. */}
      {!isComplete ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage(input);
          }}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: 12,
            padding: "16px 24px 24px",
            borderTop: "1px solid var(--vessel-border)",
            background: "var(--vessel-dark)",
            alignItems: "end",
          }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tell the advisor about your money…"
            disabled={pending}
            rows={1}
            style={{
              width: "100%",
              minHeight: 44,
              maxHeight: 160,
              resize: "none",
              padding: "10px 14px",
              background: "var(--vessel-surface)",
              color: "var(--ink-1, #f5f7fa)",
              border: "1px solid var(--vessel-border)",
              borderRadius: 6,
              fontFamily: "var(--font-sora)",
              fontSize: 15,
              lineHeight: 1.5,
              outline: "none",
            }}
          />
          <button
            type="submit"
            disabled={pending || input.trim() === ""}
            style={{
              padding: "10px 22px",
              background:
                pending || input.trim() === ""
                  ? "var(--vessel-surface)"
                  : "var(--vessel-accent)",
              color:
                pending || input.trim() === ""
                  ? "var(--ink-3, #a4b1c2)"
                  : "var(--vessel-dark)",
              border: "1px solid var(--vessel-accent)",
              borderRadius: 6,
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              cursor: pending || input.trim() === "" ? "default" : "pointer",
              opacity: pending ? 0.7 : 1,
              minWidth: 84,
            }}
          >
            {pending ? "…" : "send"}
          </button>
        </form>
      ) : null}
    </div>
  );
}

function ConversationLog({
  state,
  skipFirstAssistant,
}: {
  state: OnboardingState;
  skipFirstAssistant: boolean;
}) {
  // Walk the message log and render each turn. We need to fold
  // assistant message + its tool messages into a single "turn"
  // for display purposes. The simplest rendering: each message
  // gets its own row. Assistant tool calls render under the
  // assistant message as small chips.
  const messages = state.messages;
  let skippedFirstAssistant = false;
  return (
    <>
      {messages.map((m, i) => {
        if (m.role === "user") {
          return <MessageBubble key={i} role="user" content={m.content} />;
        }
        if (m.role === "assistant") {
          const isFirstGreeting =
            !skippedFirstAssistant &&
            skipFirstAssistant &&
            m.content &&
            m.toolCalls == null;
          if (isFirstGreeting) {
            skippedFirstAssistant = true;
            return null;
          }
          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <MessageBubble role="assistant" content={m.content} />
              {m.toolCalls && m.toolCalls.length > 0 ? (
                <ToolChips toolCalls={m.toolCalls} />
              ) : null}
            </div>
          );
        }
        // tool messages are folded into the assistant turn above.
        return null;
      })}
    </>
  );
}

function MessageBubble({
  role,
  content,
  isFirst,
}: {
  role: "user" | "assistant";
  content: string;
  isFirst?: boolean;
}) {
  if (!content) return null;
  const isUser = role === "user";
  return (
    <div
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
      }}
    >
      <div
        style={{
          maxWidth: "78%",
          padding: "12px 16px",
          borderRadius: 10,
          background: isUser ? "var(--vessel-accent)" : "var(--vessel-surface)",
          color: isUser ? "var(--vessel-dark)" : "var(--ink-1, #f5f7fa)",
          border: isUser
            ? "1px solid var(--vessel-accent)"
            : "1px solid var(--vessel-border)",
          fontFamily: "var(--font-sora)",
          fontSize: 15,
          lineHeight: 1.55,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {isFirst ? (
          <div
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 10,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: isUser ? "var(--vessel-dark)" : "var(--vessel-accent)",
              marginBottom: 6,
              opacity: 0.8,
            }}
          >
            // advisor
          </div>
        ) : null}
        {content}
      </div>
    </div>
  );
}

function ToolChips({ toolCalls }: { toolCalls: Array<{ name: string; args: Record<string, unknown>; result?: unknown }> }) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 6,
        marginLeft: 4,
      }}
    >
      {toolCalls.map((tc, i) => {
        const result = tc.result as { ok?: boolean; message?: string } | undefined;
        const message =
          result && typeof result === "object" && "message" in result
            ? String(result.message ?? "")
            : `${tc.name}`;
        return (
          <span
            key={i}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px",
              background: "var(--vessel-dark)",
              border: "1px solid var(--vessel-border)",
              borderRadius: 9999,
              color: "var(--ink-2, #c8d1dd)",
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 11,
              letterSpacing: "0.04em",
            }}
            title={`Tool call: ${tc.name}\nArgs: ${JSON.stringify(tc.args, null, 2)}`}
          >
            <span style={{ color: "var(--vessel-accent)" }}>●</span>
            <span style={{ color: "var(--ink-3, #a4b1c2)" }}>{tc.name}</span>
            <span style={{ color: "var(--ink-2, #c8d1dd)" }}>·</span>
            <span>{message}</span>
          </span>
        );
      })}
    </div>
  );
}

function CompletionPanel({ state }: { state: OnboardingState }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        padding: "24px 28px",
        background: "var(--vessel-surface)",
        border: "1px solid var(--vessel-accent)",
        borderRadius: 10,
        boxShadow: "var(--vessel-neon-glow)",
        marginTop: 8,
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 11,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--vessel-accent)",
        }}
      >
        [OK] audit ready
      </div>
      <h2
        style={{
          margin: 0,
          fontFamily: "var(--font-sora)",
          fontSize: 22,
          fontWeight: 600,
          color: "var(--ink-1, #f5f7fa)",
        }}
      >
        Your financial picture is on the dashboard.
      </h2>
      {state.audit ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <AuditField label="Identity" value={state.audit.identity} />
          <AuditField label="First step" value={state.audit.firstStep} highlight />
          {state.audit.findings ? (
            <AuditField label="Findings" value={state.audit.findings} />
          ) : null}
        </div>
      ) : null}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginTop: 6,
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 12,
        }}
      >
        <a
          href="/"
          style={{
            display: "inline-block",
            padding: "10px 22px",
            background: "var(--vessel-accent)",
            color: "var(--vessel-dark)",
            textDecoration: "none",
            border: "1px solid var(--vessel-accent)",
            borderRadius: 6,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          Go to dashboard
        </a>
        <form action="/api/onboarding/reset" method="post">
          <button
            type="submit"
            style={{
              padding: "10px 22px",
              background: "transparent",
              color: "var(--ink-2, #c8d1dd)",
              border: "1px solid var(--vessel-border)",
              borderRadius: 6,
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Start over
          </button>
        </form>
      </div>
      <p
        style={{
          margin: "12px 0 0",
          fontFamily: "var(--font-sora)",
          fontSize: 13,
          color: "var(--ink-3, #a4b1c2)",
          lineHeight: 1.55,
        }}
      >
        Your financial data stays on this device after this conversation ends. The advisor
        doesn't keep a copy — what you told it lives only in your Compass database.
      </p>
    </div>
  );
}

function AuditField({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <div
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 10,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--ink-3, #a4b1c2)",
          marginBottom: 4,
        }}
      >
        // {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-sora)",
          fontSize: highlight ? 16 : 14,
          fontWeight: highlight ? 600 : 400,
          color: highlight ? "var(--ink-1, #f5f7fa)" : "var(--ink-2, #c8d1dd)",
          lineHeight: 1.55,
          whiteSpace: "pre-wrap",
        }}
      >
        {value}
      </div>
    </div>
  );
}
