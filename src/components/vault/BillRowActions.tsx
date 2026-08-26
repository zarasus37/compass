"use client";

/**
 * Compass Vault — per-bill action row (Phase 3.5).
 *
 * Renders two small terminal-style buttons next to the bill's
 * transition menu: an [EDIT] button that lifts the bill up into
 * the editor modal, and a [DELETE] button that confirms via
 * `window.confirm` and then calls `deleteBillFromPage`.
 *
 * The editor is owned by the parent (`BillScheduleClient`) so the
 * two siblings can share state — this component just emits
 * "edit this bill" via a callback. The parent decides which
 * modal to show.
 *
 * Server actions are called via `useTransition`; the page
 * revalidates with `router.refresh()` on success so the table
 * re-renders the new state.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteBillFromPage } from "@/lib/vault/actions";
import type { ScheduledBill } from "@/lib/vault/types";

export function BillRowActions({
  bill,
  onEdit,
}: {
  bill: ScheduledBill;
  onEdit: (bill: ScheduledBill) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onDelete() {
    if (pending) return;
    const ok = window.confirm(
      `Delete "${bill.billerName}" from your vault? This cannot be undone (the audit log keeps a record, but the bill is gone from your schedule).`,
    );
    if (!ok) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteBillFromPage(bill.id);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div
      data-testid={`bill-row-actions-${bill.id}`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        marginLeft: 12,
      }}
    >
      <button
        type="button"
        onClick={() => onEdit(bill)}
        disabled={pending}
        data-testid={`vault-edit-bill-button-${bill.id}`}
        title="Edit this bill"
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 9.5,
          fontWeight: 600,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          padding: "4px 8px",
          background: "transparent",
          color: "var(--vessel-accent)",
          border: "1px solid var(--vessel-accent)",
          borderRadius: 2,
          cursor: pending ? "wait" : "pointer",
        }}
      >
        Edit
      </button>
      <button
        type="button"
        onClick={onDelete}
        disabled={pending}
        data-testid={`vault-delete-bill-button-${bill.id}`}
        title="Delete this bill"
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 9.5,
          fontWeight: 600,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          padding: "4px 8px",
          background: "transparent",
          color: "var(--vessel-over)",
          border: "1px solid var(--vessel-over)",
          borderRadius: 2,
          cursor: pending ? "wait" : "pointer",
        }}
      >
        Delete
      </button>
      {error && (
        <div
          role="alert"
          data-testid={`bill-row-actions-error-${bill.id}`}
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 10,
            color: "var(--vessel-over)",
            marginLeft: 8,
          }}
        >
          [WARN] {error}
        </div>
      )}
    </div>
  );
}
