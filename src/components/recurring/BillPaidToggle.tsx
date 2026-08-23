"use client";

/**
 * BillPaidToggle — single-button Paid/Unpaid flip for a recurring bill.
 *
 * Per Cluster 1.8: a single click flips `paidAt` on the bill, writes
 * an audit entry, and revalidates the pages that surface bill state.
 * No modal, no confirmation — the toggle is the entire action.
 *
 * Style: a small pill that shifts from outline ("Unpaid") to filled
 * gold ("Paid") when toggled. Disabled while pending.
 */

import * as React from "react";
import { useTransition, useOptimistic, useRef } from "react";
import { toggleBillPaid } from "@/app/actions/bills";

export function BillPaidToggle({
  billId,
  initialPaid,
}: {
  billId: string;
  initialPaid: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [optimisticPaid, setOptimisticPaid] = useOptimistic(initialPaid);
  const lastSyncedPaid = useRef(initialPaid);

  // Keep ref in sync after server confirms the change (so a re-render
  // doesn't show the toggle stuck in the optimistic state).
  React.useEffect(() => {
    if (!isPending) lastSyncedPaid.current = optimisticPaid;
  }, [isPending, optimisticPaid]);

  const onClick = () => {
    const next = !optimisticPaid;
    startTransition(async () => {
      setOptimisticPaid(next);
      const fd = new FormData();
      fd.set("billId", billId);
      fd.set("paid", String(next));
      await toggleBillPaid(null, fd);
    });
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isPending}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontFamily: "var(--font-jetbrains), monospace",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        padding: "6px 12px",
        borderRadius: 2,
        cursor: isPending ? "wait" : "pointer",
        background: optimisticPaid ? "var(--ok)" : "transparent",
        color: optimisticPaid ? "var(--void)" : "var(--ink-2)",
        border: `1px solid ${optimisticPaid ? "var(--ok)" : "var(--line)"}`,
        transition: "background 150ms ease, color 150ms ease, border 150ms ease",
        boxShadow: optimisticPaid
          ? "0 0 10px rgba(74, 222, 128, 0.35)"
          : "none",
      }}
      aria-pressed={optimisticPaid}
    >
      <span aria-hidden style={{ fontSize: 12, lineHeight: 1 }}>
        {optimisticPaid ? "✓" : "○"}
      </span>
      {isPending
        ? optimisticPaid
          ? "Marking…"
          : "Unmarking…"
        : optimisticPaid
        ? "Paid"
        : "Unpaid"}
    </button>
  );
}
