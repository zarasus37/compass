/**
 * ProgressRail — the 8-milestone indicator at the top of the chat.
 *
 * Cluster 5.1. Shows the user where they are in the conversation.
 * The 8 milestones map to the 8 core tool calls the agent makes:
 *   identity → income → expenses → debts → assets → goals → risk → done
 *
 * Visual states:
 *   - done (past)   — filled vessel-accent dot, label in ink-1
 *   - current       — pulsing vessel-accent outline, label in vessel-accent
 *   - upcoming      — hollow vessel-border dot, label in ink-3
 *
 * Computed server-side from the persisted state (counts distinct
 * tool calls in the message log). The component is presentational;
 * the page.tsx server component derives the milestone statuses
 * and passes them in as props.
 */

export type MilestoneStatus = "done" | "current" | "upcoming";

export interface Milestone {
  key: string;
  label: string;
  status: MilestoneStatus;
}

export function ProgressRail({ milestones }: { milestones: Milestone[] }) {
  return (
    <nav
      aria-label="Onboarding progress"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 0,
        padding: "20px 32px",
        borderBottom: "1px solid var(--vessel-border)",
        background: "var(--vessel-dark)",
        overflowX: "auto",
      }}
    >
      {milestones.map((m, i) => (
        <div
          key={m.key}
          style={{
            display: "flex",
            alignItems: "center",
            flex: i < milestones.length - 1 ? "1 1 0" : "0 0 auto",
            minWidth: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              minWidth: 0,
              padding: "6px 4px",
            }}
          >
            <MilestoneDot status={m.status} />
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 2,
                minWidth: 0,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-jetbrains), monospace",
                  fontSize: 10,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color:
                    m.status === "upcoming"
                      ? "var(--ink-3, #a4b1c2)"
                      : m.status === "current"
                        ? "var(--vessel-accent)"
                        : "var(--ink-3, #a4b1c2)",
                }}
              >
                step {String(i + 1).padStart(2, "0")}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-sora)",
                  fontSize: 13,
                  fontWeight: m.status === "current" ? 600 : 500,
                  color:
                    m.status === "upcoming"
                      ? "var(--ink-3, #a4b1c2)"
                      : m.status === "current"
                        ? "var(--ink-1, #f5f7fa)"
                        : "var(--ink-1, #f5f7fa)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {m.label}
              </span>
            </div>
          </div>
          {i < milestones.length - 1 ? (
            <div
              aria-hidden
              style={{
                flex: 1,
                height: 1,
                background:
                  m.status === "done" ? "var(--vessel-accent)" : "var(--vessel-border)",
                margin: "0 12px",
                minWidth: 12,
                opacity: m.status === "done" ? 0.7 : 0.5,
              }}
            />
          ) : null}
        </div>
      ))}
    </nav>
  );
}

function MilestoneDot({ status }: { status: MilestoneStatus }) {
  if (status === "done") {
    return (
      <span
        aria-hidden
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 22,
          height: 22,
          borderRadius: 9999,
          background: "var(--vessel-accent)",
          color: "var(--vessel-dark)",
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 11,
          fontWeight: 700,
        }}
      >
        ✓
      </span>
    );
  }
  if (status === "current") {
    return (
      <span
        aria-hidden
        style={{
          display: "inline-block",
          width: 22,
          height: 22,
          borderRadius: 9999,
          border: "2px solid var(--vessel-accent)",
          background: "var(--vessel-dark)",
          boxShadow: "var(--vessel-neon-glow)",
          animation: "vessel-pulse 2.4s ease-in-out infinite",
        }}
      />
    );
  }
  return (
    <span
      aria-hidden
      style={{
        display: "inline-block",
        width: 22,
        height: 22,
        borderRadius: 9999,
        border: "1px solid var(--vessel-border)",
        background: "var(--vessel-dark)",
      }}
    />
  );
}
