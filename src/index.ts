import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { EcbClient, createClientConfig } from "./ecb-client.js";
import { logger } from "./logger.js";
import { MetadataService } from "./metadata.js";
import {
  handleConvertCurrency,
  handleGetExchangeRates,
} from "./tools/exchange-rate.js";
import { handleExplainDataset } from "./tools/explain.js";
import { handleGetInflation } from "./tools/inflation.js";
import { handleGetInterestRates } from "./tools/interest-rate.js";
import { handleGetMoneySupply } from "./tools/money-supply.js";
import { handleSearchDatasets } from "./tools/search.js";
import { handleGetYieldCurve } from "./tools/yield-curve.js";

const config = createClientConfig();
const client = new EcbClient(config);
const metadata = new MetadataService(client);

const server = new McpServer({
  name: "ecb-mcp",
  version: "0.1.0",
});

server.tool(
  "get_exchange_rates",
  `Get EUR exchange rates from the European Central Bank.

Returns daily, monthly, or annual reference rates for a currency pair against EUR.
The ECB publishes reference rates for ~40 currencies at 16:00 CET each business day.

Examples of questions this tool answers:
- "What is the current EUR/USD exchange rate?"
- "Show me EUR/GBP rates for the last week"
- "What was the EUR/JPY rate in January 2025?"`,
  {
    target: z
      .string()
      .describe(
        'Target currency code (e.g. "USD", "GBP", "JPY", "CHF"). Use "+" for multiple: "USD+GBP"',
      ),
    frequency: z
      .enum(["D", "M", "A"])
      .optional()
      .describe("D=daily (default), M=monthly average, A=annual average"),
    startPeriod: z
      .string()
      .optional()
      .describe("Start date (YYYY-MM-DD, YYYY-MM, or YYYY)"),
    endPeriod: z
      .string()
      .optional()
      .describe("End date (YYYY-MM-DD, YYYY-MM, or YYYY)"),
    lastNObservations: z
      .number()
      .int()
      .positive()
      .optional()
      .describe("Return only the last N data points"),
  },
  async (input) => {
    const text = await handleGetExchangeRates(client, input);
    return { content: [{ type: "text" as const, text }] };
  },
);

server.tool(
  "get_interest_rates",
  `Get key ECB interest rates — the rates that drive eurozone monetary policy.

Returns the ECB's main policy rates: Main Refinancing Operations (MRO), Deposit Facility,
and Marginal Lending Facility. These are the rates the ECB sets at its Governing Council meetings.

Examples of questions this tool answers:
- "What is the current ECB deposit facility rate?"
- "Show me the history of ECB interest rate changes"
- "When did the ECB last change its main refinancing rate?"`,
  {
    type: z
      .string()
      .describe(
        'Rate type: "MRO" (main refinancing), "deposit_facility", or "marginal_lending"',
      ),
    startPeriod: z
      .string()
      .optional()
      .describe("Start date (YYYY-MM-DD, YYYY-MM, or YYYY)"),
    endPeriod: z
      .string()
      .optional()
      .describe("End date (YYYY-MM-DD, YYYY-MM, or YYYY)"),
    lastNObservations: z
      .number()
      .int()
      .positive()
      .optional()
      .describe("Return only the last N data points"),
  },
  async (input) => {
    const text = await handleGetInterestRates(client, input);
    return { content: [{ type: "text" as const, text }] };
  },
);

server.tool(
  "get_inflation",
  `Get HICP inflation data from the ECB — the official eurozone inflation measure.

Returns the Harmonised Index of Consumer Prices (HICP) as published by Eurostat via the ECB.
Available as annual rate of change (%) or index level, for the euro area or individual countries.

Examples of questions this tool answers:
- "What is the current eurozone inflation rate?"
- "Show me Germany's inflation over the past year"
- "Compare inflation in France vs Italy"`,
  {
    country: z
      .string()
      .optional()
      .describe(
        'Country code: "U2" for euro area (default), "DE", "FR", "IT", "ES", etc.',
      ),
    measure: z
      .enum(["annual_rate", "index"])
      .optional()
      .describe(
        "annual_rate = year-over-year % change (default), index = price index level",
      ),
    startPeriod: z
      .string()
      .optional()
      .describe("Start date (YYYY-MM, or YYYY)"),
    endPeriod: z.string().optional().describe("End date (YYYY-MM, or YYYY)"),
    lastNObservations: z
      .number()
      .int()
      .positive()
      .optional()
      .describe("Return only the last N data points"),
  },
  async (input) => {
    const text = await handleGetInflation(client, input);
    return { content: [{ type: "text" as const, text }] };
  },
);

