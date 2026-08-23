import type { Metadata, Viewport } from "next";
import { Sora, JetBrains_Mono } from "next/font/google";
import { Providers } from "./providers";
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
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#060A12" },
    { media: "(prefers-color-scheme: dark)", color: "#060A12" },
  ],
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
      </body>
    </html>
  );
}
