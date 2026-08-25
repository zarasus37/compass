import * as React from "react";
import Link from "next/link";
import { PageHead } from "@/components/alchemy/PageHead";
import { ResetSeedButton } from "@/components/settings/ResetSeedButton";

export const dynamic = "force-dynamic";

/**
 * Settings — the central index for the System chrome.
 *
 * Cluster 4.0 (xKryptic 2026-08-25): the System chapter is no
 * longer a sidebar entry — it lives behind the gear icon in the
 * top bar. This hub is what's behind the gear: the four utility
 * surfaces that aren't daily navigation.
 *
 *   01  Multi-Bank     (Plaid sandbox)
 *   02  Smart Categorize (rules engine)
 *   03  Receipt Scan   (OCR fallback)
 *   04  Household      (multi-user stub)
 *
 * Subscriptions and Habit Quiz used to live here; they moved to
 * `// Ledger · Obligations` and `// Learn · Habit Quiz`
 * respectively.
 */
export default function SettingsPage() {
  return (
    <div>
      <PageHead
        eyebrow="// system · settings"
        title="The Controls"
        em="the things that make Compass yours."
        accent="cyan"
        explanation={
          <>
            The utilities that don't fit on a dashboard card. Bank connections, scan / categorize tools, household access. Most preferences (theme, dashboard cards) live on the dashboard itself — this page is for the heavier surfaces.
          </>
        }
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 0,
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 4,
        }}
      >
        <SettingsRow
          num="01"
          name="Multi-Bank"
          href="/settings/plaid"
          glyph="⌬"
          accent="var(--mercury)"
          tag="[OK] SANDBOX"
          caption="Connect a real bank via Plaid. Compass auto-syncs balances, transactions, and account metadata. v1 ships the Plaid sandbox — the OAuth link and a few mock institutions."
        />
        <SettingsRow
          num="02"
          name="Smart Categorize"
          href="/settings/categorize"
          glyph="✦"
          accent="var(--terminal-cyan)"
          tag="[OK] RULES"
          caption="Tell Compass how you tag each merchant. The rules engine runs on every new transaction. Edit anytime; rules are versioned per vessel."
        />
        <SettingsRow
          num="03"
          name="Receipt Scan"
          href="/settings/receipt-scan"
          glyph="⎙"
          accent="var(--venus)"
          tag="[WARN] OCR PREP"
          caption="Snap a paper receipt, paste the text, and Compass parses merchant, total, and date. Camera OCR lands in v2 — for now the paste-text fallback is fully wired."
        />
        <SettingsRow
          num="04"
          name="Household"
          href="/settings/household"
          glyph="◊"
          accent="var(--sol)"
          tag="[WARN] COMING SOON"
          caption="Add a partner or family member to the same Compass account. They see the same data with their own log-in. Schema is multi-user ready; UI lands in Cluster 4."
        />
      </div>

      <ResetSeedButton />
    </div>
  );
}

function SettingsRow({
  num,
  name,
  href,
  glyph,
  accent,
  tag,
  caption,
}: {
  num: string;
  name: string;
  href: string;
  glyph: string;
  accent: string;
  tag: string;
  caption: string;
}) {
  return (
    <Link
      href={href}
      className="settings-row-link"
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        alignItems: "center",
        gap: 20,
        padding: "22px 26px",
        borderBottom: "1px solid var(--line-soft)",
        borderRight: "1px solid var(--line-soft)",
        textDecoration: "none",
        color: "inherit",
        transition: "background 140ms",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 10,
          color: "var(--ink-4)",
          letterSpacing: "0.18em",
        }}
      >
        {num}
      </div>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 4,
          }}
        >
          <span aria-hidden style={{ color: accent, fontSize: 16 }}>
            {glyph}
          </span>
          <span
            style={{
              fontFamily: "var(--font-sora)",
              fontSize: 17,
              fontWeight: 600,
              color: "var(--ink)",
            }}
          >
            {name}
          </span>
          <span
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 9.5,
              fontWeight: 700,
              color: tag.includes("[WARN]") ? "var(--warn)" : "var(--ok)",
              letterSpacing: "0.14em",
              padding: "2px 7px",
              border: `1px solid ${tag.includes("[WARN]") ? "var(--warn)" : "var(--ok)"}`,
              borderRadius: 2,
              marginLeft: 4,
            }}
          >
            {tag}
          </span>
        </div>
        <p
          style={{
            fontFamily: "var(--font-sora)",
            fontSize: 13.5,
            color: "var(--ink-3)",
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          {caption}
        </p>
      </div>
      <div
        aria-hidden
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 18,
          color: "var(--ink-4)",
          flexShrink: 0,
        }}
      >
        ›
      </div>
    </Link>
  );
}
