/**
 * ProviderBanner — the LLM-provider indicator + fallback warning.
 *
 * Cluster 5.1. Shows which LLM is driving the conversation
 * (mavis / ollama / mock) and surfaces the L1 rules fallback
 * when the primary provider (Mavis / Ollama) errored and the
 * deterministic mock engine answered instead.
 *
 * Visual states:
 *   - fellBack=true   — vessel-watch orange "WARN" banner with
 *                       a short reason and a "fallback engine" pill
 *   - provider=mock   — small "[OK] mock · L1 rules" pill in
 *                       vessel-border (informational; the user
 *                       doesn't need to act)
 *   - provider=mavis  — green "[OK] mavis · cfp-grade" pill
 *   - provider=ollama — green "[OK] ollama · local" pill
 *
 * The banner sits below the ProgressRail and above the chat.
 * It's static (no client interactions); the chat's own state
 * updates after each turn will re-render the page and pick up
 * new provider / fellBack values.
 */

export function ProviderBanner({
  provider,
  fellBack,
  fallbackError,
}: {
  provider: "mavis" | "ollama" | "mock" | null;
  fellBack: boolean;
  fallbackError: string | null;
}) {
  if (fellBack) {
    return (
      <div
        role="status"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 32px",
          background: "rgba(249, 115, 22, 0.08)",
          borderBottom: "1px solid var(--vessel-watch)",
          color: "var(--ink-1, #f5f7fa)",
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 12,
          letterSpacing: "0.04em",
        }}
      >
        <span
          style={{
            background: "var(--vessel-watch)",
            color: "var(--vessel-dark)",
            padding: "3px 8px",
            borderRadius: 3,
            fontWeight: 700,
            fontSize: 11,
            letterSpacing: "0.1em",
          }}
        >
          [WARN]
        </span>
        <span>
          We had trouble reaching the primary advisor; Compass is using the L1 backup engine for this turn. You can keep going.
        </span>
        {fallbackError ? (
          <span
            style={{
              marginLeft: "auto",
              color: "var(--ink-3, #a4b1c2)",
              fontSize: 11,
              maxWidth: 360,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={fallbackError}
          >
            reason: {fallbackError}
          </span>
        ) : null}
      </div>
    );
  }
  if (!provider) return null;
  const labels: Record<typeof provider, string> = {
    mavis: "mavis · cfp-grade",
    ollama: "ollama · local",
    mock: "mock · L1 rules",
  };
  const isMock = provider === "mock";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "8px 32px",
        borderBottom: "1px solid var(--vessel-border)",
        background: "var(--vessel-dark)",
        color: "var(--ink-3, #a4b1c2)",
        fontFamily: "var(--font-jetbrains), monospace",
        fontSize: 11,
        letterSpacing: "0.08em",
      }}
    >
      <span
        style={{
          background: isMock ? "transparent" : "var(--vessel-accent-soft)",
          color: isMock ? "var(--ink-3, #a4b1c2)" : "var(--vessel-accent)",
          border: isMock ? "1px solid var(--vessel-border)" : "1px solid var(--vessel-accent)",
          padding: "3px 8px",
          borderRadius: 3,
          fontWeight: 700,
          fontSize: 10,
          letterSpacing: "0.1em",
        }}
      >
        {isMock ? "[NEUTRAL]" : "[OK]"}
      </span>
      <span>
        advisor: <span style={{ color: "var(--ink-1, #f5f7fa)" }}>{labels[provider]}</span>
      </span>
    </div>
  );
}
