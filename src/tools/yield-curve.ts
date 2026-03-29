import { parseEcbCsv } from "../csv-parser.js";
import type { EcbClient } from "../ecb-client.js";
import { buildYcKey } from "../sdmx-keys.js";

export interface GetYieldCurveInput {
  maturity?: string;
  issuerType?: string;
  startPeriod?: string;
  endPeriod?: string;
  lastNObservations?: number;
}

export async function handleGetYieldCurve(
  client: EcbClient,
  input: GetYieldCurveInput,
): Promise<string> {
  const maturity = input.maturity || "10Y";
  const key = buildYcKey(maturity, input.issuerType);

  const params: Record<string, string> = {};
  if (input.startPeriod) params.startPeriod = input.startPeriod;
  if (input.endPeriod) params.endPeriod = input.endPeriod;
  if (input.lastNObservations)
    params.lastNObservations = String(input.lastNObservations);

  const csv = await client.fetchData("YC", key, params);
  const rows = parseEcbCsv(csv);

  if (rows.length === 0) {
    return `No data available for the ${maturity.toUpperCase()} yield curve with the requested parameters.`;
  }

  const header = `AAA Yield Curve — ${maturity.toUpperCase()} Spot Rate (source: ECB)`;
  const csvLines = ["Date,Yield (%)"];
  for (const row of rows) {
    csvLines.push(`${row.TIME_PERIOD},${row.OBS_VALUE}`);
  }

  return `${header}\n${csvLines.join("\n")}`;
}
