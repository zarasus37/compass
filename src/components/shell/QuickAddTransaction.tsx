"use client";

/**
 * QuickAddTransaction — header-mounted transaction entry (Cluster 7.27).
 *
 * Lives in TopAppBar's right column. Click the "+" button → popover
 * drops down with a minimal form (amount + envelope + optional payee).
 * Submits via the existing `logTransaction` server action. Reuses the
 * same DB row + audit-log machinery as the full `/transactions/new`
 * form, just with a 3-field shortcut surface.
 *
 * Mom-grade UX:
 *   - amount input is auto-focused on open (keyboard hop #1)
 *   - amount accepts "+$5" / "-5" / "5" — sign goes in via the prefix,
 *     not a separate "this is income" checkbox (income is rare for
 *     mom; spending is the default)
 *   - envelope select shows planet glyph + name, defaults to last-used
 *   - payee is optional; defaults to "Quick log" so mom doesn't have
 *     to type "H-E-B" ten times a day
 *   - on success: popover closes + a brief cyan flash on TopAppBar +
 *     the cash-flow card revalidates (the `revalidatePath("/")`
 *     already in logTransaction handles this)
 *
 * No schema change. No env change. The Transaction row's `source`
 * column accepts free-form strings; this cluster writes "quick-add"
 * so future analytics can distinguish quick vs full-form entries.
 */

import * as React from "react";
import Link from "next/link";
import type { PlanetId } from "@/components/alchemy/VesselGlyph";
import { logTransaction, type AddTransactionResult } from "@/app/actions/transactions";

export interface QuickAddEnvelopeOption {
  id: string;
  name: string;
  planet: PlanetId | null;
}

export interface QuickAddTransactionProps {
  envelopes: QuickAddEnvelopeOption[];
  /** Most-recently-used envelope id, if any (persists in localStorage). */
  defaultEnvelopeId?: string | null;
}

