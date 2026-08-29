"use client";

/**
 * Cluster 7.1 — Command palette modal drawer.
 *
 * The visible component. Centered overlay with a search input
 * at the top and a scrollable list of result rows below.
 *
 *   ┌──────────────────────────────────────┐
 *   │ [?] Search routes, envelopes, ...   │
 *   ├──────────────────────────────────────┤
 *   │ [ROUTE]  Dashboard     today's snap │
 *   │ [ROUTE]  Period        this pay per │
 *   │ [ENV]    Rent          vessel: sol  │
 *   │ [GOAL]   Emergency     $2,000 / $20k │
 *   │ ...                                  │
 *   ├──────────────────────────────────────┤
 *   │ // 12 results · [↑] nav · [↵] open │
 *   └──────────────────────────────────────┘
 *
 * Keyboard:
 *   ⌘K / Ctrl+K — open
 *   Escape — close
 *   ↑ / ↓ — move active row
 *   Enter — navigate to active row's href
 *
 * The component is mounted by `<CommandPaletteProvider />` so
 * the provider owns open/close + the global keyboard listener.
 * The palette itself only knows the current `isOpen` + the
 * search index.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  match,
  type MatchResult,
} from "@/lib/command-palette/match";
import {
  getRecent,
  pushRecent,
  type RecentItem,
} from "@/lib/command-palette/recent-items";
import type {
  PaletteItem,
  PaletteKind,
  SearchIndex,
} from "@/lib/command-palette/types";

const KIND_LABEL: Record<PaletteKind, string> = {
  ROUTE: "ROUTE",
  ENV: "ENV",
  GOAL: "GOAL",
  DEBT: "DEBT",
  BILL: "BILL",
  ACC: "ACC",
};

const MAX_RESULTS = 50;

export function CommandPalette({
  searchIndex,
  isOpen,
  onClose,
}: {
  searchIndex: SearchIndex;
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const listRef = React.useRef<HTMLDivElement | null>(null);
  const [query, setQuery] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(0);
  // Cluster 7.2 — the RECENT list. Read on mount + after
  // every navigation. Stored in localStorage via the
  // recent-items module.
  const [recent, setRecent] = React.useState<RecentItem[]>([]);

  // Flatten the search index into a single array for matching.
  const allItems: PaletteItem[] = React.useMemo(
    () => [...searchIndex.routes, ...searchIndex.items],
    [searchIndex],
  );

  // The RECENT list is shown above the search results when
  // the query is empty. When the user types, the filter
  // takes over and the RECENT section disappears.
  const showRecent = query.trim().length === 0 && recent.length > 0;

  // The full list of "rows" the palette renders: RECENT
  // rows on top (when shown) + filtered search results below.
  // Each row has a `kind` (PaletteKind) + an `item` (the
  // PaletteItem to navigate to on click/Enter). For RECENT
  // rows, the item is the recent's stored href/title/etc.
  type Row = { kind: "RECENT" | "RESULT"; item: PaletteItem };

  const rows: Row[] = React.useMemo(() => {
    if (showRecent) {
      const recentRows: Row[] = recent.map((r) => ({
        kind: "RECENT",
        item: {
          id: r.id,
          title: r.title,
          href: r.href,
          kind: r.kind,
          chapter: null,
          sub: r.sub,
        },
      }));
      // Below the RECENT section, show the first 12 ROUTE
      // items as the "default" set (so the user has something
      // to scroll without typing).
      const defaultResults: MatchResult[] = match("", allItems).slice(0, 12);
      const defaultRows: Row[] = defaultResults.map((r) => ({
        kind: "RESULT",
        item: r.item,
      }));
      return [...recentRows, ...defaultRows];
    }
    const results = match(query, allItems).slice(0, MAX_RESULTS);
    return results.map((r) => ({ kind: "RESULT", item: r.item }));
  }, [showRecent, recent, allItems, query]);

  // Reset the active index when the query or RECENT state
  // changes (so the first row is always the default).
  React.useEffect(() => {
    setActiveIndex(0);
  }, [query, showRecent]);

  // Read the recent list on mount + on every palette open.
  React.useEffect(() => {
    if (isOpen) {
      setRecent(getRecent());
    }
  }, [isOpen]);

  // Focus the input on open.
  React.useEffect(() => {
    if (isOpen) {
      // Defer to the next frame so the input is mounted.
      const id = requestAnimationFrame(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      });
      return () => cancelAnimationFrame(id);
    }
    // Reset the query when the palette closes.
    setQuery("");
    setActiveIndex(0);
    return undefined;
  }, [isOpen]);

  // Keep the active row in view (scroll into the list when
  // the active index changes via keyboard).
  React.useEffect(() => {
    if (!isOpen) return;
    const list = listRef.current;
    if (!list) return;
    const active = list.querySelector<HTMLElement>(
      `[data-palette-index="${activeIndex}"]`,
    );
    if (active) {
      active.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex, isOpen, rows.length]);

  if (!isOpen) return null;

  function navigate(item: PaletteItem) {
    // Cluster 7.2 — record the navigation in the RECENT
    // list before closing. The next palette open will see
    // the item at the top.
    pushRecent(item);
    onClose();
    router.push(item.href);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (rows.length === 0 ? 0 : (i + 1) % rows.length));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) =>
        rows.length === 0 ? 0 : (i - 1 + rows.length) % rows.length,
      );
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const target = rows[activeIndex];
      if (target) navigate(target.item);
      return;
    }
  }

  const activeResult = rows[activeIndex];

  return (
    <div
      data-testid="command-palette"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        background: "rgba(6, 10, 18, 0.85)",
        display: "grid",
        placeItems: "start center",
        paddingTop: "10vh",
        backdropFilter: "blur(2px)",
        animation: "palette-fade-in 200ms ease-out",
      }}
    >
      <div
        data-testid="command-palette-modal"
        style={{
          width: "min(640px, 92vw)",
          background: "var(--vessel-dark)",
          border: "1px solid var(--vessel-border)",
          borderRadius: 4,
          boxShadow: "var(--vessel-neon-glow), 0 24px 60px rgba(0, 0, 0, 0.6)",
          display: "flex",
          flexDirection: "column",
          maxHeight: "70vh",
          animation: "palette-slide-in 200ms ease-out",
        }}
      >
        {/* Search input */}
        <div
          style={{
            borderBottom: "1px solid var(--vessel-border)",
            padding: "12px 16px",
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="[?] Search routes, envelopes, goals, debts, bills, accounts…"
            aria-label="Search"
            data-testid="command-palette-input"
            autoComplete="off"
            spellCheck={false}
            style={{
              width: "100%",
              background: "var(--vessel-surface)",
              border: "1px solid var(--vessel-border)",
              borderRadius: 2,
              padding: "12px 14px",
              color: "var(--ink)",
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 14,
              outline: "none",
              letterSpacing: "0.04em",
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "var(--vessel-accent)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "var(--vessel-border)";
            }}
          />
        </div>

        {/* Results */}
        <div
          ref={listRef}
          data-testid="command-palette-results"
          role="listbox"
          aria-label="Search results"
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "8px 0",
            minHeight: 80,
          }}
        >
          {rows.length === 0 ? (
            <div
              data-testid="command-palette-empty"
              style={{
                padding: "24px 16px",
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 11,
                color: "var(--ink-3)",
                textAlign: "center",
                letterSpacing: "0.10em",
              }}
            >
              [—] No matches. Try a different query.
            </div>
          ) : (
            <>
              {showRecent && (
                <div
                  data-testid="command-palette-recent-header"
                  style={{
                    padding: "8px 16px 4px",
                    fontFamily: "var(--font-jetbrains), monospace",
                    fontSize: 10,
                    color: "var(--ink-3)",
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                  }}
                >
                  // RECENT · {recent.length} item{recent.length === 1 ? "" : "s"}
                </div>
              )}
              {showRecent && rows.length > recent.length && (
                <div
                  data-testid="command-palette-default-header"
                  style={{
                    padding: "12px 16px 4px",
                    fontFamily: "var(--font-jetbrains), monospace",
                    fontSize: 10,
                    color: "var(--ink-3)",
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    borderTop: "1px solid var(--vessel-border)",
                    marginTop: 4,
                  }}
                >
                  // ROUTES · all
                </div>
              )}
              {rows.map((r, i) => {
                const isActive = i === activeIndex;
                return (
                  <button
                    key={`${r.kind}:${r.item.id}`}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    data-testid={`command-palette-item-${r.item.kind.toLowerCase()}`}
                    data-palette-index={i}
                    data-active={isActive ? "true" : "false"}
                    onClick={() => navigate(r.item)}
                    onMouseEnter={() => setActiveIndex(i)}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "auto 1fr auto",
                      alignItems: "center",
                      gap: 12,
                      width: "100%",
                      padding: "10px 16px",
                      background: isActive
                        ? "var(--vessel-accent-soft)"
                        : "transparent",
                      borderLeft: `3px solid ${
                        isActive ? "var(--vessel-accent)" : "transparent"
                      }`,
                      border: "none",
                      borderTop: "none",
                      borderRight: "none",
                      borderBottom: "none",
                      color: "var(--ink)",
                      textAlign: "left",
                      cursor: "pointer",
                      fontFamily: "var(--font-sora)",
                      fontSize: 13,
                    }}
                  >
                  <span
                    style={{
                      fontFamily: "var(--font-jetbrains), monospace",
                      fontSize: 9.5,
                      fontWeight: 700,
                      letterSpacing: "0.20em",
                      textTransform: "uppercase",
                      color: "var(--vessel-accent)",
                      border: "1px solid var(--vessel-accent)",
                      padding: "2px 6px",
                      borderRadius: 2,
                      whiteSpace: "nowrap",
                    }}
                  >
                    [{KIND_LABEL[r.item.kind]}]
                  </span>
                  <span
                    style={{
                      color: "var(--ink)",
                      fontWeight: 500,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {r.item.title}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-jetbrains), monospace",
                      fontSize: 10.5,
                      color: "var(--ink-3)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      maxWidth: 220,
                    }}
                  >
                    {r.item.sub}
                  </span>
                </button>
                );
              })}
            </>
          )}
        </div>

        {/* Footer */}
        <div
          data-testid="command-palette-footer"
          style={{
            borderTop: "1px solid var(--vessel-border)",
            padding: "8px 16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 10,
            color: "var(--ink-3)",
            letterSpacing: "0.10em",
          }}
        >
          <span data-testid="command-palette-count">
            // {rows.length} {rows.length === 1 ? "row" : "rows"}
            {activeResult
              ? ` · ${activeResult.item.kind.toLowerCase()}: ${activeResult.item.title}`
              : ""}
          </span>
          <span>
            [↑↓] navigate · [↵] open · [esc] close
          </span>
        </div>
      </div>

      {/* Inline keyframes — palette opens with a fade + slide
          when prefers-reduced-motion is off. */}
      <style jsx global>{`
        @keyframes palette-fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes palette-slide-in {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          [data-testid="command-palette"],
          [data-testid="command-palette-modal"] {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
