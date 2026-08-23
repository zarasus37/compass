"use client";

/**
 * ReceiptScanForm — paste-text → draft transaction.
 *
 * The user pastes the raw receipt text. The parser looks for:
 *   - merchant name (first non-empty line, usually)
 *   - total (line containing "total" with the largest dollar amount)
 *   - date (any line with a date pattern)
 *
 * On parse, the form populates the merchant / amount / date fields
 * and the user picks the vessel. "Save" creates a transaction in
 * the live store; "Cancel" discards the draft.
 *
 * The form is a client component because the parse runs in the
 * browser. The "Save" action is a server action stub that flips
 * a success state in the UI.
 */

import * as React from "react";
import { VesselGlyph, type PlanetId } from "@/components/alchemy/VesselGlyph";

interface Envelope {
  id: string;
  name: string;
  planet: PlanetId | null;
}

interface ParsedReceipt {
  merchant: string;
  amountCents: number;
  date: string;
}

export function ReceiptScanForm({ envelopes }: { envelopes: Envelope[] }) {
  const [raw, setRaw] = React.useState(
    "H-E-B #482\n2218 N 23rd St, McAllen TX\n03/22/2026  4:47 PM\n\nGROCERY              42.18\nPRODUCE              12.50\nTAX                   3.10\n\nTOTAL              $57.78\n\nCARD ENDING 8842  APPROVED",
  );
  const [parsed, setParsed] = React.useState<ParsedReceipt | null>(null);
  const [vesselId, setVesselId] = React.useState<string>(envelopes[0]?.id ?? "");
  const [saved, setSaved] = React.useState(false);

  const onParse = () => {
    setSaved(false);
    setParsed(parseReceipt(raw));
  };

  const onSave = () => {
    // Server action stub: in a full build this would call a "createDraftTransaction" action.
    setSaved(true);
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>
      <section>
        <div
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 9.5,
            fontWeight: 600,
            color: "var(--venus)",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            marginBottom: 10,
          }}
        >
          <span style={{ color: "var(--ink-4)" }}>//</span> raw receipt
        </div>
        <textarea
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          spellCheck={false}
          style={{
            width: "100%",
            minHeight: 280,
            background: "var(--cosmos)",
            color: "var(--ink)",
            border: "1px solid var(--line)",
            borderRadius: 2,
            padding: 16,
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 12.5,
            lineHeight: 1.6,
            resize: "vertical",
            outline: "none",
          }}
        />
        <button
          type="button"
          onClick={onParse}
          style={{
            marginTop: 12,
            fontFamily: "var(--font-jetbrains), monospace",
            background: "var(--venus)",
            color: "var(--void)",
            border: 0,
            borderRadius: 2,
            padding: "12px 24px",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            cursor: "pointer",
            boxShadow: "0 0 16px rgba(252, 165, 165, 0.3)",
          }}
        >
          Parse receipt →
        </button>
      </section>

      <section>
        <div
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 9.5,
            fontWeight: 600,
            color: "var(--venus)",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            marginBottom: 10,
          }}
        >
          <span style={{ color: "var(--ink-4)" }}>//</span> parsed draft
        </div>
        {!parsed ? (
          <div
            style={{
              background: "var(--surface)",
              border: "1px dashed var(--line)",
              borderRadius: 2,
              padding: 32,
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 11,
                color: "var(--ink-3)",
                letterSpacing: "0.04em",
              }}
            >
              Paste a receipt and press <span style={{ color: "var(--venus)" }}>PARSE</span>.
            </div>
          </div>
        ) : (
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--venus)",
              borderRadius: 2,
              padding: 20,
              display: "grid",
              gap: 16,
            }}
          >
            <Field label="Merchant" value={parsed.merchant} />
            <Field
              label="Total"
              value={`$${(parsed.amountCents / 100).toFixed(2)}`}
              mono
            />
            <Field label="Date" value={parsed.date} mono />

            <div>
              <div
                style={{
                  fontFamily: "var(--font-jetbrains), monospace",
                  fontSize: 9.5,
                  fontWeight: 600,
                  color: "var(--ink-3)",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                Land in this vessel
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: 8,
                }}
              >
                {envelopes.map((e) => (
                  <label
                    key={e.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 12px",
                      background: "var(--cosmos)",
                      border: `1px solid ${vesselId === e.id ? "var(--venus)" : "var(--line)"}`,
                      borderRadius: 2,
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="radio"
                      name="vessel"
                      value={e.id}
                      checked={vesselId === e.id}
                      onChange={() => setVesselId(e.id)}
                      style={{ accentColor: "var(--venus)", margin: 0 }}
                    />
                    <VesselGlyph planet={e.planet} size={14} />
                    <span
                      style={{
                        fontFamily: "var(--font-sora)",
                        fontSize: 12.5,
                        color: "var(--ink)",
                      }}
                    >
                      {e.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={onSave}
              style={{
                fontFamily: "var(--font-jetbrains), monospace",
                background: saved ? "var(--ok)" : "var(--terminal-cyan)",
                color: "var(--void)",
                border: 0,
                borderRadius: 2,
                padding: "12px 24px",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              {saved ? "✓ Saved" : "Save transaction →"}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 9.5,
          fontWeight: 600,
          color: "var(--ink-3)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: mono ? "var(--font-jetbrains), monospace" : "var(--font-sora)",
          fontSize: mono ? 18 : 16,
          color: "var(--ink)",
          fontWeight: 500,
          fontFeatureSettings: mono ? '"tnum" 1, "zero" 1' : undefined,
        }}
      >
        {value}
      </div>
    </div>
  );
}

/** Parse a receipt text blob. Heuristic, not a real OCR pipeline. */
function parseReceipt(raw: string): ParsedReceipt {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  // Merchant: first line
  const merchant = lines[0] ?? "Unknown";
  // Total: line containing "total" with the largest dollar amount
  let amountCents = 0;
  for (const l of lines) {
    if (/total/i.test(l)) {
      const m = l.match(/\$?(\d{1,5}(?:\.\d{1,2})?)/g);
      if (m) {
        for (const cand of m) {
          const n = Number(cand.replace("$", ""));
          if (!isNaN(n) && n * 100 > amountCents) {
            amountCents = Math.round(n * 100);
          }
        }
      }
    }
  }
  // Date: any line with a date pattern (MM/DD/YYYY, etc.)
  let date = new Date().toISOString().slice(0, 10);
  for (const l of lines) {
    const m = l.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);
    if (m && m[1]) {
      const d = new Date(m[1]);
      if (!isNaN(d.getTime())) {
        date = d.toISOString().slice(0, 10);
        break;
      }
    }
  }
  return { merchant, amountCents, date };
}
