import * as React from "react";
import { PageHead } from "@/components/alchemy/PageHead";
import { formatMoney } from "@/lib/money";
import { formatShortDate } from "@/lib/format";

export default function EmergencyPage() {
  return (
    <div>
      <PageHead
        eyebrow="Plan · Emergency Fund"
        title="Emergency Fund"
        em="the safety net."
        accent="jupiter"
        actions={
          <button
            type="button"
            style={{
              fontFamily: "var(--font-cinzel), serif",
              background: "var(--gold)",
              color: "var(--void)",
              border: 0,
              borderRadius: 2,
              padding: "12px 22px",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Adjust target
          </button>
        }
        explanation={
          <>
            Three to six months of essential expenses, set aside and not touched. The Jupiter vessel feeds this fund automatically. You'll see it on the dashboard as your top priority. When it hits the target, you can retire it, raise the target, or let it keep growing.
          </>
        }
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, marginBottom: 32 }}>
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--jupiter)",
            borderRadius: 4,
            padding: 32,
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-cinzel), serif",
              fontSize: 9.5,
              color: "var(--jupiter)",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            Saved
          </div>
          <div
            style={{
              fontFamily: "var(--font-italiana), var(--font-cinzel), serif",
              fontSize: 48,
              color: "var(--ink)",
              marginBottom: 4,
            }}
          >
            {formatMoney(6_800_00)}
          </div>
          <div style={{ fontFamily: "var(--font-cormorant), serif", fontStyle: "italic", fontSize: 14, color: "var(--ink-3)" }}>
            of {formatMoney(20_000_00)} target
          </div>
          <div
            style={{
              position: "relative",
              height: 8,
              background: "var(--cosmos)",
              border: "1px solid var(--line-soft)",
              marginTop: 18,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: "0 auto 0 0",
                width: "34%",
                background: "linear-gradient(90deg, var(--jupiter), var(--venus))",
                boxShadow: "0 0 12px var(--jupiter)",
              }}
            />
          </div>
        </div>

        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 4,
            padding: 32,
          }}
        >
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
            Target reached
          </div>
          <div
            style={{
              fontFamily: "var(--font-italiana), var(--font-cinzel), serif",
              fontSize: 32,
              color: "var(--ink)",
              marginBottom: 4,
            }}
          >
            Feb 2026
          </div>
          <div style={{ fontFamily: "var(--font-cormorant), serif", fontStyle: "italic", fontSize: 14, color: "var(--ink-3)" }}>
            6 months away at current pace
          </div>
          <div style={{ marginTop: 18, fontFamily: "var(--font-cormorant), serif", fontSize: 14, color: "var(--ink-2)" }}>
            +{formatMoney(432_00)} per paycheck · {formatShortDate(new Date("2026-08-15"))} last contribution
          </div>
        </div>
      </div>

      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 4,
          padding: "24px 28px",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-cinzel), serif",
            fontSize: 10.5,
            color: "var(--gold)",
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          Why $20,000?
        </div>
        <p
          style={{
            fontFamily: "var(--font-cormorant), serif",
            fontSize: 17,
            lineHeight: 1.55,
            color: "var(--ink-2)",
            margin: 0,
          }}
        >
          Based on your essential monthly expenses (rent + utilities + groceries + insurance ≈ $3,800) × 5 months of runway. You can adjust the target any time — most people settle on 3 to 6 months of expenses. The fund stays in cash (or a high-yield savings account) so it's there when you need it.
        </p>
      </div>
    </div>
  );
}
