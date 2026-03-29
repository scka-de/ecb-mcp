import { parseEcbCsv } from "../csv-parser.js";
import type { EcbClient } from "../ecb-client.js";
import { buildFmKey } from "../sdmx-keys.js";

const TYPE_LABELS: Record<string, string> = {
  MRR_FR: "Main Refinancing Operations (MRO)",
  DFR: "Deposit Facility Rate",
  MLFR: "Marginal Lending Facility Rate",
};

export interface GetInterestRatesInput {
  type: string;
  startPeriod?: string;
  endPeriod?: string;
  lastNObservations?: number;
}

export async function handleGetInterestRates(
  client: EcbClient,
  input: GetInterestRatesInput,
): Promise<string> {
  const key = buildFmKey(input.type);

  const params: Record<string, string> = {};
  if (input.startPeriod) params.startPeriod = input.startPeriod;
  if (input.endPeriod) params.endPeriod = input.endPeriod;
  if (input.lastNObservations)
    params.lastNObservations = String(input.lastNObservations);

  const csv = await client.fetchData("FM", key, params);
  const rows = parseEcbCsv(csv);

  if (rows.length === 0) {
    return `No data available for ECB ${input.type} interest rate with the requested parameters.`;
  }

  // Extract the instrument code from the key to get the label
  const instrument = key.split(".")[5];
  const label = TYPE_LABELS[instrument] || input.type;

  const header = `ECB ${label} (source: ECB)`;
  const csvLines = ["Date,Rate (%)"];
  for (const row of rows) {
    csvLines.push(`${row.TIME_PERIOD},${row.OBS_VALUE}`);
  }

  return `${header}\n${csvLines.join("\n")}`;
}
