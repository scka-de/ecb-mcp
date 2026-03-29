import { parse } from "csv-parse/sync";

/**
 * Parse ECB SDMX CSV response into an array of record objects.
 *
 * The ECB CSV format is RFC 4180 with a header row.
 * Columns include KEY, FREQ, TIME_PERIOD, OBS_VALUE, and many metadata columns.
 * We parse all columns but tools typically only use TIME_PERIOD and OBS_VALUE.
 */
export function parseEcbCsv(raw: string): Array<Record<string, string>> {
  const trimmed = raw.replace(/^\uFEFF/, ""); // strip BOM if present
  return parse(trimmed, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as Array<Record<string, string>>;
}
