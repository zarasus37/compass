import * as React from "react";
import Link from "next/link";
import { PageHead } from "@/components/alchemy/PageHead";
import { VesselGlyph } from "@/components/alchemy/VesselGlyph";
import { liveEnvelopes, liveTransactions, TODAY } from "@/lib/mock";
import { formatMoneySigned } from "@/lib/money";
import { formatShortDate, formatRelativeDate } from "@/lib/format";

export const dynamic = "force-dynamic";

/**
 * Transactions — articulated deep page.
 *
 * Component Oracle Terminal treatment: Sora title, JetBrains Mono
 * for amounts/dates, mono caps labels. Primary CTA in terminal-cyan.
 */
export default function TransactionsPage() {
  const TRANSACTIONS = liveTransactions();
  const ENVELOPES = liveEnvelopes();
  const grouped = new Map<string, typeof TRANSACTIONS>();
  for (const t of TRANSACTIONS) {
    const key = t.date.toDateString();
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(t);
  }
  const dayKeys = Array.from(grouped.keys()).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  const envById = new Map(ENVELOPES.map((e) => [e.id, e]));

  return (
    <div>
      <PageHead
        eyebrow="// money · transactions"
        title="The Record"
        em="every dollar in, every dollar out."
        accent="cyan"
        actions={
          <Link
            href="/transactions/new"
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              background: "var(--terminal-cyan)",
              color: "var(--void)",
              border: 0,
              borderRadius: 2,
              padding: "12px 22px",
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              textDecoration: "none",
              boxShadow: "0 0 16px rgba(45, 212, 191, 0.3)",
            }}
          >
            + Log a transaction
          </Link>
        }
        explanation={
          <>
            Every transaction Compass has tracked, organized by day. Each row is tagged with the vessel it came from or went to. Search by payee, filter by envelope, or click any day to see what happened. The full record is yours — it never gets deleted.
          </>
        }
      />

      <section
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 32,
        }}
      >
        <input
          type="search"
          placeholder="Search payees, amounts, notes…"
          style={{
            flex: 1,
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 2,
            padding: "12px 16px",
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 13,
            color: "var(--ink)",
            outline: "none",
          }}
        />
        <select
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 2,
            padding: "12px 16px",
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 11,
            color: "var(--ink-2)",
            letterSpacing: "0.10em",
            textTransform: "uppercase",
          }}
          defaultValue="all"
        >
          <option value="all">All envelopes</option>
          {ENVELOPES.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
        <Link
          href="/transactions/new"
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            background: "var(--terminal-cyan)",
            color: "var(--void)",
            border: 0,
            borderRadius: 2,
            padding: "10px 18px",
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            textDecoration: "none",
          }}
        >
          + Add transaction
        </Link>
      </section>

      <section>
        {dayKeys.map((dateKey) => {
          const txs = grouped.get(dateKey)!;
          const date = new Date(dateKey);
          const total = txs.reduce((s, t) => s + t.amountCents, 0);
          return (
            <div key={dateKey} style={{ marginBottom: 32 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  justifyContent: "space-between",
                  padding: "10px 24px",
                  background: "var(--cosmos)",
                  border: "1px solid var(--line)",
                  marginBottom: 0,
                }}
              >
                <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
                  <span
                    style={{
                      fontFamily: "var(--font-sora)",
                      fontSize: 18,
                      fontWeight: 600,
                      color: "var(--ink)",
                    }}
                  >
                    {formatShortDate(date)}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--font-jetbrains), monospace",
                      fontSize: 11,
                      color: "var(--ink-3)",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {formatRelativeDate(date, TODAY)}
                  </span>
                </div>
                <span
                  style={{
                    fontFamily: "var(--font-jetbrains), monospace",
                    fontSize: 13,
                    color: total > 0 ? "var(--ok)" : "var(--ink-3)",
                    fontFeatureSettings: '"tnum" 1, "zero" 1',
                    fontWeight: 500,
                  }}
                >
                  {formatMoneySigned(total)} · {txs.length} {txs.length === 1 ? "entry" : "entries"}
                </span>
              </div>
              <div
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--line)",
                  borderTop: 0,
                }}
              >
                {txs.map((t, i) => {
                  const env = t.envelope ? envById.get(t.envelope) : null;
                  return (
                    <div
                      key={t.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "44px 1fr 100px 100px",
                        alignItems: "center",
                        gap: 16,
                        padding: "14px 24px",
                        borderBottom:
                          i < txs.length - 1 ? "1px solid var(--line-soft)" : "none",
                      }}
                    >
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 2,
                          display: "grid",
                          placeItems: "center",
                          background: "var(--cosmos)",
                          border: "1px solid var(--line-soft)",
                        }}
                      >
                        {env ? <VesselGlyph planet={env.planet} size={16} /> : <span style={{ fontSize: 16, color: "var(--terminal-cyan)" }}>↑</span>}
                      </div>
                      <div>
                        <div
                          style={{
                            fontFamily: "var(--font-sora)",
                            color: "var(--ink)",
                            fontSize: 15,
                            fontWeight: 500,
                          }}
                        >
                          {t.payee}
                        </div>
                        <div
                          style={{
                            fontFamily: "var(--font-jetbrains), monospace",
                            fontSize: 10.5,
                            color: "var(--ink-3)",
                            marginTop: 2,
                            letterSpacing: "0.04em",
                          }}
                        >
                          {env?.name ?? (t.isIncome ? "Income" : "Uncategorized")} ·{" "}
                          {t.isAuto ? "AUTO · " : ""}
                          {t.isIncome ? "income" : "expense"}
                        </div>
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--font-jetbrains), monospace",
                          fontSize: 9.5,
                          fontWeight: 600,
                          color: "var(--ink-3)",
                          letterSpacing: "0.18em",
                          textTransform: "uppercase",
                        }}
                      >
                        {env ? env.name : "—"}
                      </div>
                      <div
                        style={{
                          fontFamily: "var(--font-jetbrains), monospace",
                          fontSize: 14,
                          color: t.amountCents > 0 ? "var(--ok)" : "var(--ink)",
                          textAlign: "right",
                          fontFeatureSettings: '"tnum" 1, "zero" 1',
                          fontWeight: 500,
                        }}
                      >
                        {formatMoneySigned(t.amountCents)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
