"use client";

/**
 * AdvisorChatSurface — the chat UI for /advisor.
 *
 * Cluster 5.3. Simpler than the onboarding ChatSurface (no
 * milestones, no demo button, no audit-complete state). One input
 * field, one message stream, the provider banner at the top.
 *
 * Key UX:
 *   - User messages right-aligned with vessel-accent background.
 *   - Assistant messages left-aligned with vessel-surface background.
 *   - The empty state shows suggested starter questions the user
 *     can click to kick off the conversation.
 *   - On a 409 ("onboarding incomplete"), the surface renders a
 *     "Finish onboarding" panel with a link to /onboarding.
 *   - On any other error, a small error line above the input.
 *   - Submitting a message: textarea on Enter, Shift+Enter for
 *     newline, button "send" on click. Disabled while pending.
 *   - Auto-scrolls to the bottom on new messages.
 *   - The provider banner (showing fallback state) sits at the top
 *     and is read from the state — the server renders it on
 *     initial load, the client updates it after each turn.
 *
 * The component is "use client" because it manages local state.
 * The initial state comes from the server-rendered page.
 */

import { useEffect, useRef, useState, useTransition } from "react";
import type { OnboardingState } from "@/lib/onboarding/state";
import { ProviderBanner } from "@/components/onboarding/ProviderBanner";

interface AdvisorChatSurfaceProps {
  initialState: OnboardingState;
}

interface RunAdvisorResult {
  agentMessage: string;
  state: OnboardingState;
  provider: "mavis" | "ollama" | "mock";
  fellBack: boolean;
  fallbackError: string | null;
}

interface ErrorResult {
  error: string;
  message?: string;
  redirectTo?: string;
}

const STARTER_QUESTIONS: Array<{ label: string; prompt: string }> = [
  {
    label: "Can I afford a $5,000 trip next June?",
    prompt: "I'm thinking about taking a $5,000 trip next June. Based on my numbers, can I afford it without wrecking my goals?",
  },
  {
    label: "Which debt should I pay off first?",
    prompt: "If I have $200 a month to put toward debt, which of my debts should I tackle first?",
  },
  {
    label: "Am I on track for retirement?",
    prompt: "Based on my age, my retirement assets, and what I'm putting in each paycheck, am I on track to retire comfortably?",
  },
  {
    label: "How much can I safely spend this month?",
    prompt: "How much can I safely spend between now and my next paycheck, after the bills and the goals?",
  },
];