export function QuickAddTransaction({
  envelopes,
  defaultEnvelopeId,
}: QuickAddTransactionProps) {
  const [open, setOpen] = React.useState(false);
  const [amount, setAmount] = React.useState("");
  const [envelopeId, setEnvelopeId] = React.useState<string>(
    defaultEnvelopeId ?? (envelopes[0]?.id ?? ""),
  );
  const [payee, setPayee] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [flash, setFlash] = React.useState<string | null>(null);
  const popoverRef = React.useRef<HTMLDivElement | null>(null);
  const amountRef = React.useRef<HTMLInputElement | null>(null);

  // Focus the amount input when the popover opens.
  React.useEffect(() => {
    if (open) {
      // Wait a frame so the input is mounted before focusing.
      const t = setTimeout(() => amountRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [open]);

  // Dismiss on click-outside.
  React.useEffect(() => {
    if (!open) return undefined;
    function onClick(e: MouseEvent) {
      const target = e.target as Node;
      if (popoverRef.current && !popoverRef.current.contains(target)) {
        // Ignore clicks on the trigger itself (it's outside popoverRef)
        // — the trigger's onClick toggles, so we don't need to close.
        const triggerEl = (e.target as HTMLElement)?.closest(
          '[data-testid="quick-add-trigger"]',
        );
        if (!triggerEl) setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Auto-clear the success flash after 2.5s.
  React.useEffect(() => {
    if (!flash) return undefined;
    const t = setTimeout(() => setFlash(null), 2500);
    return () => clearTimeout(t);
  }, [flash]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const dollars = Number.parseFloat(amount.replace(/[^\d.\-]/g, ""));
      if (!Number.isFinite(dollars) || dollars === 0) {
        setError("Enter an amount other than $0.");
        setPending(false);
        return;
      }
      const isIncome = dollars > 0; // negative prefix = spend
      const form = new FormData();
      form.set("payee", payee.trim() || "Quick log");
      form.set("amount", String(Math.abs(dollars)));
      form.set("envelopeId", envelopeId || "");
      form.set("date", "");
      form.set("isIncome", isIncome ? "on" : "");
      const result: AddTransactionResult = await logTransaction(null, form);
      if (!result.ok) {
        setError(result.reason ?? "Could not log the transaction.");
        setPending(false);
        return;
      }
      // Persist last-used envelope id for next time.
      try {
        window.localStorage.setItem("quick-add-last-envelope", envelopeId);
      } catch {
        // localStorage can throw in private mode — silent.
      }
      const envelope = envelopes.find((e) => e.id === envelopeId);
      const sign = isIncome ? "+" : "−";
      const formatted = `${sign}$${Math.abs(dollars).toFixed(2)}`;
      const target = envelope ? ` → ${envelope.name}` : "";
      setFlash(formatted + target);
      // Reset form state.
      setAmount("");
      setPayee("");
      setOpen(false);
      setPending(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
      setPending(false);
    }
  }

  // ── Honest pending state ────────────────────────────────────────────
  if (envelopes.length === 0) {
    return (
      <Link
        href="/envelopes"
        aria-label="Quick-add transaction (set up an envelope first)"
        data-testid="quick-add-trigger-empty"
        className="topbar-quick-add"
        style={{
          display: "inline-grid",
          placeItems: "center",
          width: 32,
          height: 32,
          color: "var(--vessel-accent)",
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 18,
          fontWeight: 700,
          textDecoration: "none",
          border: "1px solid var(--vessel-border)",
          borderRadius: 6,
          background: "var(--vessel-surface)",
        }}
      >
        +
      </Link>
    );
  }

  return (
    <div
      style={{ position: "relative", display: "inline-flex" }}
      data-testid="quick-add-wrapper"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close quick-add" : "Quick-add transaction"}
        aria-expanded={open}
        aria-controls="quick-add-popover"
        data-testid="quick-add-trigger"
        className="topbar-quick-add"
        style={{
          display: "inline-grid",
          placeItems: "center",
          width: 32,
          height: 32,
          color: open ? "var(--vessel-dark)" : "var(--vessel-accent)",
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 18,
          fontWeight: 700,
          textDecoration: "none",
          border: "1px solid var(--vessel-border)",
          borderRadius: 6,
          background: open ? "var(--vessel-accent)" : "var(--vessel-surface)",
          cursor: "pointer",
          padding: 0,
          // Success flash: cyan glow for 2.5s.
          boxShadow: flash
            ? "0 0 12px var(--vessel-accent), 0 0 4px var(--vessel-accent)"
            : "none",
          transition: "background 120ms, box-shadow 200ms",
        }}
      >
        +
      </button>
      {flash && (
        <span
          data-testid="quick-add-flash"
          aria-live="polite"
          style={{
            position: "absolute",
            top: 40,
            right: 0,
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 10,
            fontWeight: 700,
            color: "var(--vessel-accent)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
            pointerEvents: "none",
            padding: "4px 10px",
            border: "1px solid var(--vessel-accent)",
            borderRadius: 4,
            background: "var(--vessel-dark)",
          }}
        >
          {flash}
        </span>
      )}
      {open && (
        <div
          ref={popoverRef}
          id="quick-add-popover"
          role="dialog"
          aria-label="Quick-add transaction"
          data-testid="quick-add-popover"
          data-status={pending ? "pending" : "idle"}
          style={{
            position: "absolute",
            top: 40,
            right: 0,
            minWidth: 320,
            background: "var(--vessel-dark)",
            border: "1px solid var(--vessel-accent)",
            borderRadius: 6,
            padding: 16,
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.6)",
            zIndex: 50,
            display: "grid",
            gap: 12,
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 10,
              fontWeight: 600,
              color: "var(--vessel-accent)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
          >
            Quick log
          </div>
          <form
            onSubmit={handleSubmit}
            style={{ display: "grid", gap: 10 }}
            data-testid="quick-add-form"
          >
            <label
              style={{
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 10,
                color: "var(--ink-3)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              Amount ($)
              <input
                ref={amountRef}
                type="text"
                inputMode="decimal"
                placeholder="-5.42"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                data-testid="quick-add-amount"
                aria-label="Transaction amount"
                style={{
                  display: "block",
                  width: "100%",
                  marginTop: 4,
                  padding: "8px 10px",
                  fontFamily: "var(--font-jetbrains), monospace",
                  fontSize: 14,
                  color: "var(--ink)",
                  background: "var(--vessel-surface)",
                  border: "1px solid var(--vessel-border)",
                  borderRadius: 4,
                  outline: "none",
                }}
              />
            </label>
            <label
              style={{
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 10,
                color: "var(--ink-3)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              Envelope
              <select
                value={envelopeId}
                onChange={(e) => setEnvelopeId(e.target.value)}
                data-testid="quick-add-envelope"
                aria-label="Envelope"
                style={{
                  display: "block",
                  width: "100%",
                  marginTop: 4,
                  padding: "8px 10px",
                  fontFamily: "var(--font-jetbrains), monospace",
                  fontSize: 13,
                  color: "var(--ink)",
                  background: "var(--vessel-surface)",
                  border: "1px solid var(--vessel-border)",
                  borderRadius: 4,
                  outline: "none",
                }}
              >
                {envelopes.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.planet ? `${e.planet.toUpperCase()} · ` : ""}
                    {e.name}
                  </option>
                ))}
              </select>
            </label>
            <label
              style={{
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 10,
                color: "var(--ink-3)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              Payee (optional)
              <input
                type="text"
                placeholder="H-E-B, electric bill, …"
                value={payee}
                onChange={(e) => setPayee(e.target.value)}
                data-testid="quick-add-payee"
                aria-label="Payee (optional)"
                style={{
                  display: "block",
                  width: "100%",
                  marginTop: 4,
                  padding: "8px 10px",
                  fontFamily: "var(--font-jetbrains), monospace",
                  fontSize: 13,
                  color: "var(--ink)",
                  background: "var(--vessel-surface)",
                  border: "1px solid var(--vessel-border)",
                  borderRadius: 4,
                  outline: "none",
                }}
              />
            </label>
            {error && (
              <div
                role="alert"
                data-testid="quick-add-error"
                style={{
                  fontFamily: "var(--font-jetbrains), monospace",
                  fontSize: 11,
                  color: "var(--vessel-watch)",
                  padding: "6px 8px",
                  background: "rgba(249, 115, 22, 0.08)",
                  border: "1px solid var(--vessel-watch)",
                  borderRadius: 3,
                }}
              >
                {error}
              </div>
            )}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 8,
                marginTop: 4,
              }}
            >
              <Link
                href="/transactions/new"
                data-testid="quick-add-full-link"
                style={{
                  fontFamily: "var(--font-jetbrains), monospace",
                  fontSize: 10,
                  color: "var(--ink-3)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  textDecoration: "underline",
                }}
              >
                Full form →
              </Link>
              <button
                type="submit"
                disabled={pending}
                data-testid="quick-add-submit"
                style={{
                  padding: "8px 16px",
                  fontFamily: "var(--font-jetbrains), monospace",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  color: "var(--vessel-dark)",
                  background: pending
                    ? "var(--vessel-surface)"
                    : "var(--vessel-accent)",
                  border: "none",
                  borderRadius: 4,
                  cursor: pending ? "wait" : "pointer",
                  opacity: pending ? 0.6 : 1,
                }}
              >
                {pending ? "Logging…" : "Log"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
