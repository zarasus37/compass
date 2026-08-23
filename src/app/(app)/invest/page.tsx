import * as React from "react";
import { PageHead } from "@/components/alchemy/PageHead";
import { formatMoney } from "@/lib/money";

export default function InvestPage() {
  return (
    <div>
      <PageHead
        eyebrow="Plan · Investment goal"
        title="Investment Goal"
        em="long-horizon growth."
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
            A separate goal from the emergency fund — for the long view, not the rainy day. Target age, target amount, monthly contribution. Compounding does most of the work; your job is to keep feeding it and not panic when the market dips.
          </>
        }
      />

      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: 4,
          padding: 48,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-cinzel), serif",
            fontSize: 10,
            color: "var(--ink-3)",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            marginBottom: 12,
          }}
        >
          Target at age 65
        </div>
        <div
          style={{
            fontFamily: "var(--font-italiana), var(--font-cinzel), serif",
            fontSize: 64,
            color: "var(--ink)",
            marginBottom: 8,
            letterSpacing: "-0.01em",
          }}
        >
          {formatMoney(1_200_000_00)}
        </div>
        <div
          style={{
            fontFamily: "var(--font-cormorant), serif",
            fontStyle: "italic",
            fontSize: 16,
            color: "var(--ink-3)",
            marginBottom: 32,
          }}
        >
          from {formatMoney(50_800_00)} today · {formatMoney(400_00)} / month for 22 years
        </div>
        <div
          style={{
            maxWidth: 480,
            margin: "0 auto",
            position: "relative",
            height: 8,
            background: "var(--cosmos)",
            border: "1px solid var(--line-soft)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: "0 auto 0 0",
              width: "4.2%",
              background: "linear-gradient(90deg, var(--jupiter), var(--venus))",
              boxShadow: "0 0 12px var(--jupiter)",
            }}
          />
        </div>
        <div
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 11,
            color: "var(--ink-3)",
            marginTop: 8,
          }}
        >
          4.2% of the way
        </div>
      </div>
    </div>
  );
}
