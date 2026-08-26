"use client";

/**
 * Compass Vault — bill-schedule client island (Phase 3.5).
 *
 * Renders the full bill-schedule block (header + table + rows +
 * transitions + per-row Edit/Delete actions + the Add-bill button)
 * and owns the editor-modal state. The page (server component)
 * passes the bills + envelopes down; the client island owns the
 * UI state and the modal lifecycle.
 *
 * Why a client island and not a server-rendered schedule with a
 * small client wrapper around the modal? The Edit button needs
 * to lift a *specific bill* up into the modal — state needs to
 * flow from row → modal, and that only works if the rows and
 * the modal share a component. Lifting the whole table into a
 * client component is the smallest change that gets this right
 * without prop-drilling callbacks through three server-rendered
 * helpers.
 *
 * The data shapes (`ScheduledBill`, `VaultEnvelope`) are plain
 * JSON-serializable objects, so the server→client boundary is a
 * non-issue.
 */

import { useMemo, useState } from "react";
import { SectionHeader } from "@/components/alchemy/SectionHeader";
import { BillTransitionMenu } from "@/components/vault/BillTransitionMenu";
import { BillEditor } from "@/components/vault/BillEditor";
import { BillRowActions } from "@/components/vault/BillRowActions";
import { formatMoney } from "@/lib/money";
import { formatShortDate } from "@/lib/format";
import { tone as toneForBadge, userLabel, type BillTone } from "@/lib/vault/state-machine";
import type { ScheduledBill, VaultEnvelope } from "@/lib/vault/types";

type Mode = "add" | "edit" | null;

export function BillScheduleClient({
  bills,
  envelopes,
}: {
  bills: ScheduledBill[];
  envelopes: VaultEnvelope[];
}) {
  const [mode, setMode] = useState<Mode>(null);
  const [editingBill, setEditingBill] = useState<ScheduledBill | null>(null);

  const sorted = useMemo(() => {
    return [...bills].sort((a, b) => {
      if (a.status === "SETTLED" && b.status !== "SETTLED") return 1;
      if (a.status !== "SETTLED" && b.status === "SETTLED") return -1;
      return (
        new Date(a.executionWindowStart).getTime() -
        new Date(b.executionWindowStart).getTime()
      );
    });
  }, [bills]);

  function openAdd() {
    setEditingBill(null);
    setMode("add");
  }
  function openEdit(bill: ScheduledBill) {
    setEditingBill(bill);
    setMode("edit");
  }
  function close() {
    setMode(null);
    setEditingBill(null);
  }

  return (
    <section style={{ marginBottom: 48 }}>
      <SectionHeader
        eyebrow="// bills · scheduled"
        title="Scheduled bills"
        em="the queue your vault is working through."
        accent="cyan"
      />
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr 0.7fr 0.9fr 1fr 0.9fr 0.9fr",
            alignItems: "center",
            padding: "10px 24px",
            background: "var(--vessel-surface)",
            borderBottom: "1px solid var(--line)",
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 9.5,
            fontWeight: 600,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--ink-3)",
          }}
        >
          <div>biller</div>
          <div style={{ textAlign: "right" }}>amount</div>
          <div style={{ textAlign: "right" }}>due</div>
          <div>execution window</div>
          <div>status</div>
          <div style={{ textAlign: "right" }}>provider</div>
        </div>
        {sorted.length === 0 && (
          <div
            data-testid="vault-bill-schedule-empty"
            style={{
              padding: "24px",
              fontFamily: "var(--font-sora)",
              fontSize: 13,
              color: "var(--ink-3)",
              textAlign: "center",
            }}
          >
            No bills yet. Add one below to start your schedule.
          </div>
        )}
        {sorted.map((b, i) => (
          <BillRow
            key={b.id}
            bill={b}
            isLast={i === sorted.length - 1}
            onEdit={openEdit}
          />
        ))}
      </div>

      <div
        style={{
          marginTop: 16,
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        <button
          type="button"
          onClick={openAdd}
          data-testid="vault-add-bill-button"
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            padding: "10px 18px",
            background: "var(--vessel-accent)",
            color: "var(--void)",
            border: "1px solid var(--vessel-accent)",
            borderRadius: 2,
            cursor: "pointer",
            boxShadow: "var(--vessel-neon-glow)",
          }}
        >
          [+] Add bill
        </button>
      </div>

      <BillEditor
        envelopes={envelopes}
        mode={mode}
        bill={editingBill}
        onClose={close}
      />
    </section>
  );
}

