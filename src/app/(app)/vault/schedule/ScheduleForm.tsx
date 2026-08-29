"use client";

/**
 * ScheduleForm — client island for the /vault/schedule form.
 *
 * Fields:
 *   - enabled (toggle)
 *   - cronExpression (preset select + raw text input)
 *   - timezone (select)
 *   - lookAheadDays (0-7 number input)
 *   - minReserveCents (number input, capped at 2x vault reserve)
 *
 * On submit: POSTs to /api/vault/schedule. The server validates +
 * computes nextRunAt. On success, reloads the page so the status
 * strip + upcoming fire times update from the saved values.
 *
 * The form is intentionally non-fancy: the orchestrator is the
 * page, this is just the data-entry surface.
 */

import * as React from "react";
import { useRouter } from "next/navigation";

const CRON_PRESETS: Array<{ label: string; value: string; description: string }> = [
  { label: "Daily 9am", value: "0 9 * * *", description: "Once per day at 09:00" },
  {
    label: "Twice daily (9am + 6pm)",
    value: "0 9,18 * * *",
    description: "Twice per day at 09:00 and 18:00",
  },
  { label: "Weekly Monday 9am", value: "0 9 * * 1", description: "Once per week on Monday at 09:00" },
  { label: "Monthly 1st @ 9am", value: "0 9 1 * *", description: "Once per month on the 1st at 09:00" },
  { label: "Every 15 minutes", value: "*/15 * * * *", description: "Aggressive — for testing only" },
];

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Phoenix",
  "America/Los_Angeles",
  "America/Anchorage",
  "Pacific/Honolulu",
  "UTC",
];

