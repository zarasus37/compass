import * as React from "react";
import { PageHead } from "@/components/alchemy/PageHead";
import { formatMoney } from "@/lib/money";

export default function InvestPage() {
  return (
    <div>
      <PageHead
        eyebrow="// plan · investment goal"
        title="Investment Goal"
        em="long-horizon growth."
        accent="jupiter"
        actions={
          <button
            type="button"
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
              cursor: "pointer",
              boxShadow: "0 0 16px rgba(45, 212, 191, 0.3)",
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
          borderLeft: "2px solid var(--jupiter)",
          borderRadius: 4,
          padding: 48,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 10,
            fontWeight: 600,
            color: "var(--ink-3)",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            marginBottom: 12,
          }}
        >
          <span style={{ color: "var(--ink-4)" }}>//</span> Target at age 65
        </div>
        <div
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 56,
            fontWeight: 700,
            color: "var(--ink)",
            marginBottom: 8,
            letterSpacing: "-0.01em",
            fontFeatureSettings: '"tnum" 1, "zero" 1',
          }}
        >
          {formatMoney(1_200_000_00)}
        </div>
        <div
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 13,
            color: "var(--ink-3)",
            marginBottom: 32,
            letterSpacing: "0.04em",
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
            color: "var(--terminal-cyan)",
            marginTop: 8,
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          4.2% of the way
        </div>
      </div>
    </div>
  );
}
