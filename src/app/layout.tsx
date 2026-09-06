import type { Metadata, Viewport } from "next";
import { Sora, JetBrains_Mono } from "next/font/google";
import { Providers } from "./providers";
import { ServiceWorkerRegistrar } from "@/components/pwa/ServiceWorkerRegistrar";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import "./globals.css";

/**
 * Compass font stack — Component Oracle Terminal (locked 2026-08-23).
 * Sora for major headings + display numbers. JetBrains Mono for
 * labels, logs, IDs, data, and controls. The legacy variable names
 * (--font-cinzel / --font-italiana / --font-cormorant) all alias
 * Sora in globals.css so the existing components inherit the new
 * typeface without renaming every JSX site.
 */

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Compass — Component Oracle",
    template: "%s — Compass",
  },
  description: "An oracle for your money. Personal-finance terminal, indexed by the user, for the user.",
  applicationName: "Compass",
  // PWA wiring — Cluster 7.16. The manifest declares icons + theme color
  // for the install experience; the apple-touch-icon is referenced here
  // because iOS doesn't read it from the manifest.
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Compass",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#060A12" },
    { media: "(prefers-color-scheme: dark)", color: "#060A12" },
  ],
  // PWA mobile polish — Cluster 7.16.
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${sora.variable} ${jetbrains.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Providers>{children}</Providers>
        <ServiceWorkerRegistrar />
        <InstallPrompt />
      </body>
    </html>
  );
}
