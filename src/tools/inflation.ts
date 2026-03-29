import { parseEcbCsv } from "../csv-parser.js";
import type { EcbClient } from "../ecb-client.js";
import { buildIcpKey } from "../sdmx-keys.js";

export interface GetInflationInput {
  country?: string;
  measure?: string;
  startPeriod?: string;
  endPeriod?: string;
  lastNObservations?: number;
}

export async function handleGetInflation(
  client: EcbClient,
  input: GetInflationInput,
): Promise<string> {
  const country = input.country || "U2";
  const measure = input.measure || "annual_rate";
  const key = buildIcpKey(country, measure);

  const params: Record<string, string> = {};
  if (input.startPeriod) params.startPeriod = input.startPeriod;
  if (input.endPeriod) params.endPeriod = input.endPeriod;
  if (input.lastNObservations)
    params.lastNObservations = String(input.lastNObservations);

  const csv = await client.fetchData("ICP", key, params);
  const rows = parseEcbCsv(csv);

  if (rows.length === 0) {
    return "No data available for HICP inflation with the requested parameters.";
  }

  const area =
    country.toUpperCase() === "U2" ? "Euro Area" : country.toUpperCase();
  const measureLabel =
    measure.toLowerCase() === "index" ? "Index" : "Annual Rate (%)";

  const header = `HICP Inflation — ${area}, ${measureLabel} (source: ECB)`;
  const csvLines = [`Date,${measureLabel}`];
  for (const row of rows) {
    csvLines.push(`${row.TIME_PERIOD},${row.OBS_VALUE}`);
  }

  return `${header}\n${csvLines.join("\n")}`;
}