function BillRow({
  bill,
  isLast,
  onEdit,
}: {
  bill: ScheduledBill;
  isLast: boolean;
  onEdit: (bill: ScheduledBill) => void;
}) {
  const label = userLabel(bill.status);
  const billTone = toneForBadge(bill.status);
  return (
    <div
      data-testid={`vault-bill-row-${bill.id}`}
      data-bill-source={bill.source ?? "seed"}
      style={{
        padding: "14px 24px 8px",
        borderBottom: isLast ? "none" : "1px solid var(--line-soft)",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.4fr 0.7fr 0.9fr 1fr 0.9fr 0.9fr",
          alignItems: "center",
          gap: 20,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "var(--font-sora)",
              fontSize: 15,
              fontWeight: 500,
              color: "var(--ink)",
              lineHeight: 1.2,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span>{bill.billerName}</span>
            {bill.source === "user" && (
              <span
                data-testid={`vault-bill-source-user-${bill.id}`}
                title="User-added bill (survives re-sync)"
                style={{
                  fontFamily: "var(--font-jetbrains), monospace",
                  fontSize: 8.5,
                  fontWeight: 700,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "var(--vessel-accent)",
                  border: "1px solid var(--vessel-accent)",
                  padding: "1px 5px",
                  borderRadius: 2,
                }}
              >
                USER
              </span>
            )}
          </div>
          <div
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 10.5,
              color: "var(--ink-3)",
              marginTop: 3,
              letterSpacing: "0.04em",
            }}
          >
            {bill.maskedAccountNumber} · {bill.frequency}
          </div>
        </div>
        <div
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 14,
            color: "var(--ink)",
            textAlign: "right",
            fontFeatureSettings: '"tnum" 1, "zero" 1',
            fontWeight: 500,
          }}
        >
          {formatMoney(bill.amount)}
        </div>
        <div
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 12,
            color: "var(--ink-2)",
            textAlign: "right",
          }}
        >
          {formatShortDate(bill.dueDate)}
        </div>
        <div
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 10.5,
            color: "var(--ink-3)",
            letterSpacing: "0.04em",
          }}
        >
          {formatShortDate(bill.executionWindowStart)} →{" "}
          {formatShortDate(bill.executionWindowEnd)}
        </div>
        <div>
          <StatusBadge label={label} tone={billTone} />
        </div>
        <div
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 10.5,
            color: "var(--ink-3)",
            textAlign: "right",
            letterSpacing: "0.04em",
          }}
        >
          {bill.providerPreference ?? "auto"}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 4,
        }}
      >
        <BillTransitionMenu billId={bill.id} status={bill.status} />
        <BillRowActions bill={bill} onEdit={onEdit} />
      </div>
    </div>
  );
}

function StatusBadge({ label, tone }: { label: string; tone: BillTone }) {
  const color =
    tone === "ok"
      ? "var(--ok)"
      : tone === "warn"
        ? "var(--warn)"
        : tone === "cyan"
          ? "var(--terminal-cyan)"
          : "var(--ink-3)";
  const marker =
    tone === "ok"
      ? "[OK]"
      : tone === "warn"
        ? "[WARN]"
        : tone === "cyan"
          ? "[SIGIL]"
          : "[—]";
  return (
    <span
      data-testid="vault-bill-badge"
      data-status-label={label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontFamily: "var(--font-jetbrains), monospace",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color,
        border: `1px solid ${color}`,
        padding: "3px 7px",
        borderRadius: 2,
      }}
    >
      {marker} {label}
    </span>
  );
}
