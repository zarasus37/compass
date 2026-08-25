import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // The in-app browser hits 127.0.0.1:3000 while the dev server binds
  // to localhost, so Next 16's default cross-origin block kicks in and
  // HMR resources get rejected. Whitelist the loopback host explicitly.
  allowedDevOrigins: ["127.0.0.1", "localhost", "192.168.1.167"],

  // Cluster 4.0 — site-wide nav restructure (xKryptic 2026-08-25).
  // The 3-chapter Overview/Plan/Money structure is now a 4-chapter
  // structure (OVERVIEW/LEDGER/AIMS/LEARN) with the System chrome
  // living behind the gear icon. These redirects keep the old URLs
  // working as deep-links (bookmarks, smoke scripts, shared links).
  async redirects() {
    return [
      // Recurring + Subscriptions merge into /obligations (two tabs).
      { source: "/recurring", destination: "/obligations?tab=bills", permanent: true },
      { source: "/subscriptions", destination: "/obligations?tab=subs", permanent: true },
      // Investments rename to Holdings.
      { source: "/investments", destination: "/holdings", permanent: true },
      // Emergency Fund + Invest are now goal types on /goals, not standalone pages.
      { source: "/emergency", destination: "/goals?kind=emergency", permanent: true },
      { source: "/invest", destination: "/goals?kind=invest", permanent: true },
      // Habit Quiz moves out of /settings into /learn.
      { source: "/settings/habit-quiz", destination: "/learn/habit-quiz", permanent: true },
    ];
  },
};

export default nextConfig;
