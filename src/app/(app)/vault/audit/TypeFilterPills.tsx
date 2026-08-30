/**
 * TypeFilterPills — actionType filter row.
 *
 * Two filter rows:
 *   1. Type pills ("All" + one per distinct type, capped at 12;
 *      the rest collapse under "+ N more" which expands the
 *      list to show everything). Each pill shows the type name
 *      + count.
 *   2. Prefix filter (one button per distinct prefix in the
 *      user's data: `vault.`, `auto_`, `plan_`, etc.). Only
 *      shown if there's more than one prefix.
 *
 * Plus a small free-text `?q=` search input (plain HTML form,
 * GET method → same URL with `q` set). The page is server-
 * rendered, so the URL is the source of truth.
 *
 * Server component, pure render. The pills are <Link> elements
 * (no client islands needed).
 */
import * as React from "react";
import Link from "next/link";
import type { AuditLogTypeCount } from "@/lib/vault/audit-log";
import { colorForActionType } from "@/lib/vault/audit-log";

const MAX_VISIBLE = 12;

export function TypeFilterPills({
  types,
  total,
  currentType,
  currentPrefix,
  currentQ,
  prefixes,
}: {
  types: AuditLogTypeCount[];
  total: number;
  currentType?: string;
  currentPrefix?: string;
  currentQ?: string;
  prefixes: string[];
}) {
  const allHref = buildHref({ type: undefined, prefix: currentPrefix, q: currentQ });
  const visible = types.slice(0, MAX_VISIBLE);
  const overflow = types.length - MAX_VISIBLE;
  return (
    <div
      data-testid="vault-audit-type-filter"
      style={{
        background: "var(--vessel-surface)",
        border: "1px solid var(--vessel-border)",
        padding: "14px 18px",
        marginBottom: 16,
        fontFamily: "var(--font-jetbrains), monospace",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: prefixes.length > 1 ? 10 : 0,
        }}
      >
        <span
          style={{
            fontSize: 9.5,
            color: "var(--ink-3)",
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            marginRight: 4,
          }}
        >
          // filter
        </span>
        <FilterPill
          href={allHref}
          active={!currentType}
          label="All"
          count={total}
          color="var(--vessel-accent)"
          testid="vault-audit-type-pill-all"
        />
        {visible.map((t) => {
          const href = buildHref({
            type: t.actionType,
            prefix: currentPrefix,
            q: currentQ,
          });
          return (
            <FilterPill
              key={t.actionType}
              href={href}
              active={t.actionType === currentType}
              label={t.actionType}
              count={t.count}
              color={colorForActionType(t.actionType)}
              testid={`vault-audit-type-pill-${t.actionType.replace(/[^a-z0-9]/gi, "-")}`}
            />
          );
        })}
        {overflow > 0 ? (
          <span
            style={{
              fontSize: 10,
              color: "var(--ink-3)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
            }}
            data-testid="vault-audit-type-overflow"
          >
            + {overflow} more
          </span>
        ) : null}
        {/* Free-text search */}
        <form
          method="get"
          action="/vault/audit"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginLeft: "auto",
          }}
        >
          {currentPrefix ? (
            <input type="hidden" name="prefix" value={currentPrefix} />
          ) : null}
          <input
            type="text"
            name="q"
            defaultValue={currentQ ?? ""}
            placeholder="search action types…"
            data-testid="vault-audit-q-input"
            style={{
              background: "var(--vessel-dark)",
              border: "1px solid var(--vessel-border)",
              color: "var(--ink-1)",
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 10.5,
              padding: "4px 8px",
              borderRadius: 2,
              width: 200,
              letterSpacing: "0.05em",
            }}
          />
          <button
            type="submit"
            data-testid="vault-audit-q-submit"
            style={{
              background: "transparent",
              border: "1px solid var(--vessel-accent)",
              color: "var(--vessel-accent)",
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              padding: "4px 10px",
              borderRadius: 2,
              cursor: "pointer",
            }}
          >
            [GO]
          </button>
          {currentQ || currentType ? (
            <Link
              href={buildHref({ type: undefined, prefix: currentPrefix, q: undefined })}
              data-testid="vault-audit-clear"
              style={{
                fontSize: 10,
                color: "var(--ink-3)",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                textDecoration: "none",
                marginLeft: 4,
              }}
            >
              [CLEAR]
            </Link>
          ) : null}
        </form>
      </div>
      {prefixes.length > 1 ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontSize: 9.5,
              color: "var(--ink-3)",
              textTransform: "uppercase",
              letterSpacing: "0.18em",
              marginRight: 4,
            }}
          >
            // prefix
          </span>
          <PrefixPill
            href={buildHref({ type: currentType, prefix: undefined, q: currentQ })}
            active={!currentPrefix}
            label="*"
            testid="vault-audit-prefix-pill-all"
          />
          {prefixes.map((p) => {
            const href = buildHref({
              type: currentType,
              prefix: p,
              q: currentQ,
            });
            return (
              <PrefixPill
                key={p}
                href={href}
                active={p === currentPrefix}
                label={p}
                testid={`vault-audit-prefix-pill-${p.replace(/[^a-z0-9]/gi, "-")}`}
              />
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function buildHref(args: {
  type?: string;
  prefix?: string;
  q?: string;
}): string {
  const params = new URLSearchParams();
  if (args.type) params.set("type", args.type);
  if (args.prefix) params.set("prefix", args.prefix);
  if (args.q) params.set("q", args.q);
  const s = params.toString();
  return s ? `/vault/audit?${s}` : "/vault/audit";
}

function FilterPill({
  href,
  active,
  label,
  count,
  color,
  testid,
}: {
  href: string;
  active: boolean;
  label: string;
  count: number;
  color: string;
  testid: string;
}) {
  return (
    <Link
      href={href}
      data-testid={testid}
      data-active={active ? "true" : "false"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 8px",
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: "0.05em",
        textTransform: "lowercase",
        textDecoration: "none",
        border: active ? "1px solid var(--vessel-accent)" : "1px solid var(--vessel-border)",
        background: active ? "rgba(168, 85, 247, 0.10)" : "transparent",
        color: active ? "var(--vessel-accent)" : "var(--ink-2)",
        borderRadius: 2,
      }}
    >
      <span
        aria-hidden
        style={{
          width: 6,
          height: 6,
          background: color,
          borderRadius: 1,
          flexShrink: 0,
        }}
      />
      <span>{label}</span>
      <span
        style={{
          color: active ? "var(--vessel-accent)" : "var(--ink-3)",
          fontWeight: 700,
        }}
      >
        {count}
      </span>
    </Link>
  );
}

function PrefixPill({
  href,
  active,
  label,
  testid,
}: {
  href: string;
  active: boolean;
  label: string;
  testid: string;
}) {
  return (
    <Link
      href={href}
      data-testid={testid}
      data-active={active ? "true" : "false"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 8px",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        textDecoration: "none",
        border: active ? "1px solid var(--vessel-accent)" : "1px solid var(--vessel-border)",
        background: active ? "rgba(168, 85, 247, 0.10)" : "transparent",
        color: active ? "var(--vessel-accent)" : "var(--ink-3)",
        borderRadius: 2,
      }}
    >
      {label}
    </Link>
  );
}
