import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // The in-app browser hits 127.0.0.1:3000 while the dev server binds
  // to localhost, so Next 16's default cross-origin block kicks in and
  // HMR resources get rejected. Whitelist the loopback host explicitly.
  allowedDevOrigins: ["127.0.0.1", "localhost", "192.168.1.167"],
};

export default nextConfig;
