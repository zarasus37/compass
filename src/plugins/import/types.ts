/**
 * Import Format Plugin Contract (per 00-DESIGN.md §5a).
 *
 * v1 ships with CSV. OFX/QIF/PDF are future plugins. The registry is
 * the single place that knows which formats are loaded; feature code
 * only ever sees `getImportFormats()`.
 *
 * Implementation lands in Stage 2 step 8 (CSV import + recurring detection).
 * The contract is defined here at scaffold so the registry surface is
 * stable from day one.
 */
import { z } from "zod";

/** A single parsed row, in the format plugin's intermediate shape. */
export const ParsedRowSchema = z.object({
  /** Row index from the source file (0-based, header excluded). */
  index: z.number().int().nonnegative(),
  /** Best-effort parsed fields. Mapping is plugin-specific. */
  fields: z.record(z.string(), z.string()),
});
export type ParsedRow = z.infer<typeof ParsedRowSchema>;

/** Result of parsing a file. */
export interface ParseResult {
  rows: ParsedRow[];
  /** Plugin-detected column mapping, for the column-mapping UI. */
  suggestedMapping: Record<string, string>;
  /** Non-fatal warnings (e.g. skipped rows). */
  warnings: string[];
}

/** The contract every import format plugin must satisfy. */
export interface ImportFormatPlugin {
  /** Stable id, used in registry + audit. */
  id: string;
  /** Human-readable name + the file extensions it handles. */
  displayName: string;
  extensions: ReadonlyArray<string>;
  /** Parse a file's contents into structured rows. Throws on hard failure. */
  parse(input: {
    fileName: string;
    content: string | ArrayBuffer;
  }): Promise<ParseResult>;
}
