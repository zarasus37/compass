"use client";

/**
 * SwipeableDashboardHeader — the top-of-dashboard carousel.
 *
 * Two pages that toggle via horizontal swipe, click, or arrow keys:
 *   Page 0 — Safe to Spend hero (the burn-curve headline number)
 *   Page 1 — Spend Ring + Critical Timeline side-by-side
 *
 * Implementation:
 *   - CSS `scroll-snap-type: x mandatory` + `scroll-snap-align: start`
 *     gives native touch swipe on mobile, smooth-scroll on desktop, and
 *     works without any extra dependency.
 *   - A small IntersectionObserver-style scroll listener tracks the
 *     active page index so the dot indicators stay in sync.
 *   - Arrow keys (← / →) advance the carousel. Focus is on the
 *     scroll container, not the dots — the dots are a passive
 *     indicator and a tap target.
 *
 * Component Oracle Terminal treatment: mono caps page labels with
 * // prefix, teal-cyan active rail, gold passive dots, square
 * 4px corners. Matches the rest of the dashboard voice.
 */

import * as React from "react";
import { DashboardCard } from "./DashboardCard";
import { SafeToSpendHero, type SafeToSpendHeroData } from "./cards/safe-to-spend-hero";
import { SpendRingCard, type SpendRingCardData } from "./cards/spend-ring";
import { HorizonStrip, type HorizonStripData } from "./cards/horizon-strip";
import { CARD_META } from "./catalog";

export interface SwipeableDashboardHeaderProps {
  safeToSpendData: SafeToSpendHeroData;
  spendRingData: SpendRingCardData;
  horizonStripData: HorizonStripData;
}

