import * as React from "react";
import Link from "next/link";
import { PageHead } from "@/components/alchemy/PageHead";

export const dynamic = "force-dynamic";

/**
 * Household — shared multi-user access.
 *
 * Schema is multi-user ready (every row has userId). The UI is
 * intentionally a stub: Cluster 4 ships the real implementation
 * (invitation flow, role-based access, per-member log-in).
 *
 * The page shows the schema-readiness, the UI plan, and an invite
 * link that's a no-op (so the user can see the surface).
 */
export default function HouseholdPage() {
  return (
    <div>
      <PageHead
        eyebrow="// overview · settings · household"
        title="Household"
        em="shared access, kept simple."
        accent="gold"
        actions={
          <Link
            href="/settings"
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              background: "transparent",
              color: "var(--ink-2)",
              border: "1px solid var(--line)",
              borderRadius: 2,
              padding: "10px 16px",
              fontSize: 10.5,
              fontWeight: 500,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              textDecoration: "none",
            }}
          >
            ← All settings
          </Link>
        }
        explanation={
          <>
            Add a partner or family member to the same Compass account. They see the same data with their own log-in. You keep admin control over what's shared. The schema is multi-user ready (every row carries a userId) — the invite flow and per-member access land in Cluster 4.
          </>
        }
      />

      <div
        style={{
          background: "linear-gradient(90deg, rgba(245, 158, 11, 0.10) 0%, transparent 100%)",
          border: "1px solid var(--warn)",
          borderLeft: "2px solid var(--warn)",
          borderRadius: 2,
          padding: "10px 16px",
          marginBottom: 28,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 9.5,
            fontWeight: 700,
            color: "var(--warn)",
            letterSpacing: "0.18em",
            padding: "2px 7px",
            border: "1px solid var(--warn)",
            borderRadius: 2,
          }}
        >
          [WARN] COMING SOON
        </span>
        <span
          style={{
            fontFamily: "var(--font-sora)",
            fontSize: 13,
            color: "var(--ink-2)",
          }}
        >
          The schema is ready. The UI ships in Cluster 4.
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 0,
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 4,
          marginBottom: 28,
        }}
      >
        <Stat label="members" value="1" sub="you" />
        <Stat label="invites" value="0" sub="pending" />
        <Stat label="shared" value="100%" sub="all data" accent="ok" />
      </div>

      <section
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 4,
          padding: 24,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 9.5,
            fontWeight: 600,
            color: "var(--sol)",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            marginBottom: 10,
          }}
        >
          <span style={{ color: "var(--ink-4)" }}>//</span> invite a member
        </div>
        <p
          style={{
            fontFamily: "var(--font-sora)",
            fontSize: 14,
            color: "var(--ink-2)",
            margin: "0 0 16px",
            lineHeight: 1.55,
          }}
        >
          Send an email and pick a role. Owner (you) is permanent. Member sees the same data; their changes sync. Read-only can browse but not edit.
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 160px auto",
            gap: 12,
            alignItems: "stretch",
          }}
        >
          <input
            type="email"
            placeholder="partner@example.com"
            style={{
              background: "var(--cosmos)",
              border: "1px solid var(--line)",
              borderRadius: 2,
              padding: "12px 16px",
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 13,
              color: "var(--ink)",
              outline: "none",
            }}
          />
          <select
            style={{
              background: "var(--cosmos)",
              border: "1px solid var(--line)",
              borderRadius: 2,
              padding: "12px 16px",
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 11,
              color: "var(--ink-2)",
              letterSpacing: "0.10em",
              textTransform: "uppercase",
            }}
            defaultValue="member"
          >
            <option value="member">Member</option>
            <option value="readonly">Read-only</option>
          </select>
          <button
            type="button"
            disabled
            title="Coming in Cluster 4"
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              background: "var(--ink-3)",
              color: "var(--void)",
              border: 0,
              borderRadius: 2,
              padding: "12px 22px",
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              cursor: "not-allowed",
            }}
          >
            Send invite
          </button>
        </div>
      </section>

      <section
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderLeft: "2px solid var(--mercury)",
          borderRadius: 3,
          padding: 20,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 9.5,
            fontWeight: 600,
            color: "var(--mercury)",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          <span style={{ color: "var(--ink-4)" }}>//</span> schema is multi-user ready
        </div>
        <p
          style={{
            fontFamily: "var(--font-sora)",
            fontSize: 13.5,
            color: "var(--ink-2)",
            margin: 0,
            lineHeight: 1.55,
          }}
        >
          Every table carries a userId foreign key. Sessions are per-user. When you invite a second person, their log-in scope is their own household, your household is the one they're invited into. No data migration when Cluster 4 ships.
        </p>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: "warn" | "ok";
}) {
  return (
    <div
      style={{
        padding: "20px 24px",
        borderRight: "1px solid var(--line-soft)",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 9.5,
          fontWeight: 600,
          color: "var(--ink-3)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          marginBottom: 6,
        }}
      >
        <span style={{ color: "var(--ink-4)" }}>//</span> {label}
      </div>
      <div
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 26,
          fontWeight: 600,
          color:
            accent === "warn"
              ? "var(--warn)"
              : accent === "ok"
              ? "var(--ok)"
              : "var(--ink)",
          fontFeatureSettings: '"tnum" 1, "zero" 1',
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 10.5,
          color: "var(--ink-3)",
          marginTop: 4,
          letterSpacing: "0.04em",
        }}
      >
        {sub}
      </div>
    </div>
  );
}
