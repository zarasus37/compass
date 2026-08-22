/**
 * Plugin layer barrel. The plugin architecture is the structural backbone
 * of Compass (per 00-DESIGN.md §5a). Feature code reaches the outside
 * world (AI providers, import formats, widgets) only through this layer.
 */
export * as ai from "./ai";
export * as importFormats from "./import";
export * as widget from "./widget";
