"use client";

/**
 * Cluster 7.16 — Change Password form (client component).
 *
 * React 19 `useActionState` against the change-password server action.
 * Three password fields (old / new / confirm) with per-field error
 * rendering + a top-of-form error for whole-form failures. On
 * success, the form is replaced by a green-bordered card.
 *
 * Matches the /settings hub's Oracle Terminal voice: eyebrow +
 * JetBrains Mono labels + Sora text + the design-system tokens
 * (--ink-*, --vessel-*). The form is a `<form action={formAction}>`
 * with `useFormStatus` driving the button's `pending` state.
 *
 * Test IDs (smoke-bill-history precedent):
 *   data-testid="change-password-form"  — the form root
 *   data-testid="change-password-old"    — the old-password input
 *   data-testid="change-password-new"    — the new-password input
 *   data-testid="change-password-confirm" — the confirm input
 *   data-testid="change-password-error-<field>" — the per-field error span
 *   data-testid="change-password-top-error"    — top-level error
 *   data-testid="change-password-success"     — the success card
 *   data-testid="change-password-submit"       — the Save button
 */
import Link from "next/link";
import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import {
  changePasswordAction,
  type ChangePasswordState,
} from "./password-actions";

const INITIAL: ChangePasswordState = { ok: false };

export function ChangePasswordForm() {
  const [state, formAction] = useActionState<
    ChangePasswordState,
    FormData
  >(changePasswordAction, INITIAL);
  const oldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    oldRef.current?.focus();
  }, []);

  if (state.ok) {
    return (
      <div
        data-testid="change-password-success"
        style={{
          border: "1px solid var(--ok)",
          background: "var(--ok-bg)",
          color: "var(--ok-text)",
          padding: "16px 20px",
          borderRadius: 4,
          marginTop: 24,
          fontFamily: "var(--font-sora)",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 10,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--ok)",
            marginBottom: 6,
          }}
        >
          [OK] PASSWORD CHANGED
        </div>
        <div style={{ fontSize: 14, lineHeight: 1.55, marginBottom: 12 }}>
          Your password is updated. Every other device signed in to
          Compass will be signed out and need to log back in with
          the new password.
        </div>
        <Link
          href="/settings"
          data-testid="change-password-done"
          style={{
            display: "inline-block",
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 11,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            padding: "6px 12px",
            border: "1px solid var(--ok)",
            color: "var(--ok)",
            textDecoration: "none",
          }}
        >
          ↓ Done
        </Link>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      noValidate
      data-testid="change-password-form"
      style={{ marginTop: 24 }}
    >
      {state.error ? (
        <div
          data-testid="change-password-top-error"
          role="alert"
          style={{
            border: "1px solid var(--neg)",
            background: "var(--neg-bg)",
            color: "var(--neg-text)",
            padding: "10px 14px",
            borderRadius: 4,
            marginBottom: 16,
            fontFamily: "var(--font-sora)",
            fontSize: 13.5,
          }}
        >
          {state.error}
        </div>
      ) : null}

      <PasswordField
        name="old"
        label="Current password"
        testId="change-password-old"
        error={state.fieldErrors?.old}
        inputRef={oldRef}
      />
      <PasswordField
        name="new"
        label="New password"
        testId="change-password-new"
        error={state.fieldErrors?.new}
        hint="At least 12 characters."
      />
      <PasswordField
        name="confirm"
        label="Confirm new password"
        testId="change-password-confirm"
        error={state.fieldErrors?.confirm}
      />

      <div
        style={{
          marginTop: 24,
          display: "flex",
          gap: 12,
          alignItems: "center",
        }}
      >
        <SaveButton />
        <Link
          href="/settings"
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 11,
            color: "var(--ink-3)",
            textDecoration: "none",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            padding: "8px 0",
          }}
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      data-testid="change-password-submit"
      style={{
        fontFamily: "var(--font-jetbrains), monospace",
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        padding: "10px 18px",
        background: pending ? "var(--ink-4)" : "var(--gold)",
        color: "var(--ink)",
        border: "none",
        borderRadius: 2,
        cursor: pending ? "not-allowed" : "pointer",
      }}
    >
      {pending ? "Saving…" : "Save new password"}
    </button>
  );
}

function PasswordField({
  name,
  label,
  testId,
  error,
  hint,
  inputRef,
}: {
  name: "old" | "new" | "confirm";
  label: string;
  testId: string;
  error?: string;
  hint?: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}) {
  const errorId = `${testId}-error`;
  return (
    <div style={{ marginBottom: 16 }}>
      <label
        htmlFor={testId}
        style={{
          display: "block",
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 10.5,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--ink-3)",
          marginBottom: 6,
        }}
      >
        {label}
      </label>
      <input
        ref={inputRef}
        id={testId}
        name={name}
        type="password"
        autoComplete={
          name === "old"
            ? "current-password"
            : name === "new"
              ? "new-password"
              : "new-password"
        }
        required
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error ? errorId : undefined}
        data-testid={testId}
        style={{
          width: "100%",
          maxWidth: 420,
          padding: "10px 12px",
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 14,
          color: "var(--ink)",
          background: "var(--vessel-surface)",
          border: `1px solid ${error ? "var(--neg)" : "var(--vessel-border)"}`,
          borderRadius: 2,
          outline: "none",
        }}
      />
      {error ? (
        <p
          id={errorId}
          data-testid={`change-password-error-${name}`}
          style={{
            fontFamily: "var(--font-sora)",
            fontSize: 12.5,
            color: "var(--neg)",
            marginTop: 6,
          }}
        >
          {error}
        </p>
      ) : hint ? (
        <p
          style={{
            fontFamily: "var(--font-sora)",
            fontSize: 12,
            color: "var(--ink-4)",
            marginTop: 6,
          }}
        >
          {hint}
        </p>
      ) : null}
    </div>
  );
}
