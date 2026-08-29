import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // The in-app browser hits 127.0.0.1:3000 while the dev server binds
  // to localhost, so Next 16's default cross-origin block kicks in and
  // HMR resources get rejected. Whitelist the loopback host explicitly.
  allowedDevOrigins: ["127.0.0.1", "localhost", "192.168.1.167"],

  // Cluster: Production deploy prep (2026-08-28) — security headers.
  // The app is server-rendered React; the only same-origin network
  // egress is the Mavis API (LLM). The CSP keeps it tight: default
  // to self, only allow images from https:, only allow fetch/XHR to
  // the Mavis base, and disable framing + mixed content.
  async headers() {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'", // Next requires inline for hydration
      "style-src 'self' 'unsafe-inline'", // Tailwind v4 emits utility classes
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      `connect-src 'self' https://api.minimax.io${process.env.NODE_ENV === "development" ? " http://localhost:* http://127.0.0.1:* ws://localhost:* ws://127.0.0.1:*" : ""}`,
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ");

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // HSTS only makes sense over HTTPS — Next only ships HSTS
          // when the request is secure, but we set it here so it's
          // present in the prod config.
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        ],
      },
    ];
  },

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
