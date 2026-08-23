/**
 * CriticalTimelineCard — the mid-fold "what's coming up" card.
 *
 * Shows the next 2-3 unpaid bills ordered by proximity. Each row
 * surfaces the bill's name + amount and a color-coded time-remaining
 * badge. The badge palette:
 *   - "Overdue" → iron-red, urgent
 *   - "Today"   → gold (action now)
 *   - "Tomorrow" → warn yellow
 *   - "In N days" → neutral ink, weighted darker as N shrinks
 *   - "Next period" → ink-3 (further out, less urgent)
 *
 * Tap-through → /recurring, where the user can flip Paid, see the
 * full timeline strip, and add new bills.
 *
 * If the period is fully paid (no unpaid bills in the next 14 days),
 * the card calms to a jade summary so the user can scan past it
 * quickly. This matches the iron-red ≠ iron-red button rule: the
 * calm state is intentional, not absent.
 */

import * as React from "react";
import { formatMoney } from "@/lib/money";
import { formatShortDate } from "@/lib/format";
import { TODAY, NEXT_PAY_DATE } from "@/lib/mock";

export interface CriticalTimelineRow {
  id: string;
  name: string;
  amountCents: number;
  dueDate: Date;
  isPaid: boolean;
  autopay: boolean;
  envelopeName: string | null;
}

export interface CriticalTimelineCardData {
  rows: CriticalTimelineRow[];
}

const DAY = 1000 * 60 * 60 * 24;

function diffDays(target: Date, now: Date): number {
  const t0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - t0.getTime()) / DAY);
}

export function CriticalTimelineCard({ data }: { data: CriticalTimelineCardData }) {
  const { rows } = data;
  const calm = rows.length === 0;

  return (
    <div
      style={{
        background: calm ? "var(--cosmos-2)" : "var(--cosmos-2)",
        border: "1px solid var(--line-soft)",
        borderRadius: 3,
        overflow: "hidden",
      }}
    >
      {calm ? (
        <div
          style={{
            padding: "26px 24px",
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            aria-hidden
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              fontSize: 18,
              color: "var(--ok)",
              background: "rgba(106, 176, 136, 0.10)",
              border: "1px solid var(--ok)",
              flexShrink: 0,
            }}
          >
            ✓
          </div>
          <div>
            <div
              style={{
                fontFamily: "var(--font-italiana), var(--font-cinzel), serif",
                fontSize: 18,
                color: "var(--ink)",
                marginBottom: 2,
              }}
            >
              Nothing due in the next 14 days.
            </div>
            <div
              style={{
                fontFamily: "var(--font-cormorant), serif",
                fontSize: 14,
                color: "var(--ink-2)",
              }}
            >
              Next paycheck {formatShortDate(NEXT_PAY_DATE)} — you&apos;re clear.
            </div>
          </div>
        </div>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {rows.slice(0, 3).map((row, i) => {
            const diff = diffDays(row.dueDate, TODAY);
            const badge = timeBadge(diff, row.isPaid);
            return (
              <li
                key={row.id}
                style={{
                  padding: "16px 22px",
                  borderTop: i === 0 ? "0" : "1px solid var(--line-soft)",
                  display: "grid",
                  gridTemplateColumns: "1fr auto auto",
                  alignItems: "center",
                  gap: 18,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: "var(--font-italiana), var(--font-cinzel), serif",
                      fontSize: 18,
                      color: "var(--ink)",
                      lineHeight: 1.1,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {row.name}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-cormorant), serif",
                      fontSize: 12.5,
                      color: "var(--ink-3)",
                      marginTop: 4,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <span>due {formatShortDate(row.dueDate)}</span>
                    {row.autopay && (
                      <>
                        <span
                          aria-hidden
                          style={{
                            width: 3,
                            height: 3,
                            borderRadius: "50%",
                            background: "var(--ink-4)",
                          }}
                        />
                        <span>autopay</span>
                      </>
                    )}
                    {row.envelopeName && (
                      <>
                        <span
                          aria-hidden
                          style={{
                            width: 3,
                            height: 3,
                            borderRadius: "50%",
                            background: "var(--ink-4)",
                          }}
                        />
                        <span>{row.envelopeName}</span>
                      </>
                    )}
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-jetbrains), monospace",
                    fontSize: 15,
                    color: "var(--ink)",
                    fontFeatureSettings: '"tnum" 1',
                  }}
                >
                  {formatMoney(row.amountCents)}
                </div>
                <TimeBadge {...badge} />
              </li>
            );
          })}
          {rows.length > 3 && (
            <li
              style={{
                padding: "12px 22px",
                borderTop: "1px solid var(--line-soft)",
                fontFamily: "var(--font-cinzel), serif",
                fontSize: 10,
                color: "var(--ink-3)",
                letterSpacing: "0.20em",
                textTransform: "uppercase",
                textAlign: "right",
              }}
            >
              + {rows.length - 3} more in the queue
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

function TimeBadge({
  label,
  accent,
  outline,
}: {
  label: string;
  accent: string;
  outline: boolean;
}) {
  return (
    <span
      style={{
        fontFamily: "var(--font-cinzel), serif",
        fontSize: 9.5,
        fontWeight: 600,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        color: accent,
        background: outline ? "transparent" : hexA(accent, 0.12),
        border: `1px solid ${accent}`,
        borderRadius: 2,
        padding: "5px 10px",
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      {label}
    </span>
  );
}

function timeBadge(
  diff: number,
  isPaid: boolean,
): { label: string; accent: string; outline: boolean } {
  if (isPaid) return { label: "Paid", accent: "var(--ok)", outline: false };
  if (diff < 0) return { label: "Overdue", accent: "var(--neg)", outline: false };
  if (diff === 0) return { label: "Today", accent: "var(--gold)", outline: false };
  if (diff === 1) return { label: "Tomorrow", accent: "var(--warn)", outline: true };
  if (diff <= 7) return { label: `In ${diff} days`, accent: "var(--ink)", outline: true };
  if (diff <= 14) return { label: `In ${diff} days`, accent: "var(--ink-2)", outline: true };
  return { label: "Next period", accent: "var(--ink-3)", outline: true };
}

/** rgba(hex, alpha) — minimal helper to give a soft tint for badges. */
function hexA(hex: string, alpha: number): string {
  if (!hex.startsWith("#") || hex.length < 7) return "transparent";
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
