import * as React from "react";
import Link from "next/link";
import { PageHead } from "@/components/alchemy/PageHead";
import { ReceiptScanForm } from "./ReceiptScanForm";
import { liveEnvelopes } from "@/lib/mock";

export const dynamic = "force-dynamic";

/**
 * Receipt Scan — paper receipt → transaction.
 *
 * v1 ships the paste-text fallback. The user pastes the raw
 * receipt text (or types it), the parser extracts merchant,
 * total, and date, and a draft transaction is created. v2 wires
 * in on-device Tesseract OCR so the user can snap a photo.
 *
 * Component Oracle Terminal treatment: mono caps, teal CTA,
 * warm venetian-rose accent for the scanner panel.
 */
export default function ReceiptScanPage() {
  const ENVELOPES = liveEnvelopes();
  return (
    <div>
      <PageHead
        eyebrow="// money · transactions · receipt scan"
        title="Receipt Scan"
        em="paper → transaction."
        accent="venus"
        actions={
          <Link
            href="/settings"
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              background: "transparent",
              color: "var(--ink-2)",
              border: "1px solid var(--line)",
              borderRadius: 2,
              padding: "10px 16px",
              fontSize: 10.5,
              fontWeight: 500,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              textDecoration: "none",
            }}
          >
            ← All settings
          </Link>
        }
        explanation={
          <>
            Snap a paper receipt or paste the text, and Compass parses merchant, total, and date into a draft transaction. v1 ships the paste-text path (parse the text yourself in any text editor, then paste here). v2 will wire in on-device Tesseract OCR so the camera does the work.
          </>
        }
      />

      <div
        style={{
          background: "linear-gradient(90deg, rgba(252, 165, 165, 0.10) 0%, transparent 100%)",
          border: "1px solid var(--venus)",
          borderLeft: "2px solid var(--venus)",
          borderRadius: 2,
          padding: "10px 16px",
          marginBottom: 24,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 9.5,
            fontWeight: 700,
            color: "var(--venus)",
            letterSpacing: "0.18em",
            padding: "2px 7px",
            border: "1px solid var(--venus)",
            borderRadius: 2,
          }}
        >
          [WARN] OCR PREP
        </span>
        <span
          style={{
            fontFamily: "var(--font-sora)",
            fontSize: 13,
            color: "var(--ink-2)",
          }}
        >
          Camera OCR lands in v2. Today, paste the receipt text below.
        </span>
      </div>

      <ReceiptScanForm envelopes={ENVELOPES.map((e) => ({ id: e.id, name: e.name, planet: e.planet }))} />
    </div>
  );
}
