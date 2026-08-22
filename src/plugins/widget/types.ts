/**
 * Widget Plugin Contract (per 00-DESIGN.md §4 and §5a).
 *
 * The dashboard is built from these widgets. The widget registry is the
 * canonical list of what the app can render. v1 widgets include:
 *   QuickAdd, NetWorth, RecentTransactions, EnvelopeProgress,
 *   UpcomingBills, CashflowChart, AIInsights, AIChat, SubscriptionWatch,
 *   GoalTracker, AccountSummary.
 *
 * Concrete widget registrations land with their feature in subsequent
 * steps. The registry + slot system get their own milestone in Step 7.
 */
import { z } from "zod";
import type { ComponentType } from "react";

/** A page on which a widget can be placed. */
export const WidgetPageSchema = z.enum([
  "dashboard",
  "transactions",
  "accounts",
  "envelopes",
  "rules",
  "insights",
  "reports",
]);
export type WidgetPage = z.infer<typeof WidgetPageSchema>;

/** Where on the page the widget can be dropped. */
export const WidgetSlotSchema = z.enum([
  "header",
  "main-left",
  "main-right",
  "sidebar",
  "footer",
]);
export type WidgetSlot = z.infer<typeof WidgetSlotSchema>;

/** Per-widget config schema. Plugin-defined. */
export type WidgetConfig = Record<string, unknown>;

/** What a widget instance on a saved view looks like. */
export interface WidgetInstance {
  widgetId: string;
  /** Order within the slot (ascending). */
  order: number;
  /** Per-instance config overrides. */
  config: WidgetConfig;
}

/** The contract every widget plugin must satisfy. */
export interface WidgetPlugin {
  /** Stable id, used in saved views + audit. */
  id: string;
  /** Human-readable name. */
  displayName: string;
  /** Short description for the widget picker. */
  description: string;
  /** Where this widget can be placed. */
  allowedSlots: ReadonlyArray<WidgetSlot>;
  /** Which pages the widget can appear on. */
  allowedPages: ReadonlyArray<WidgetPage>;
  /** Minimum cell size, in the dashboard grid. */
  minSize: { w: number; h: number };
  /** The React component that renders the widget body. */
  component: ComponentType<{ config: WidgetConfig }>;
  /** Default config when a widget instance is dropped onto a slot. */
  defaultConfig: WidgetConfig;
  /** Zod schema describing the config — used by the widget settings panel. */
  configSchema: z.ZodType<WidgetConfig>;
}
