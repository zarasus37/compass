"use client";

/**
 * GlossaryIndex — searchable, chapter-grouped term grid.
 *
 * Client component for the `// Learn · Glossary` page (Cluster 4.1).
 * The 12 terms are passed in as props from the page (server component
 * reads them at build time so the data is fully typed and easy to
 * extend). The search box filters in the browser; chapter sections
 * stay visible at all times (the matching terms within a chapter
 * dim when they don't match, so the user can see the structure of
 * the vocabulary while searching).
 *
 * "Where it shows up" — each term has 1–3 in-app deep links. The
 * glossary doubles as a navigator: type a term, see where it lives.
 *
 * Cluster 4.1 (xKryptic 2026-08-25).
 */

import * as React from "react";

export type GlossaryChapter = "overview" | "ledger" | "aims";

export interface GlossaryEntry {
  /** Stable id (used as anchor + React key). */
  id: string;
  /** The term itself. */
  term: string;
  /** Chapter the term belongs to. */
  chapter: GlossaryChapter;
  /** One-paragraph definition (Sora body, mom-grade). */
  body: React.ReactNode;
  /** Deep links to where the term shows up in the app. */
  seeAlso: { href: string; label: string }[];
  /** Optional ids of related terms. */
  related?: string[];
}

const CHAPTER_META: Record<
  GlossaryChapter,
  { label: string; title: string; em: string; count: number }
> = {
  overview: {
    label: "// overview",
    title: "The current state.",
    em: "terms you'll see on the dashboard and the lenses that read it.",
    count: 4,
  },
  ledger: {
    label: "// ledger",
    title: "The mechanics.",
    em: "where money sits, where it goes, and the rules that move it.",
    count: 7,
  },
  aims: {
    label: "// aims",
    title: "The targets.",
    em: "money with a purpose attached — the things you're saving for.",
    count: 1,
  },
};

