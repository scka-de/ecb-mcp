/**
 * SDMX series key builders for each supported ECB dataflow.
 *
 * Each builder hardcodes the fixed dimensions and accepts only
 * the parameters that the user controls. All inputs are
 * case-normalized to uppercase.
 *
 * Key templates (dots separate dimensions):
 *   EXR: {freq}.{target}.EUR.SP00.A
 *   FM:  B.U2.EUR.4F.KR.{instrument}.LEV
 *   YC:  B.U2.EUR.4F.G_N_A.SV_C_YM.{maturity}
 *   ICP: M.{country}.N.000000.4.{measure}
 *   BSI: M.{country}.Y.V.{item}.X.{type}.U2.2300.Z01.E
 */

const FREQ_MAP: Record<string, string> = {
  D: "D",
  DAILY: "D",
  M: "M",
  MONTHLY: "M",
  A: "A",
  ANNUAL: "A",
};

const INTEREST_RATE_MAP: Record<string, string> = {
  MRO: "MRR_FR",
  MAIN_REFINANCING: "MRR_FR",
  DEPOSIT_FACILITY: "DFR",
  DEPOSIT: "DFR",
  MARGINAL_LENDING: "MLFR",
  MARGINAL: "MLFR",
};

const MONEY_AGGREGATE_MAP: Record<string, string> = {
  M1: "M10",
  M2: "M20",
  M3: "M30",
};

const BSI_DATA_TYPE_MAP: Record<string, string> = {
  OUTSTANDING: "1",
  GROWTH_RATE: "4",
};

const ICP_MEASURE_MAP: Record<string, string> = {
  ANNUAL_RATE: "ANR",
  INDEX: "INX",
};

function normalize(value: string): string {
  return value.trim().toUpperCase();
}

/**
 * Exchange rates (EXR dataflow).
 * Template: {freq}.{target}.EUR.SP00.A
 */
export function buildExrKey(target: string, freq = "D"): string {
  const f = FREQ_MAP[normalize(freq)] || normalize(freq);
  const t = normalize(target);
  return `${f}.${t}.EUR.SP00.A`;
}

/**
 * Key ECB interest rates (FM dataflow).
 * Template: B.U2.EUR.4F.KR.{instrument}.LEV
 */
export function buildFmKey(type: string): string {
  const t = normalize(type);
  const instrument = INTEREST_RATE_MAP[t];
  if (!instrument) {
    const valid = Object.keys(INTEREST_RATE_MAP)
      .filter(
        (k) =>
          !k.includes("_") ||
          k === "DEPOSIT_FACILITY" ||
          k === "MARGINAL_LENDING" ||
          k === "MAIN_REFINANCING",
      )
      .join(", ");
    throw new Error(
      `Unknown interest rate type: "${type}". Valid types: ${valid}`,
    );
  }
  return `B.U2.EUR.4F.KR.${instrument}.LEV`;
}

/**
 * Yield curve (YC dataflow).
 * Template: B.U2.EUR.4F.G_N_A.SV_C_YM.{maturity}
 *
 * If issuerType is "all_gov", uses G_N_A (all government bonds).
 * If "aaa", uses G_N_A (AAA-rated, which is the ECB default for YC).
 */
export function buildYcKey(maturity?: string, issuerType?: string): string {
  const m = maturity ? `SR_${normalize(maturity)}` : "SR_10Y";
  const issuer =
    issuerType && normalize(issuerType) === "ALL_GOV" ? "G_N_A" : "G_N_A";
  return `B.U2.EUR.4F.${issuer}.SV_C_YM.${m}`;
}

/**
 * HICP inflation (ICP dataflow).
 * Template: M.{country}.N.000000.4.{measure}
 *
 * Country defaults to "U2" (euro area).
 * Measure defaults to "ANR" (annual rate of change).
 */
export function buildIcpKey(country = "U2", measure = "annual_rate"): string {
  const c = normalize(country);
  const m = ICP_MEASURE_MAP[normalize(measure)] || normalize(measure);
  return `M.${c}.N.000000.4.${m}`;
}

/**
 * Monetary aggregates (BSI dataflow).
 * Template: M.{country}.Y.V.{item}.X.{type}.U2.2300.Z01.E
 *
 * Country defaults to "U2" (euro area).
 * Aggregate defaults to "M3".
 * Measure defaults to "outstanding".
 */
export function buildBsiKey(
  aggregate = "M3",
  measure = "outstanding",
  country = "U2",
): string {
  const c = normalize(country);
  const agg = normalize(aggregate);
  const item = MONEY_AGGREGATE_MAP[agg];
  if (!item) {
    throw new Error(
      `Unknown monetary aggregate: "${aggregate}". Valid: M1, M2, M3`,
    );
  }
  const dataType = BSI_DATA_TYPE_MAP[normalize(measure)] || "1";
  return `M.${c}.Y.V.${item}.X.${dataType}.U2.2300.Z01.E`;
}
