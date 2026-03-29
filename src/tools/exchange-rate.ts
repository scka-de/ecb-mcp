import { parseEcbCsv } from "../csv-parser.js";
import type { EcbClient } from "../ecb-client.js";
import { buildExrKey } from "../sdmx-keys.js";

export interface GetExchangeRatesInput {
  target: string;
  frequency?: string;
  startPeriod?: string;
  endPeriod?: string;
  lastNObservations?: number;
}

export async function handleGetExchangeRates(
  client: EcbClient,
  input: GetExchangeRatesInput,
): Promise<string> {
  const freq = input.frequency || "D";
  const key = buildExrKey(input.target, freq);

  const params: Record<string, string> = {};
  if (input.startPeriod) params.startPeriod = input.startPeriod;
  if (input.endPeriod) params.endPeriod = input.endPeriod;
  if (input.lastNObservations)
    params.lastNObservations = String(input.lastNObservations);

  const csv = await client.fetchData("EXR", key, params);
  const rows = parseEcbCsv(csv);

  if (rows.length === 0) {
    return `No data available for EUR/${input.target.toUpperCase()} with the requested parameters.`;
  }

  const target = input.target.toUpperCase();
  const freqLabel =
    freq.toUpperCase() === "D"
      ? "Daily"
      : freq.toUpperCase() === "M"
        ? "Monthly"
        : "Annual";

  const header = `EUR/${target} ${freqLabel} Exchange Rate (source: ECB)`;
  const csvLines = ["Date,Rate"];
  for (const row of rows) {
    csvLines.push(`${row.TIME_PERIOD},${row.OBS_VALUE}`);
  }

  return `${header}\n${csvLines.join("\n")}`;
}

export interface ConvertCurrencyInput {
  amount: number;
  from: string;
  to: string;
  date?: string;
}

export async function handleConvertCurrency(
  client: EcbClient,
  input: ConvertCurrencyInput,
): Promise<string> {
  const from = input.from.toUpperCase();
  const to = input.to.toUpperCase();
  const amount = input.amount;

  // EUR to EUR — no conversion needed
  if (from === "EUR" && to === "EUR") {
    return `${amount.toFixed(2)} EUR = ${amount.toFixed(2)} EUR (rate: 1.0000, date: today)`;
  }

  const isFromEur = from === "EUR";
  const isToEur = to === "EUR";

  const params: Record<string, string> = { lastNObservations: "1" };
  if (input.date) {
    params.startPeriod = input.date;
    params.endPeriod = input.date;
  }

  let result: number;
  let rate: number;
  let rateDate: string;
  let via = "";

  if (isFromEur) {
    // EUR → X: direct, rate = EUR/X
    const key = buildExrKey(to);
    const csv = await client.fetchData("EXR", key, params);
    const rows = parseEcbCsv(csv);
    if (rows.length === 0) {
      return `No exchange rate data available for EUR/${to}.`;
    }
    rate = Number.parseFloat(rows[rows.length - 1].OBS_VALUE);
    rateDate = rows[rows.length - 1].TIME_PERIOD;
    result = amount * rate;
  } else if (isToEur) {
    // X → EUR: inverse, rate = EUR/X, result = amount / rate
    const key = buildExrKey(from);
    const csv = await client.fetchData("EXR", key, params);
    const rows = parseEcbCsv(csv);
    if (rows.length === 0) {
      return `No exchange rate data available for EUR/${from}.`;
    }
    rate = Number.parseFloat(rows[rows.length - 1].OBS_VALUE);
    rateDate = rows[rows.length - 1].TIME_PERIOD;
    result = amount / rate;
  } else {
    // X → Y: cross-rate via EUR triangulation
    // Fetch both rates in one request using SDMX OR operator
    const key = buildExrKey(`${from}+${to}`);
    const csv = await client.fetchData("EXR", key, params);
    const rows = parseEcbCsv(csv);

    const fromRow = rows.find((r) => r.CURRENCY === from);
    const toRow = rows.find((r) => r.CURRENCY === to);

    if (!fromRow || !toRow) {
      return `No exchange rate data available for ${from} and/or ${to}.`;
    }

    // Same-date validation
    const fromDate = fromRow.TIME_PERIOD;
    const toDate = toRow.TIME_PERIOD;
    if (fromDate !== toDate) {
      return `Rate date mismatch: ${from} rate is from ${fromDate}, ${to} rate is from ${toDate}. Cannot compute accurate cross-rate.`;
    }

    const fromRate = Number.parseFloat(fromRow.OBS_VALUE);
    const toRate = Number.parseFloat(toRow.OBS_VALUE);
    rate = toRate / fromRate;
    rateDate = fromDate;
    result = amount * rate;
    via = ", via EUR triangulation";
  }

  return `${amount.toFixed(2)} ${from} = ${result.toFixed(2)} ${to} (rate: ${rate.toFixed(4)}, date: ${rateDate}${via}, source: ECB)`;
}