type ScheduleRow = {
  id: string;
  enabled: boolean;
  cronExpression: string;
  timezone: string;
  lookAheadDays: number;
  minReserveCents: number;
  lastRunAt: Date | string | null;
  lastRunStatus: string | null;
  lastRunError: string | null;
  lastRunBillsAffected: number;
  nextRunAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type Props = {
  initialSchedule: ScheduleRow | null;
  defaults: {
    enabled: boolean;
    cronExpression: string;
    timezone: string;
    lookAheadDays: number;
    minReserveCents: number;
  };
  upcomingFireTimes: string[];
  vaultSettlementReserveCents: number;
  vaultAvailableBalanceCents: number;
};

export function ScheduleForm(props: Props) {
  const router = useRouter();
  const { initialSchedule, defaults, vaultSettlementReserveCents } = props;
  const source = initialSchedule ?? defaults;

  const [enabled, setEnabled] = React.useState<boolean>(source.enabled);
  const [cronExpression, setCronExpression] = React.useState<string>(source.cronExpression);
  const [customCron, setCustomCron] = React.useState<string>(
    CRON_PRESETS.some((p) => p.value === source.cronExpression) ? "" : source.cronExpression,
  );
  const [timezone, setTimezone] = React.useState<string>(source.timezone);
  const [lookAheadDays, setLookAheadDays] = React.useState<number>(source.lookAheadDays);
  const [minReserveCents, setMinReserveCents] = React.useState<number>(source.minReserveCents);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const effectiveCron = customCron.trim().length > 0 ? customCron.trim() : cronExpression;
  const reserveCap = Math.max(0, vaultSettlementReserveCents * 2);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/vault/schedule", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          enabled,
          cronExpression: effectiveCron,
          timezone,
          lookAheadDays,
          minReserveCents,
        }),
      });
      const body = (await res.json()) as { ok: boolean; error?: string };
      if (!body.ok) {
        setError(body.error ?? `HTTP ${res.status}`);
        return;
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 18,
        padding: 20,
        background: "var(--surface)",
        border: "1px solid var(--line)",
      }}
    >
      <Field label="enabled" hint="When off, the scheduler short-circuits.">
        <button
          type="button"
          onClick={() => setEnabled((v) => !v)}
          data-testid="vault-schedule-enabled-toggle"
          data-enabled={enabled}
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            padding: "8px 14px",
            background: enabled ? "var(--terminal-cyan)" : "var(--line-soft)",
            color: enabled ? "var(--void)" : "var(--ink-3)",
            border: `1px solid ${enabled ? "var(--terminal-cyan)" : "var(--line)"}`,
            borderRadius: 2,
            cursor: "pointer",
          }}
        >
          {enabled ? "[ON] ENABLED" : "[OFF] PAUSED"}
        </button>
      </Field>

      <Field label="look-ahead days" hint="0 = bills whose window has already opened. 1 = next 24h. 7 = next week.">
        <input
          type="number"
          min={0}
          max={7}
          step={1}
          value={lookAheadDays}
          onChange={(e) => setLookAheadDays(parseInt(e.target.value, 10) || 0)}
          data-testid="vault-schedule-lookahead-input"
          style={inputStyle}
        />
      </Field>

      <Field label="cron expression" hint="Standard 5-field cron. UTC if no timezone override." fullWidth>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select
            value={
              CRON_PRESETS.some((p) => p.value === cronExpression) ? cronExpression : "__custom"
            }
            onChange={(e) => {
              if (e.target.value === "__custom") {
                setCustomCron(cronExpression);
              } else {
                setCronExpression(e.target.value);
                setCustomCron("");
              }
            }}
            data-testid="vault-schedule-cron-preset"
            style={{ ...inputStyle, flex: 1 }}
          >
            {CRON_PRESETS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
            <option value="__custom">Custom…</option>
          </select>
          <input
            type="text"
            placeholder="e.g. 0 9 * * *"
            value={customCron}
            onChange={(e) => setCustomCron(e.target.value)}
            data-testid="vault-schedule-cron-input"
            style={{ ...inputStyle, flex: 2, fontFamily: "var(--font-jetbrains), monospace" }}
          />
        </div>
        <div
          data-testid="vault-schedule-cron-preview"
          style={{
            marginTop: 6,
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 10,
            color: "var(--ink-3)",
            letterSpacing: "0.08em",
          }}
        >
          // next 3 fires: {props.upcomingFireTimes.length > 0
            ? props.upcomingFireTimes.map((s) => new Date(s).toLocaleString()).join(" · ")
            : "—"}
        </div>
      </Field>

      <Field label="timezone" hint="IANA. Affects when the cron fires.">
        <select
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          data-testid="vault-schedule-tz-select"
          style={inputStyle}
        >
          {TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
      </Field>

      <Field
        label="min reserve (cents)"
        hint={`Skip execution if vault.settlementReserve < this. Cap: 2× current (${reserveCap} cents).`}
      >
        <input
          type="number"
          min={0}
          step={1}
          value={minReserveCents}
          onChange={(e) => setMinReserveCents(parseInt(e.target.value, 10) || 0)}
          data-testid="vault-schedule-reserve-input"
          style={inputStyle}
        />
      </Field>

      <div style={{ gridColumn: "1 / -1", display: "flex", gap: 12, alignItems: "center" }}>
        <button
          type="submit"
          disabled={submitting}
          data-testid="vault-schedule-save-button"
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            padding: "10px 18px",
            background: submitting ? "var(--line-soft)" : "var(--terminal-cyan)",
            color: submitting ? "var(--ink-3)" : "var(--void)",
            border: "1px solid var(--terminal-cyan)",
            borderRadius: 2,
            cursor: submitting ? "wait" : "pointer",
          }}
        >
          {submitting ? "[…] SAVING" : "[SAVE] SCHEDULE"}
        </button>
        {error ? (
          <span
            data-testid="vault-schedule-error"
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 10.5,
              color: "var(--over)",
              letterSpacing: "0.10em",
            }}
          >
            [ERR] {error}
          </span>
        ) : null}
        {initialSchedule ? (
          <span
            data-testid="vault-schedule-saved-at"
            style={{
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: 10,
              color: "var(--ink-3)",
              letterSpacing: "0.10em",
            }}
          >
            // saved {new Date(initialSchedule.updatedAt).toLocaleString()}
          </span>
        ) : null}
      </div>
    </form>
  );
}

const inputStyle: React.CSSProperties = {
  fontFamily: "var(--font-sora), sans-serif",
  fontSize: 13,
  padding: "8px 10px",
  background: "var(--void)",
  color: "var(--ink)",
  border: "1px solid var(--line)",
  borderRadius: 2,
  width: "100%",
  boxSizing: "border-box",
};

function Field({
  label,
  hint,
  children,
  fullWidth,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  fullWidth?: boolean;
}) {
  return (
    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        gridColumn: fullWidth ? "1 / -1" : undefined,
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-jetbrains), monospace",
          fontSize: 9.5,
          color: "var(--ink-3)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
        }}
      >
        // {label}
      </span>
      {children}
      {hint ? (
        <span
          style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: 10,
            color: "var(--ink-3)",
            letterSpacing: "0.04em",
          }}
        >
          {hint}
        </span>
      ) : null}
    </label>
  );
}
