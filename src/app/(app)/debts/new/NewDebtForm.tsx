"use client";

/**
 * New debt form (Cluster 1.10).
 *
 * Mom-grade: name + balance + APR + min payment + due day.
 * APR is sent as a percent (e.g. "24.99") and the server
 * converts to basis points for the payoff engine.
 */
import * as React from "react";
import { useActionState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { logDebt, type AddDebtResult } from "@/app/actions/debts";

export function NewDebtForm() {
  const [state, formAction] = useActionState<AddDebtResult | null, FormData>(
    logDebt,
    null,
  );

  return (
    <form action={formAction} style={{ display: "grid", gap: 24 }}>
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 4,
          padding: "32px 36px",
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 32,
        }}
      >
        <div style={{ display: "grid", gap: 22 }}>
          <Field label="Debt name" hint="The card or loan — Discover It, Chase Sapphire, etc.">
            <input
              type="text"
              name="name"
              placeholder="Discover It"
              required
              autoFocus
              style={{
                fontFamily: "var(--font-italiana), serif",
                fontSize: 22,
                color: "var(--ink)",
                background: "var(--cosmos)",
                border: "1px solid var(--line)",
                borderRadius: 2,
                padding: "14px 18px",
                width: "100%",
                outline: 0,
              }}
            />
          </Field>

          <Field label="Balance" hint="What's on the card / left on the loan, in dollars.">
            <MoneyInput
              name="balance"
              placeholder="4,820.00"
              required
            />
          </Field>

          <Field label="APR" hint="Annual percentage rate. 0 if interest-free (e.g. CareCredit promo).">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                alignItems: "baseline",
                gap: 8,
                background: "var(--cosmos)",
                border: "1px solid var(--line)",
                borderRadius: 2,
                padding: "12px 16px",
              }}
            >
              <input
                type="text"
                inputMode="decimal"
                name="apr"
                placeholder="24.99"
                required
                style={{
                  fontFamily: "var(--font-italiana), serif",
                  fontSize: 24,
                  color: "var(--ink)",
                  background: "transparent",
                  border: 0,
                  outline: 0,
                  width: "100%",
                  lineHeight: 1,
                  fontFeatureSettings: '"tnum" 1',
                }}
              />
              <span
                style={{
                  fontFamily: "var(--font-cinzel), serif",
                  fontSize: 14,
                  color: "var(--ink-3)",
                  letterSpacing: "0.18em",
                }}
              >
                % APR
              </span>
            </div>
          </Field>

          <Field label="Min payment" hint="The minimum monthly payment. 0 if it's a 0% promo or paid off.">
            <MoneyInput
              name="minPayment"
              placeholder="96.00"
              required
            />
          </Field>

          <Field label="Due day" hint="The day of the month the payment is due.">
            <input
              type="number"
              name="dueDay"
              min={1}
              max={31}
              defaultValue={15}
              required
              style={{
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: 24,
                color: "var(--ink)",
                background: "var(--cosmos)",
                border: "1px solid var(--line)",
                borderRadius: 2,
                padding: "12px 16px",
                width: "100%",
                outline: 0,
                fontFeatureSettings: '"tnum" 1',
              }}
            />
          </Field>
        </div>

        <div
          style={{
            display: "grid",
            gap: 16,
            alignContent: "start",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-cinzel), serif",
              fontSize: 10.5,
              color: "var(--saturn)",
              letterSpacing: "0.28em",
              textTransform: "uppercase",
            }}
          >
            Saturn · Debt
          </div>
          <p
            style={{
              fontFamily: "var(--font-cormorant), serif",
              fontStyle: "italic",
              fontSize: 14,
              color: "var(--ink-2)",
              lineHeight: 1.5,
            }}
          >
            Once added, this debt appears in the list on <b>/debts</b>, in the per-debt payoff simulator, and on the dashboard's debt simulator. The Saturn vessel pulls money toward the highest-priority debt when you run a paycheck.
          </p>
          <p
            style={{
              fontFamily: "var(--font-cormorant), serif",
              fontStyle: "italic",
              fontSize: 13,
              color: "var(--ink-3)",
              lineHeight: 1.5,
            }}
          >
            The balance you enter is the starting point — Compass will track the originalBalance so the "X% paid" stays stable as you pay it down.
          </p>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <Link
          href="/debts"
          style={{
            fontFamily: "var(--font-cinzel), serif",
            background: "transparent",
            color: "var(--ink-2)",
            border: "1px solid var(--line)",
            borderRadius: 2,
            padding: "12px 22px",
            fontSize: 10.5,
            fontWeight: 500,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            textDecoration: "none",
          }}
        >
          Cancel
        </Link>
        <SubmitButton />
      </div>

      {state?.reason && (
        <div
          style={{
            background: "linear-gradient(90deg, rgba(196, 90, 58, 0.18) 0%, transparent 100%)",
            border: "1px solid var(--neg)",
            borderRadius: 2,
            padding: "12px 18px",
            color: "var(--ink)",
            fontFamily: "var(--font-cormorant), serif",
            fontSize: 14,
            lineHeight: 1.5,
          }}
        >
          {state.reason}
        </div>
      )}
      {state?.ok && (
        <div
          style={{
            background: "linear-gradient(90deg, rgba(106, 176, 136, 0.18) 0%, transparent 100%)",
            border: "1px solid var(--ok)",
            borderRadius: 2,
            padding: "12px 18px",
            color: "var(--ink)",
            fontFamily: "var(--font-cormorant), serif",
            fontSize: 14,
            lineHeight: 1.5,
          }}
        >
          ✓ Debt added. The simulator picks it up on the next render.
        </div>
      )}
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      style={{
        fontFamily: "var(--font-cinzel), serif",
        background: pending ? "var(--ink-3)" : "var(--gold)",
        color: "var(--void)",
        border: 0,
        borderRadius: 2,
        padding: "14px 28px",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        cursor: pending ? "wait" : "pointer",
        boxShadow: pending ? "none" : "0 0 18px rgba(212, 175, 82, 0.35)",
      }}
    >
      {pending ? "Saving…" : "Add this debt →"}
    </button>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        style={{
          fontFamily: "var(--font-cinzel), serif",
          fontSize: 9.5,
          color: "var(--ink-3)",
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      {children}
      {hint && (
        <div
          style={{
            fontFamily: "var(--font-cormorant), serif",
            fontStyle: "italic",
            fontSize: 12,
            color: "var(--ink-3)",
            marginTop: 6,
          }}
        >
          {hint}
        </div>
      )}
    </div>
  );
}

function MoneyInput({
  name,
  placeholder,
  required,
}: {
  name: string;
  placeholder: string;
  required?: boolean;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr",
        alignItems: "baseline",
        gap: 8,
        background: "var(--cosmos)",
        border: "1px solid var(--line)",
        borderRadius: 2,
        padding: "12px 16px",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-italiana), serif",
          fontSize: 24,
          color: "var(--gold-glow)",
          lineHeight: 1,
        }}
      >
        $
      </span>
      <input
        type="text"
        inputMode="decimal"
        name={name}
        placeholder={placeholder}
        required={required}
        style={{
          fontFamily: "var(--font-italiana), serif",
          fontSize: 24,
          color: "var(--ink)",
          background: "transparent",
          border: 0,
          outline: 0,
          width: "100%",
          lineHeight: 1,
          fontFeatureSettings: '"tnum" 1',
        }}
      />
    </div>
  );
}