export function AdvisorChatSurface({ initialState }: AdvisorChatSurfaceProps) {
  const [state, setState] = useState<OnboardingState>(initialState);
  const [input, setInput] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<{ message: string; redirectTo?: string } | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll on new messages.
  useEffect(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [state.messages.length]);

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
        const res = await fetch("/api/advisor/run", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ userMessage: trimmed }),
        });
        if (res.status === 409) {
          const data = (await res.json()) as ErrorResult;
          setError({
            message: data.message ?? data.error ?? "Onboarding incomplete.",
            redirectTo: data.redirectTo,
          });
          return;
        }
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `HTTP ${res.status}`);
        }
        const result: RunAdvisorResult = await res.json();
        setState(result.state);
        setInput("");
      } catch (e) {
        setError({ message: e instanceof Error ? e.message : String(e) });
      }
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  function handleStarterClick(prompt: string) {
    sendMessage(prompt);
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
        background: "var(--vessel-dark)",
        color: "var(--ink-1, #f5f7fa)",
      }}
    >
      <ProviderBanner
        provider={state.lastProvider}
        fellBack={state.lastFellBack}
        fallbackError={state.lastErrorMessage}
      />

      <div
        ref={scrollerRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "32px 24px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {state.messages.length === 0 ? (
          <EmptyState onClick={handleStarterClick} disabled={pending} />
        ) : (
          state.messages
            // Skip the system + tool messages — the advisor is
            // single-round, so the visible stream is user +
            // assistant only. Defensive filter in case a future
            // change adds tool rounds.
            .filter((m) => m.role === "user" || m.role === "assistant")
            .map((m, i) => <MessageBubble key={i} role={m.role} content={m.content} />)
        )}
      </div>

      {error && (
        <div
          style={{
            margin: "0 24px 8px",
            padding: "12px 16px",
            background: "rgba(239, 68, 68, 0.08)",
            border: "1px solid var(--vessel-over, #ef4444)",
            borderRadius: 2,
            color: "var(--ink-1, #f5f7fa)",
            fontSize: 12.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <span>{error.message}</span>
          {error.redirectTo && (
            <a
              href={error.redirectTo}
              style={{
                background: "var(--vessel-accent, #a855f7)",
                color: "var(--void, #0a0712)",
                padding: "6px 14px",
                borderRadius: 2,
                textDecoration: "none",
                fontWeight: 700,
                fontSize: 10.5,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                fontFamily: "var(--font-jetbrains, monospace)",
                whiteSpace: "nowrap",
              }}
            >
              Finish onboarding →
            </a>
          )}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage(input);
        }}
        style={{
          padding: "16px 24px 24px",
          borderTop: "1px solid var(--vessel-border, #2d243d)",
          background: "var(--vessel-dark)",
          display: "flex",
          gap: 12,
          alignItems: "flex-end",
        }}
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={pending}
          rows={3}
          placeholder="Ask anything about your money…  (Enter to send, Shift+Enter for newline)"
          style={{
            flex: 1,
            background: "var(--vessel-surface, #1c1726)",
            border: "1px solid var(--vessel-border, #2d243d)",
            borderRadius: 4,
            padding: "12px 16px",
            color: "var(--ink-1, #f5f7fa)",
            fontFamily: "var(--font-sora, sans-serif)",
            fontSize: 14,
            resize: "vertical",
            minHeight: 60,
            maxHeight: 200,
            outline: "none",
          }}
        />
        <button
          type="submit"
          disabled={pending || input.trim() === ""}
          style={{
            background:
              pending || input.trim() === ""
                ? "var(--vessel-border, #2d243d)"
                : "var(--vessel-accent, #a855f7)",
            color:
              pending || input.trim() === ""
                ? "var(--ink-4, #6b6b80)"
                : "var(--void, #0a0712)",
            border: 0,
            borderRadius: 2,
            padding: "12px 22px",
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            fontFamily: "var(--font-jetbrains, monospace)",
            cursor: pending || input.trim() === "" ? "not-allowed" : "pointer",
            boxShadow:
              pending || input.trim() === ""
                ? "none"
                : "0 0 16px rgba(168, 85, 247, 0.3)",
            whiteSpace: "nowrap",
            alignSelf: "flex-end",
          }}
        >
          {pending ? "Asking…" : "Send"}
        </button>
      </form>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────
// Empty state — 4 starter questions the user can click to kick off
// the conversation. No LLM call yet, just a click → fill input +
// submit. (handleStarterClick calls sendMessage which does the POST.)
// ───────────────────────────────────────────────────────────────────────

function EmptyState({
  onClick,
  disabled,
}: {
  onClick: (prompt: string) => void;
  disabled: boolean;
}) {
  return (
    <div
      style={{
        maxWidth: 720,
        margin: "32px auto 0",
        display: "flex",
        flexDirection: "column",
        gap: 24,
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-jetbrains, monospace)",
          fontSize: 10.5,
          fontWeight: 600,
          color: "var(--vessel-accent, #a855f7)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
        }}
      >
        <span style={{ color: "var(--ink-4, #6b6b80)" }}>//</span> Ask the advisor
      </div>
      <h2
        style={{
          fontFamily: "var(--font-sora, sans-serif)",
          fontSize: 24,
          fontWeight: 500,
          color: "var(--ink-1, #f5f7fa)",
          margin: 0,
          letterSpacing: "-0.01em",
        }}
      >
        What's on your mind?
      </h2>
      <p
        style={{
          fontFamily: "var(--font-sora, sans-serif)",
          fontSize: 14,
          color: "var(--ink-3, #9ca3af)",
          margin: 0,
          lineHeight: 1.55,
        }}
      >
        The advisor sees your full identity — income, debts, goals, risk profile — and answers questions about your money. No jargon, no sales pitches. Specific to your numbers, or "I don't have that — want to tell me?" if a field's missing.
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 12,
          marginTop: 8,
        }}
      >
        {STARTER_QUESTIONS.map((q) => (
          <button
            key={q.label}
            type="button"
            disabled={disabled}
            onClick={() => onClick(q.prompt)}
            style={{
              background: "var(--vessel-surface, #1c1726)",
              border: "1px solid var(--vessel-border, #2d243d)",
              borderRadius: 4,
              padding: "14px 16px",
              color: "var(--ink-1, #f5f7fa)",
              fontFamily: "var(--font-sora, sans-serif)",
              fontSize: 13,
              textAlign: "left",
              cursor: disabled ? "not-allowed" : "pointer",
              transition: "border-color 120ms",
            }}
            onMouseEnter={(e) => {
              if (!disabled) e.currentTarget.style.borderColor = "var(--vessel-accent, #a855f7)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--vessel-border, #2d243d)";
            }}
          >
            {q.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────
// MessageBubble — the per-message row.
// ───────────────────────────────────────────────────────────────────────

function MessageBubble({ role, content }: { role: "user" | "assistant"; content: string }) {
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
          maxWidth: 720,
          background: isUser
            ? "var(--vessel-accent, #a855f7)"
            : "var(--vessel-surface, #1c1726)",
          color: isUser ? "var(--void, #0a0712)" : "var(--ink-1, #f5f7fa)",
          border: isUser ? 0 : "1px solid var(--vessel-border, #2d243d)",
          borderRadius: 4,
          padding: "12px 16px",
          fontFamily: "var(--font-sora, sans-serif)",
          fontSize: 14,
          lineHeight: 1.55,
          whiteSpace: "pre-wrap",
          wordWrap: "break-word",
        }}
      >
        {content}
      </div>
    </div>
  );
}
