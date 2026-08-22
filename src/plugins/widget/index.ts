/**
 * Public surface of the widget plugin layer. The layout system and
 * dashboard UI import from here, never from concrete widget files.
 */
export { getWidgets, getWidget } from "./registry";
export type {
  WidgetPlugin,
  WidgetInstance,
  WidgetConfig,
  WidgetPage,
  WidgetSlot,
} from "./types";
