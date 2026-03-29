import { parseEcbCsv } from "../csv-parser.js";
import type { EcbClient } from "../ecb-client.js";
import { buildBsiKey } from "../sdmx-keys.js";

export interface GetMoneySupplyInput {
  aggregate?: string;
  measure?: string;
  country?: string;
  startPeriod?: string;
  endPeriod?: string;
  lastNObservations?: number;
}

export async function handleGetMoneySupply(
  client: EcbClient,
  input: GetMoneySupplyInput,
): Promise<string> {
  const aggregate = input.aggregate || "M3";
  const measure = input.measure || "outstanding";
  const country = input.country || "U2";
  const key = buildBsiKey(aggregate, measure, country);

  const params: Record<string, string> = {};
  if (input.startPeriod) params.startPeriod = input.startPeriod;
  if (input.endPeriod) params.endPeriod = input.endPeriod;
  if (input.lastNObservations)
    params.lastNObservations = String(input.lastNObservations);

  const csv = await client.fetchData("BSI", key, params);
  const rows = parseEcbCsv(csv);

  if (rows.length === 0) {
    return `No data available for ${aggregate.toUpperCase()} money supply with the requested parameters.`;
  }

  const area =
    country.toUpperCase() === "U2" ? "Euro Area" : country.toUpperCase();
  const measureLabel =
    measure.toLowerCase() === "growth_rate"
      ? "Growth Rate (%)"
      : "Outstanding (EUR millions)";

  const header = `${aggregate.toUpperCase()} Money Supply — ${area}, ${measureLabel} (source: ECB)`;
  const csvLines = ["Date,Value"];
  for (const row of rows) {
    csvLines.push(`${row.TIME_PERIOD},${row.OBS_VALUE}`);
  }

  return `${header}\n${csvLines.join("\n")}`;
}
