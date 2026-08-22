/**
 * Widget Registry. Each widget implementation lives under
 * `src/plugins/widget/widgets/` and is registered here. The full
 * registry (with all v1 widgets) lands in Step 7 (layout system
 * milestone) per COORDINATION.md.
 */
import type { WidgetPlugin } from "./types";

const WIDGETS: ReadonlyArray<WidgetPlugin> = [];

let registered: ReadonlyArray<WidgetPlugin> | null = null;

/** All widget plugins the app currently knows about. */
export function getWidgets(): ReadonlyArray<WidgetPlugin> {
  if (registered) return registered;
  registered = Object.freeze([...WIDGETS]);
  return registered;
}

/** Look up a widget by id. Returns undefined when not registered. */
export function getWidget(id: string): WidgetPlugin | undefined {
  return getWidgets().find((w) => w.id === id);
}

/** For tests / hot-reload. */
export function _resetWidgetsForTests(): void {
  registered = null;
}