server.tool(
  "get_yield_curve",
  `Get euro area government bond yield curve data from the ECB.

Returns spot rates from the ECB's AAA-rated government bond yield curve.
Available maturities range from 3 months to 30 years. Updated daily.

Examples of questions this tool answers:
- "What is the current 10-year euro area yield?"
- "Show me the 2-year yield over the past 6 months"
- "What was the 5-year spot rate in March 2024?"`,
  {
    maturity: z
      .string()
      .optional()
      .describe(
        'Bond maturity: "3M", "6M", "1Y", "2Y", "5Y", "10Y" (default), "15Y", "20Y", "30Y"',
      ),
    issuerType: z
      .string()
      .optional()
      .describe(
        'Issuer rating: "AAA" (default) or "all_gov" for all government bonds',
      ),
    startPeriod: z
      .string()
      .optional()
      .describe("Start date (YYYY-MM-DD, YYYY-MM, or YYYY)"),
    endPeriod: z
      .string()
      .optional()
      .describe("End date (YYYY-MM-DD, YYYY-MM, or YYYY)"),
    lastNObservations: z
      .number()
      .int()
      .positive()
      .optional()
      .describe("Return only the last N data points"),
  },
  async (input) => {
    const text = await handleGetYieldCurve(client, input);
    return { content: [{ type: "text" as const, text }] };
  },
);

server.tool(
  "get_money_supply",
  `Get euro area monetary aggregates (M1, M2, M3) from the ECB.

Returns monetary aggregate data as outstanding amounts (EUR millions) or annual growth rates.
M1 = currency in circulation + overnight deposits. M2 = M1 + short-term deposits. M3 = M2 + repos + money market funds + debt securities up to 2 years.

Examples of questions this tool answers:
- "What is the current M3 money supply in the euro area?"
- "Show me M1 growth rate over the past year"
- "How has M3 evolved since 2020?"`,
  {
    aggregate: z
      .string()
      .optional()
      .describe('Monetary aggregate: "M1", "M2", or "M3" (default)'),
    measure: z
      .enum(["outstanding", "growth_rate"])
      .optional()
      .describe(
        "outstanding = EUR millions (default), growth_rate = annual % change",
      ),
    country: z
      .string()
      .optional()
      .describe(
        'Country code: "U2" for euro area (default), or specific country like "DE", "FR"',
      ),
    startPeriod: z
      .string()
      .optional()
      .describe("Start date (YYYY-MM, or YYYY)"),
    endPeriod: z.string().optional().describe("End date (YYYY-MM, or YYYY)"),
    lastNObservations: z
      .number()
      .int()
      .positive()
      .optional()
      .describe("Return only the last N data points"),
  },
  async (input) => {
    const text = await handleGetMoneySupply(client, input);
    return { content: [{ type: "text" as const, text }] };
  },
);

server.tool(
  "convert_currency",
  `Convert an amount between currencies using ECB reference rates.

Supports EUR to any currency, any currency to EUR, and cross-currency conversion
(e.g. USD to GBP) via EUR triangulation. Uses the latest ECB reference rate,
or a rate from a specific date.

Examples of questions this tool answers:
- "Convert 1000 EUR to USD"
- "How much is 500 GBP in EUR?"
- "Convert 250 USD to JPY"
- "What was 1000 EUR worth in CHF on 2025-01-15?"`,
  {
    amount: z.number().describe("Amount to convert"),
    from: z
      .string()
      .describe('Source currency code (e.g. "EUR", "USD", "GBP")'),
    to: z.string().describe('Target currency code (e.g. "EUR", "USD", "GBP")'),
    date: z
      .string()
      .optional()
      .describe(
        "Specific date for the rate (YYYY-MM-DD). Uses latest if omitted.",
      ),
  },
  async (input) => {
    const text = await handleConvertCurrency(client, input);
    return { content: [{ type: "text" as const, text }] };
  },
);

server.tool(
  "search_datasets",
  `Search the ECB's 100+ statistical datasets by keyword.

Returns matching dataset IDs and names. Use this to discover what data the ECB publishes.
After finding a dataset, use explain_dataset to learn its structure, or use the specific
data tools (get_exchange_rates, get_interest_rates, etc.) for common queries.

Examples of questions this tool answers:
- "What ECB datasets are available about inflation?"
- "Does the ECB publish data about bank lending?"
- "What datasets cover government debt?"`,
  {
    query: z
      .string()
      .describe(
        'Search keyword (e.g. "inflation", "exchange", "lending", "payment", "insurance")',
      ),
  },
  async (input) => {
    const text = await handleSearchDatasets(metadata, input);
    return { content: [{ type: "text" as const, text }] };
  },
);

server.tool(
  "explain_dataset",
  `Explain the structure of any ECB dataset — dimensions, valid values, and example queries.

Use this after search_datasets to understand what a dataset contains and how to query it.
Returns the dataset's dimensions, their valid values (codes), and an example series key.
Works for all 100+ ECB datasets, not just the ones with dedicated tools.

Examples of questions this tool answers:
- "What dimensions does the EXR dataset have?"
- "What are the valid currency codes in the exchange rate dataset?"
- "How do I query the BSI (balance sheet) dataset?"`,
  {
    dataset_id: z
      .string()
      .describe(
        'Dataset ID (e.g. "EXR", "FM", "ICP", "YC", "BSI"). Use search_datasets to find IDs.',
      ),
  },
  async (input) => {
    const text = await handleExplainDataset(metadata, input);
    return { content: [{ type: "text" as const, text }] };
  },
);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info("ecb-mcp server started");
}

main().catch((error) => {
  logger.error("Fatal error", error);
  process.exit(1);
});