export function GlossaryIndex({ entries }: { entries: GlossaryEntry[] }) {
  const [query, setQuery] = React.useState("");

  const normalized = query.trim().toLowerCase();

  // Group entries by chapter in canonical order.
  const chapters: GlossaryChapter[] = ["overview", "ledger", "aims"];
  const byChapter = React.useMemo(() => {
    const m: Record<GlossaryChapter, GlossaryEntry[]> = {
      overview: [],
      ledger: [],
      aims: [],
    };
    for (const e of entries) m[e.chapter].push(e);
    return m;
  }, [entries]);

  // Count how many terms match across all chapters.
  const matchCount = normalized
    ? entries.filter((e) => matches(e, normalized)).length
    : entries.length;

  return (
    <div>
      {/* Search box */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 4,
          padding: "14px 18px",
          marginBottom: 28,
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <span
          aria-hidden
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 11,
            fontWeight: 700,
            color: "var(--terminal-cyan)",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}
        >
          // SEARCH
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter terms — e.g. 'envelope', 'pace', 'auto-allocate'…"
          aria-label="Filter glossary terms"
          style={{
            flex: 1,
            background: "transparent",
            border: 0,
            outline: "none",
            color: "var(--ink)",
            fontFamily: "var(--font-sora)",
            fontSize: 15,
            padding: "4px 0",
          }}
        />
        <span
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 10,
            fontWeight: 600,
            color: "var(--ink-3)",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}
        >
          {matchCount} of {entries.length}
        </span>
      </div>

      {/* Empty search state */}
      {normalized && matchCount === 0 && (
        <div
          style={{
            padding: "40px 32px",
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderLeft: "2px solid var(--warn)",
            borderRadius: 4,
            textAlign: "center",
            marginBottom: 32,
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 10,
              fontWeight: 600,
              color: "var(--warn)",
              letterSpacing: "0.20em",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            // NO MATCH
          </div>
          <p
            style={{
              fontFamily: "var(--font-sora)",
              fontSize: 15,
              color: "var(--ink-3)",
              margin: 0,
            }}
          >
            No terms match "{query}". Try a different word, or browse the
            chapters below.
          </p>
        </div>
      )}

      {/* Chapter sections */}
      {chapters.map((ch) => {
        const items = byChapter[ch];
        const visible = normalized
          ? items.filter((e) => matches(e, normalized))
          : items;
        if (normalized && visible.length === 0) return null;
        const meta = CHAPTER_META[ch];

        return (
          <section
            key={ch}
            id={ch}
            style={{
              marginBottom: 48,
              paddingBottom: 8,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "space-between",
                marginBottom: 6,
              }}
            >
              <div
                style={{
                  fontFamily: "var(--font-jetbrains), monospace",
                  fontSize: 10,
                  fontWeight: 600,
                  color: "var(--terminal-cyan)",
                  letterSpacing: "0.20em",
                  textTransform: "uppercase",
                }}
              >
                {meta.label}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-jetbrains), monospace",
                  fontSize: 10,
                  fontWeight: 600,
                  color: "var(--ink-3)",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                }}
              >
                {visible.length} of {meta.count}
              </div>
            </div>
            <h2
              style={{
                fontFamily: "var(--font-sora)",
                fontSize: 24,
                fontWeight: 600,
                color: "var(--ink)",
                margin: "0 0 6px",
                letterSpacing: "-0.01em",
              }}
            >
              {meta.title}
            </h2>
            <p
              style={{
                fontFamily: "var(--font-sora)",
                fontSize: 14,
                color: "var(--ink-3)",
                margin: "0 0 22px",
                lineHeight: 1.5,
                maxWidth: 640,
              }}
            >
              {meta.em}
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 0,
                background: "var(--surface)",
                border: "1px solid var(--line)",
                borderRadius: 4,
                overflow: "hidden",
              }}
            >
              {visible.map((entry, i) => (
                <TermCard
                  key={entry.id}
                  entry={entry}
                  isLastOdd={
                    i === visible.length - 1 && visible.length % 2 === 1
                  }
                  query={normalized}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function TermCard({
  entry,
  isLastOdd,
  query,
}: {
  entry: GlossaryEntry;
  isLastOdd: boolean;
  query: string;
}) {
  return (
    <article
      id={entry.id}
      style={{
        padding: "22px 24px",
        borderRight: isLastOdd ? "none" : "1px solid var(--line-soft)",
        borderBottom: "1px solid var(--line-soft)",
        background: "transparent",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <h3
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 14,
            fontWeight: 700,
            color: "var(--ink)",
            margin: 0,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          {entry.term}
        </h3>
        <span
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 9,
            fontWeight: 600,
            color: "var(--ink-4)",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}
        >
          // {entry.id}
        </span>
      </header>

      <div
        style={{
          fontFamily: "var(--font-sora)",
          fontSize: 14,
          color: "var(--ink-2)",
          lineHeight: 1.55,
        }}
      >
        {entry.body}
      </div>

      {entry.seeAlso.length > 0 && (
        <div
          style={{
            marginTop: 4,
            paddingTop: 10,
            borderTop: "1px solid var(--line-soft)",
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
          }}
        >
          {entry.seeAlso.map((s) => (
            <a
              key={s.href}
              href={s.href}
              style={{
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 9.5,
                fontWeight: 700,
                color: "var(--terminal-cyan)",
                textDecoration: "none",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                padding: "3px 8px",
                border: "1px solid var(--terminal-cyan-dim)",
                borderRadius: 2,
                background: "transparent",
              }}
            >
              {s.label} →
            </a>
          ))}
        </div>
      )}
    </article>
  );
}

function matches(entry: GlossaryEntry, needle: string): boolean {
  if (entry.term.toLowerCase().includes(needle)) return true;
  if (entry.id.toLowerCase().includes(needle)) return true;
  // Body is ReactNode; stringify for a cheap text scan.
  const text = flattenText(entry.body).toLowerCase();
  if (text.includes(needle)) return true;
  for (const s of entry.seeAlso) {
    if (s.label.toLowerCase().includes(needle)) return true;
  }
  return false;
}

function flattenText(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join(" ");
  if (React.isValidElement(node)) {
    return flattenText((node.props as { children?: React.ReactNode }).children);
  }
  return "";
}
