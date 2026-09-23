/**
 * MobileSidebarSheet — the mobile overlay drawer (Cluster 7.30a).
 *
 * On phone viewports the desktop sidebar (AppSidebar) returns null;
 * this component slides in from the left as an overlay when the user
 * taps the hamburger in TopAppBar.
 *
 * Behavior:
 *  - Backdrop covers the rest of the viewport (closes on click).
 *  - Panel slides in from the left, takes ~78% of viewport width
 *    (capped at 320px so it doesn't dominate a tablet).
 *  - Same nav content as the desktop AppSidebar (consumes NAV from
 *    "src/components/sidebar/nav") — single source of truth.
 *  - Escape key closes the sheet.
 *  - Body scroll-lock when open so the page doesn't move behind the
 *    panel (handled via `useEffect` adding/removing overflow:hidden).
 *
 * Props are explicit so the parent (TopAppBar) owns the open state
 * — the sheet itself is purely a presentation component.
 */
"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV, isActive } from "@/components/sidebar/nav";

export interface MobileSidebarSheetProps {
  open: boolean;
  onClose: () => void;
}

export function MobileSidebarSheet({ open, onClose }: MobileSidebarSheetProps) {
  const pathname = usePathname();

  // Close on Escape
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  // Body scroll lock when open
  React.useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  // Close when navigating (pathname changes) — otherwise the panel
  // stays open in the background after the user taps a link.
  React.useEffect(() => {
    if (open) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
          zIndex: 80,
          animation: "m30-fade-in 140ms ease-out",
        }}
      />
      {/* Panel */}
      <aside
        role="dialog"
        aria-label="Navigation"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          bottom: 0,
          width: "min(78vw, 320px)",
          background: "var(--vessel-dark)",
          borderRight: "1px solid var(--vessel-border)",
          padding: "16px 12px 24px",
          overflowY: "auto",
          zIndex: 81,
          animation: "m30-slide-in 180ms ease-out",
          boxShadow: "4px 0 16px rgba(0,0,0,0.4)",
        }}
      >
        {/* Header — Compass brand + close button */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "4px 4px 14px",
            borderBottom: "1px solid var(--vessel-border)",
            marginBottom: 16,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-sora)",
              fontSize: 14,
              fontWeight: 600,
              color: "var(--ink)",
              letterSpacing: "0.10em",
              textTransform: "uppercase",
            }}
          >
            Compass
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            style={{
              width: 30,
              height: 30,
              display: "grid",
              placeItems: "center",
              color: "var(--ink-3)",
              background: "transparent",
              border: "1px solid var(--vessel-border)",
              borderRadius: 2,
              cursor: "pointer",
            }}
          >
            <svg
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <path d="M6 6l12 12 M6 18L18 6" />
            </svg>
          </button>
        </div>

        {NAV.map((chapter) => (
          <nav
            key={chapter.label}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
              marginBottom: 18,
            }}
            aria-label={chapter.label}
          >
            <div
              style={{
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 9.5,
                fontWeight: 600,
                color: "var(--vessel-accent)",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                padding: "8px 10px 4px",
              }}
            >
              {chapter.label}
            </div>
            {chapter.items.map((item) => {
              const active = isActive(pathname, item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "10px 12px",
                    borderRadius: 2,
                    color: active ? "var(--vessel-accent)" : "var(--ink-2)",
                    fontFamily: "var(--font-jetbrains), monospace",
                    fontSize: 13,
                    fontWeight: active ? 600 : 500,
                    textDecoration: "none",
                    background: active
                      ? "var(--vessel-surface)"
                      : "transparent",
                    border: active
                      ? "1px solid var(--vessel-accent-soft)"
                      : "1px solid transparent",
                  }}
                >
                  {active && (
                    <span
                      aria-hidden
                      style={{
                        position: "absolute",
                        left: 0,
                        top: 8,
                        bottom: 8,
                        width: 2,
                        background: "var(--vessel-accent)",
                      }}
                    />
                  )}
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.badge && (
                    <span
                      style={{
                        fontFamily: "var(--font-jetbrains), monospace",
                        fontSize: 9,
                        fontWeight: 700,
                        color:
                          item.badge.tone === "auto"
                            ? "var(--vessel-accent)"
                            : "var(--ink-3)",
                        border:
                          item.badge.tone === "auto"
                            ? "1px solid var(--vessel-accent-soft)"
                            : "1px solid var(--vessel-border)",
                        borderRadius: 2,
                        padding: "2px 6px",
                        letterSpacing: "0.10em",
                      }}
                    >
                      {item.badge.text}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        ))}
      </aside>

      {/* Animation keyframes — scoped to the sheet so they don't
          leak into global. CSS-in-JS doesn't auto-scope these so we
          add them to the document head once. */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
@keyframes m30-fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes m30-slide-in { from { transform: translateX(-100%); } to { transform: translateX(0); } }
`,
        }}
      />
    </>
  );
}
