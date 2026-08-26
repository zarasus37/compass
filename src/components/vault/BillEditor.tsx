"use client";

/**
 * Compass Vault — per-bill editor modal (Phase 3.5).
 *
 * Renders the form for both adding a new bill and editing an
 * existing one. State-driven (`mode: "add" | "edit" | null`) —
 * when `null`, the modal is closed. The parent (`BillScheduleClient`)
 * owns the state and passes the bill in for edit.
 *
 * Form fields mirror the server action's `validateBillForm`:
 *   - billerName (required, ≤80 chars)
 *   - amountCents (positive integer cents — the form takes a
 *     dollars input for friendliness and converts to cents on
 *     submit)
 *   - frequency (one of the 5 valid values)
 *   - dueDay (1–31; interpreted as day-of-month for all frequencies
 *     to match the seed convention)
 *   - envelopeId (must belong to the user's vault — verified
 *     server-side; we just supply the dropdown)
 *   - providerPreference (optional free text — the off-ramp
 *     gateway in Phase 4 maps this to a real adapter)
 *
 * On submit, calls `createBillFromPage` or `updateBillFromPage`,
 * closes the modal, and triggers `router.refresh()` so the table
 * re-renders the new state. Server-side errors surface inline.
 */

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createBillFromPage,
  updateBillFromPage,
} from "@/lib/vault/actions";
import type { ScheduledBill, BillFrequency, VaultEnvelope } from "@/lib/vault/types";

type Mode = "add" | "edit";

const FREQUENCIES: { value: BillFrequency; label: string }[] = [
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "ANNUALLY", label: "Annually" },
  { value: "ONE_TIME", label: "One-time" },
];

