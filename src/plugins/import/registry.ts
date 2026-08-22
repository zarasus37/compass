/**
 * Import Format Registry. v1 ships CSV only; the registry structure
 * makes adding OFX/QIF/PDF trivial — drop a new plugin into
 * `src/plugins/import/formats/` and register it here.
 */
import type { ImportFormatPlugin } from "./types";

const FORMATS: ReadonlyArray<ImportFormatPlugin> = [];

let registered: ReadonlyArray<ImportFormatPlugin> | null = null;

/** All import format plugins the app currently supports. */
export function getImportFormats(): ReadonlyArray<ImportFormatPlugin> {
  if (registered) return registered;
  // Lazy registration lives here in Step 8. The scaffold step ships the
  // contract and an empty registry; CSV registration lands with the import
  // feature in Step 8 (per COORDINATION.md).
  registered = Object.freeze([...FORMATS]);
  return registered;
}

/** For tests / hot-reload. */
export function _resetImportFormatsForTests(): void {
  registered = null;
}