export function SwipeableDashboardHeader({
  safeToSpendData,
  spendRingData,
  horizonStripData,
}: SwipeableDashboardHeaderProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [pageCount, setPageCount] = React.useState(2);

  // Track active page from scroll position.
  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      // Each page is 100% of the visible width. Round to nearest page.
      const idx = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
      setActiveIndex(idx);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // ResizeObserver: re-measure when the panel size changes (font load,
  // window resize, etc.) so the activeIndex math stays right.
  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setPageCount(Math.max(1, Math.round(el.scrollWidth / Math.max(1, el.clientWidth))));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Scroll to a specific page. Smooth for click/keyboard, instant
  // (well, native) for swipes since scroll-snap already handles those.
  const goTo = React.useCallback((idx: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(idx, pageCount - 1));
    el.scrollTo({ left: clamped * el.clientWidth, behavior: "smooth" });
  }, [pageCount]);

  // Keyboard navigation: ← / → when the container is focused.
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      goTo(activeIndex - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      goTo(activeIndex + 1);
    }
  };

  return (
    <section
      aria-label="Dashboard header — swipeable"
      style={{ marginBottom: 28, position: "relative" }}
    >
      {/* Eyebrow row — page label + arrows */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
          gap: 12,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 10.5,
            fontWeight: 600,
            color: "var(--vessel-accent)",
            letterSpacing: "0.20em",
            textTransform: "uppercase",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span
            aria-hidden
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: "var(--ok)",
              boxShadow: "0 0 6px var(--ok)",
            }}
          />
          // TOP FOLD · {activeIndex === 0 ? "TELEMETRY" : "RING + HORIZON"}
        </div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <ArrowButton
            label="Previous page"
            glyph="‹"
            disabled={activeIndex === 0}
            onClick={() => goTo(activeIndex - 1)}
          />
          <ArrowButton
            label="Next page"
            glyph="›"
            disabled={activeIndex >= pageCount - 1}
            onClick={() => goTo(activeIndex + 1)}
          />
        </div>
      </div>

      {/* Scroll container — each page is 100% of the visible width */}
      <div
        ref={scrollRef}
        tabIndex={0}
        role="region"
        aria-label="Dashboard header carousel"
        onKeyDown={onKeyDown}
        className="swipeable-header-scroll"
        style={{
          display: "flex",
          overflowX: "auto",
          scrollSnapType: "x mandatory",
          scrollbarWidth: "none",
          gap: 0,
          outline: "none",
        }}
      >
        {/* Page 0: Safe to Spend hero */}
        <div
          style={{
            flex: "0 0 100%",
            minWidth: "100%",
            scrollSnapAlign: "start",
            scrollSnapStop: "always",
          }}
        >
          <SafeToSpendHero data={safeToSpendData} embedded />
        </div>

        {/* Page 1: Spend Ring (left) + Horizon Strip (right) — the
            Consumption Ring & Timeline combo per the spec. */}
        <div
          style={{
            flex: "0 0 100%",
            minWidth: "100%",
            scrollSnapAlign: "start",
            scrollSnapStop: "always",
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.6fr)",
            gap: 20,
          }}
        >
          <DashboardCard
            cardId="spend-ring"
            href={CARD_META["spend-ring"].href}
            eyebrow={CARD_META["spend-ring"].eyebrow}
            title={CARD_META["spend-ring"].title}
            em={CARD_META["spend-ring"].em}
            accent={CARD_META["spend-ring"].accent}
          >
            <SpendRingCard data={spendRingData} />
          </DashboardCard>
          <div
            style={{
              background: "var(--vessel-surface)",
              border: "1px solid var(--vessel-border)",
              borderRadius: 4,
              padding: "18px 22px 22px",
              display: "flex",
              flexDirection: "column",
              minWidth: 0,
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 10,
                fontWeight: 600,
                color: "var(--vessel-accent)",
                letterSpacing: "0.20em",
                textTransform: "uppercase",
                marginBottom: 12,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: "var(--vessel-accent)",
                  boxShadow: "0 0 6px var(--vessel-accent)",
                }}
              />
              // CHRONICLE · 14-DAY HORIZON
            </div>
            <HorizonStrip data={horizonStripData} />
          </div>
        </div>
      </div>

      {/* Page indicators — dots */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          marginTop: 14,
        }}
        role="tablist"
        aria-label="Dashboard header pages"
      >
        {Array.from({ length: pageCount }, (_, i) => {
          const active = i === activeIndex;
          return (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={active}
              aria-label={`Go to page ${i + 1}`}
              onClick={() => goTo(i)}
              style={{
                width: active ? 24 : 8,
                height: 8,
                borderRadius: 2,
                background: active ? "var(--vessel-accent)" : "var(--ink-5)",
                boxShadow: active ? "0 0 6px var(--vessel-accent)" : "none",
                border: 0,
                padding: 0,
                cursor: "pointer",
                transition:
                  "width 200ms cubic-bezier(0.2, 0.7, 0.3, 1), background 160ms, box-shadow 160ms",
              }}
            />
          );
        })}
      </div>

      {/* Local CSS for hiding the scrollbar cross-browser */}
      <style>{`
        .swipeable-header-scroll {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .swipeable-header-scroll::-webkit-scrollbar {
          display: none;
        }
        .swipeable-header-scroll:focus-visible {
          outline: 1px solid var(--vessel-accent);
          outline-offset: 4px;
          border-radius: 4px;
        }
      `}</style>
    </section>
  );
}

function ArrowButton({
  label,
  glyph,
  disabled,
  onClick,
}: {
  label: string;
  glyph: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      style={{
        fontFamily: "var(--font-jetbrains), monospace",
        fontSize: 16,
        fontWeight: 600,
        width: 30,
        height: 30,
        display: "grid",
        placeItems: "center",
        background: "var(--vessel-surface)",
        color: disabled ? "var(--ink-5)" : "var(--vessel-accent)",
        border: `1px solid ${disabled ? "var(--vessel-border)" : "var(--vessel-accent-soft)"}`,
        borderRadius: 2,
        cursor: disabled ? "default" : "pointer",
        padding: 0,
        lineHeight: 1,
        transition: "all 140ms",
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        e.currentTarget.style.background = "var(--vessel-dark)";
        e.currentTarget.style.borderColor = "var(--vessel-accent)";
      }}
      onMouseLeave={(e) => {
        if (disabled) return;
        e.currentTarget.style.background = "var(--vessel-surface)";
        e.currentTarget.style.borderColor = "var(--vessel-accent-soft)";
      }}
    >
      {glyph}
    </button>
  );
}
