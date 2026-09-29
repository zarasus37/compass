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
  STORAGE_KEY as RECENT_STORAGE_KEY,
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

// --- RECENT list store ---------------------------------------------------
// localStorage is the external store for the RECENT list. The raw JSON
// string is the snapshot (a primitive, so `useSyncExternalStore` gets a
// stable value); `recent` is parsed from it in a memo.

const EMPTY_RECENT_RAW = "[]";

function getRecentRaw(): string {
  if (typeof localStorage === "undefined") return EMPTY_RECENT_RAW;
  try {
    return localStorage.getItem(RECENT_STORAGE_KEY) ?? EMPTY_RECENT_RAW;
  } catch {
    return EMPTY_RECENT_RAW;
  }
}

function subscribeRecent(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

const getServerRecentRaw = () => EMPTY_RECENT_RAW;

export function CommandPalette({
  searchIndex,
  isOpen,
  onClose,
}: {
  searchIndex: SearchIndex;
  isOpen: boolean;
  onClose: () => void;
}) {
  // The palette body is mounted only while the drawer is open, so the
  // query + active index start fresh on every open. That is the same
  // reset the old close-effect performed, without pushing state from
  // an effect.
  if (!isOpen) return null;
  return <CommandPaletteBody searchIndex={searchIndex} onClose={onClose} />;
}

function CommandPaletteBody({
  searchIndex,
  onClose,
}: {
  searchIndex: SearchIndex;
  onClose: () => void;
}) {
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const listRef = React.useRef<HTMLDivElement | null>(null);
  const [query, setQuery] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(0);
  // Cluster 7.2 — the RECENT list. Stored in localStorage via the
  // recent-items module and read through `useSyncExternalStore`: the
  // body only mounts while the drawer is open, so the list is read on
  // every open (the server snapshot is an empty list), and a write
  // from another tab re-reads it live.
  const recentRaw = React.useSyncExternalStore(
    subscribeRecent,
    getRecentRaw,
    getServerRecentRaw,
  );
  const recent: RecentItem[] = React.useMemo(
    () => (recentRaw ? getRecent() : []),
    [recentRaw],
  );

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

  // Focus the input on open (the body mounts with the drawer).
  React.useEffect(() => {
    // Defer to the next frame so the input is mounted.
    const id = requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
    return () => cancelAnimationFrame(id);
  }, []);

  // Keep the active row in view (scroll into the list when
  // the active index changes via keyboard).
  React.useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const active = list.querySelector<HTMLElement>(
      `[data-palette-index="${activeIndex}"]`,
    );
    if (active) {
      active.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex, rows.length]);

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
            onChange={(e) => {
              setQuery(e.target.value);
              // The first row is always the default once the query
              // changes (the old reset effect keyed off `query`).
              setActiveIndex(0);
            }}
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