export function BillEditor({
  envelopes,
  mode,
  bill,
  onClose,
}: {
  envelopes: VaultEnvelope[];
  mode: Mode | null;
  bill: ScheduledBill | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const open = mode !== null;

  // Form state. Initialize lazily so a stale bill doesn't leak
  // into a fresh "add" session.
  const [billerName, setBillerName] = useState("");
  const [amountDollars, setAmountDollars] = useState("");
  const [frequency, setFrequency] = useState<BillFrequency>("MONTHLY");
  const [dueDay, setDueDay] = useState("1");
  const [envelopeId, setEnvelopeId] = useState<string>(envelopes[0]?.id ?? "");
  const [providerPreference, setProviderPreference] = useState("");

  // Reset / hydrate form whenever the modal opens or the target
  // bill changes.
  useEffect(() => {
    if (!open) return;
    setError(null);
    if (mode === "edit" && bill) {
      setBillerName(bill.billerName);
      setAmountDollars((bill.amount / 100).toFixed(2));
      setFrequency(bill.frequency);
      setDueDay(String(new Date(bill.dueDate).getUTCDate() || 1));
      setEnvelopeId(bill.envelopeId);
      setProviderPreference(bill.providerPreference ?? "");
    } else {
      setBillerName("");
      setAmountDollars("");
      setFrequency("MONTHLY");
      setDueDay("1");
      setEnvelopeId(envelopes[0]?.id ?? "");
      setProviderPreference("");
    }
  }, [open, mode, bill, envelopes]);

  // Escape to close.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !pending) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, pending, onClose]);

  if (!open) return null;

  const title = mode === "edit" ? "Edit bill" : "Add bill";
  const testid = mode === "edit" ? "vault-edit-bill-modal" : "vault-add-bill-modal";

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pending) return;
    setError(null);
    // Convert dollars → cents. parseFloat("") would be NaN; the
    // amount guard below catches it.
    const dollars = parseFloat(amountDollars);
    if (!Number.isFinite(dollars) || dollars <= 0) {
      setError("amount must be a positive number");
      return;
    }
    const amountCents = Math.round(dollars * 100);
    const day = parseInt(dueDay, 10);
    if (!Number.isFinite(day) || day < 1 || day > 31) {
      setError("due day must be 1–31");
      return;
    }
    if (!billerName.trim()) {
      setError("biller name is required");
      return;
    }
    if (!envelopeId) {
      setError("choose an envelope");
      return;
    }
    const form = {
      billerName: billerName.trim(),
      amountCents,
      frequency,
      dueDay: day,
      providerPreference: providerPreference.trim() || undefined,
    };
    startTransition(async () => {
      const res =
        mode === "edit" && bill
          ? await updateBillFromPage(bill.id, form)
          : await createBillFromPage(form, envelopeId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      onClose();
      router.refresh();
    });
  }

  return (
    <div
      data-testid={testid}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => {
        // Click on the backdrop (not the card) closes the modal.
        if (e.target === e.currentTarget && !pending) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(6, 10, 18, 0.78)",
        backdropFilter: "blur(2px)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--surface)",
          border: "1px solid var(--vessel-accent)",
          borderTop: "2px solid var(--vessel-accent)",
          borderRadius: 2,
          width: "100%",
          maxWidth: 520,
          padding: "24px 28px",
          boxShadow: "0 20px 60px rgba(168, 85, 247, 0.25)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 16,
            paddingBottom: 12,
            borderBottom: "1px solid var(--line)",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 10.5,
              fontWeight: 700,
              color: "var(--vessel-accent)",
              letterSpacing: "0.20em",
              textTransform: "uppercase",
            }}
          >
            <span style={{ color: "var(--ink-4)" }}>//</span> vault ·{" "}
            {mode === "edit" ? "edit" : "add"} bill
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            data-testid="vault-bill-modal-close"
            aria-label="Close"
            style={{
              background: "transparent",
              border: "1px solid var(--line)",
              color: "var(--ink-3)",
              padding: "4px 10px",
              borderRadius: 2,
              cursor: pending ? "wait" : "pointer",
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            ✕ ESC
          </button>
        </div>

        <h3
          style={{
            fontFamily: "var(--font-sora)",
            fontWeight: 600,
            fontSize: 20,
            margin: "0 0 4px",
            color: "var(--ink)",
            letterSpacing: "-0.01em",
          }}
        >
          {title}
        </h3>
        <p
          style={{
            fontFamily: "var(--font-sora)",
            fontSize: 12,
            color: "var(--ink-3)",
            margin: "0 0 20px",
            lineHeight: 1.45,
          }}
        >
          {mode === "edit"
            ? "Update the metadata for this bill. Status changes (Fund, Execute, etc.) live in the per-bill transition menu below the row."
            : "Add a new scheduled bill to your vault. It will start in FUNDED status and survive a re-sync (user-added bills are not overwritten by the seed pass)."}
        </p>

        <form
          onSubmit={onSubmit}
          style={{ display: "flex", flexDirection: "column", gap: 14 }}
        >
          <Field label="biller name" required>
            <input
              type="text"
              value={billerName}
              onChange={(e) => setBillerName(e.target.value)}
              disabled={pending}
              maxLength={80}
              required
              autoFocus
              data-testid="vault-bill-form-biller-name"
              style={inputStyle}
            />
          </Field>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 14,
            }}
          >
            <Field label="amount (usd)" required>
              <div
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <span
                  aria-hidden
                  style={{
                    position: "absolute",
                    left: 10,
                    color: "var(--ink-3)",
                    fontFamily: "var(--font-jetbrains), monospace",
                    fontSize: 13,
                    pointerEvents: "none",
                  }}
                >
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amountDollars}
                  onChange={(e) => setAmountDollars(e.target.value)}
                  disabled={pending}
                  required
                  data-testid="vault-bill-form-amount"
                  style={{
                    ...inputStyle,
                    paddingLeft: 22,
                    MozAppearance: "textfield",
                  }}
                />
              </div>
            </Field>
            <Field label="due day (1–31)" required>
              <input
                type="number"
                min={1}
                max={31}
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
                disabled={pending}
                required
                data-testid="vault-bill-form-due-day"
                style={inputStyle}
              />
            </Field>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 14,
            }}
          >
            <Field label="frequency" required>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as BillFrequency)}
                disabled={pending}
                required
                data-testid="vault-bill-form-frequency"
                style={inputStyle}
              >
                {FREQUENCIES.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="envelope" required>
              <select
                value={envelopeId}
                onChange={(e) => setEnvelopeId(e.target.value)}
                disabled={pending}
                required
                data-testid="vault-bill-form-envelope"
                style={inputStyle}
              >
                {envelopes.length === 0 && (
                  <option value="">— no envelopes —</option>
                )}
                {envelopes.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="provider preference (optional)">
            <input
              type="text"
              value={providerPreference}
              onChange={(e) => setProviderPreference(e.target.value)}
              disabled={pending}
              placeholder="e.g. spritz"
              data-testid="vault-bill-form-provider"
              style={inputStyle}
            />
          </Field>

          {error && (
            <div
              role="alert"
              data-testid="vault-bill-form-error"
              style={{
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 10.5,
                color: "var(--vessel-over)",
                padding: "8px 10px",
                background: "rgba(239, 68, 68, 0.08)",
                border: "1px solid var(--vessel-over)",
                borderRadius: 2,
                letterSpacing: "0.04em",
              }}
            >
              [WARN] {error}
            </div>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
              marginTop: 6,
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              data-testid="vault-bill-form-cancel"
              style={{
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                padding: "8px 16px",
                background: "transparent",
                color: "var(--ink-2)",
                border: "1px solid var(--line)",
                borderRadius: 2,
                cursor: pending ? "wait" : "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending || envelopes.length === 0}
              data-testid="vault-bill-form-submit"
              style={{
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 10.5,
                fontWeight: 700,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                padding: "8px 18px",
                background: "var(--vessel-accent)",
                color: "var(--void)",
                border: "1px solid var(--vessel-accent)",
                borderRadius: 2,
                cursor: pending ? "wait" : "pointer",
                boxShadow: "var(--vessel-neon-glow)",
              }}
            >
              {pending
                ? "Saving…"
                : mode === "edit"
                  ? "Save changes"
                  : "Add bill"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  fontFamily: "var(--font-jetbrains), monospace",
  fontSize: 13,
  color: "var(--ink)",
  background: "var(--vessel-surface)",
  border: "1px solid var(--line)",
  borderRadius: 2,
  padding: "8px 10px",
  width: "100%",
  boxSizing: "border-box",
  outline: "none",
};

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 9.5,
          fontWeight: 600,
          color: "var(--ink-3)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
        }}
      >
        {label}
        {required && (
          <span
            style={{ color: "var(--vessel-accent)", marginLeft: 4 }}
            aria-hidden
          >
            *
          </span>
        )}
      </span>
      {children}
    </label>
  );
}
