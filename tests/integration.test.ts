/**
 * Integration tests against the live ECB API.
 * Only run when INTEGRATION=true is set.
 *
 * These tests validate that:
 * 1. The real ECB API returns data in the expected format
 * 2. Our SDMX key templates produce valid queries
 * 3. CSV parsing works on real responses
 * 4. Edge cases behave correctly
 */
import { beforeAll, describe, expect, it } from "vitest";
import {
  EcbApiError,
  EcbClient,
  createClientConfig,
} from "../src/ecb-client.js";
import { MetadataService } from "../src/metadata.js";
import { handleGetExchangeRates } from "../src/tools/exchange-rate.js";
import { handleConvertCurrency } from "../src/tools/exchange-rate.js";
import { handleExplainDataset } from "../src/tools/explain.js";
import { handleGetInflation } from "../src/tools/inflation.js";
import { handleGetInterestRates } from "../src/tools/interest-rate.js";
import { handleGetMoneySupply } from "../src/tools/money-supply.js";
import { handleSearchDatasets } from "../src/tools/search.js";
import { handleGetYieldCurve } from "../src/tools/yield-curve.js";

const SKIP = !process.env.INTEGRATION;

describe.skipIf(SKIP)("Integration: live ECB API", () => {
  let client: EcbClient;
  let metadata: MetadataService;

  beforeAll(() => {
    client = new EcbClient(createClientConfig());
    metadata = new MetadataService(client);
  });

  // ─── Data Tools ───────────────────────────────────────────

  describe("get_exchange_rates", () => {
    it("fetches EUR/USD last 3 days", async () => {
      const result = await handleGetExchangeRates(client, {
        target: "USD",
        lastNObservations: 3,
      });

      expect(result).toContain("EUR/USD");
      expect(result).toContain("ECB");
      expect(result).toContain("Date,Rate");
      // Should have data rows
      const lines = result.split("\n");
      expect(lines.length).toBeGreaterThanOrEqual(3); // header + context + at least 1 row
    }, 15000);

    it("fetches multiple currencies", async () => {
      const result = await handleGetExchangeRates(client, {
        target: "USD+GBP",
        lastNObservations: 1,
      });

      expect(result).toContain("USD+GBP");
    }, 15000);

    it("fetches monthly frequency", async () => {
      const result = await handleGetExchangeRates(client, {
        target: "USD",
        frequency: "M",
        lastNObservations: 2,
      });

      expect(result).toContain("Monthly");
    }, 15000);
  });

  describe("get_interest_rates", () => {
    it("fetches MRO rate", async () => {
      const result = await handleGetInterestRates(client, {
        type: "MRO",
        lastNObservations: 3,
      });

      expect(result).toContain("Main Refinancing");
      expect(result).toContain("Date,Rate");
      expect(result).toMatch(/\d+\.\d+/);
    }, 15000);

    it("fetches deposit facility rate", async () => {
      const result = await handleGetInterestRates(client, {
        type: "deposit_facility",
        lastNObservations: 1,
      });

      expect(result).toContain("Deposit Facility");
    }, 15000);

    it("fetches marginal lending rate", async () => {
      const result = await handleGetInterestRates(client, {
        type: "marginal_lending",
        lastNObservations: 5,
      });

      expect(result).toContain("Marginal Lending");
    }, 15000);
  });

  describe("get_inflation", () => {
    it("fetches euro area HICP", async () => {
      const result = await handleGetInflation(client, {
        lastNObservations: 3,
      });

      expect(result).toContain("HICP");
      expect(result).toContain("Euro Area");
      expect(result).toMatch(/\d+\.\d/);
    }, 15000);

    it("fetches Germany inflation", async () => {
      const result = await handleGetInflation(client, {
        country: "DE",
        lastNObservations: 1,
      });

      expect(result).toContain("DE");
    }, 15000);

    it("fetches index measure", async () => {
      const result = await handleGetInflation(client, {
        measure: "index",
        lastNObservations: 1,
      });

      expect(result).toContain("Index");
    }, 15000);
  });

  describe("get_yield_curve", () => {
    it("fetches 10Y AAA yield", async () => {
      const result = await handleGetYieldCurve(client, {
        lastNObservations: 3,
      });

      expect(result).toContain("Yield Curve");
      expect(result).toContain("10Y");
      expect(result).toMatch(/\d+\.\d+/);
    }, 15000);

    it("fetches 5Y maturity", async () => {
      const result = await handleGetYieldCurve(client, {
        maturity: "5Y",
        lastNObservations: 1,
      });

      expect(result).toContain("5Y");
    }, 15000);
  });

  describe("get_money_supply", () => {
    it("fetches M3 outstanding", async () => {
      const result = await handleGetMoneySupply(client, {
        lastNObservations: 3,
      });

      expect(result).toContain("M3");
      expect(result).toContain("Outstanding");
      expect(result).toMatch(/\d+/);
    }, 15000);

    it("fetches M1", async () => {
      const result = await handleGetMoneySupply(client, {
        aggregate: "M1",
        lastNObservations: 1,
      });

      expect(result).toContain("M1");
    }, 15000);

    it("fetches growth rate", async () => {
      const result = await handleGetMoneySupply(client, {
        measure: "growth_rate",
        lastNObservations: 1,
      });

      expect(result).toContain("Growth Rate");
    }, 15000);
  });

  describe("convert_currency", () => {
    it("converts EUR to USD", async () => {
      const result = await handleConvertCurrency(client, {
        amount: 100,
        from: "EUR",
        to: "USD",
      });

      expect(result).toContain("EUR");
      expect(result).toContain("USD");
      expect(result).toMatch(/rate: \d+\.\d+/);
      expect(result).toMatch(/date: \d{4}-\d{2}-\d{2}/);
    }, 15000);

    it("converts USD to EUR (inverse)", async () => {
      const result = await handleConvertCurrency(client, {
        amount: 100,
        from: "USD",
        to: "EUR",
      });

      expect(result).toContain("EUR");
      expect(result).toMatch(/\d+\.\d{2}/);
    }, 15000);

    it("converts USD to GBP (cross-rate)", async () => {
      const result = await handleConvertCurrency(client, {
        amount: 100,
        from: "USD",
        to: "GBP",
      });

      expect(result).toContain("GBP");
      expect(result).toContain("EUR triangulation");
    }, 15000);
  });

  // ─── Metadata Tools ───────────────────────────────────────

  describe("search_datasets", () => {
    it("finds exchange rate datasets", async () => {
      const result = await handleSearchDatasets(metadata, {
        query: "exchange",
      });

      expect(result).toContain("EXR");
      expect(result).toMatch(/\d+ dataset/);
    }, 30000);

    it("finds inflation datasets", async () => {
      const result = await handleSearchDatasets(metadata, {
        query: "consumer price",
      });

      expect(result).toContain("ICP");
    }, 30000);
  });

  describe("explain_dataset", () => {
    it("explains EXR structure with dimensions", async () => {
      const result = await handleExplainDataset(metadata, {
        dataset_id: "EXR",
      });

      expect(result).toContain("EXR");
      expect(result).toContain("FREQ");
      expect(result).toContain("CURRENCY");
      // Real ECB codelist has 369 currencies sorted alphabetically
      // USD won't be in the first 10 shown, but the dimension should list values
      expect(result).toMatch(/\d+ values/);
    }, 30000);
  });

  // ─── Edge Cases ───────────────────────────────────────────

  describe("edge cases", () => {
    it("handles invalid currency code gracefully", async () => {
      await expect(
        handleGetExchangeRates(client, {
          target: "ZZZZZ",
          lastNObservations: 1,
        }),
      ).rejects.toThrow(EcbApiError);
    }, 15000);

    it("handles future date range (no data) gracefully", async () => {
      // ECB returns 200 with empty CSV for future dates (not 404)
      // Our handler returns a friendly message instead of throwing
      const result = await handleGetExchangeRates(client, {
        target: "USD",
        startPeriod: "2099-01-01",
        endPeriod: "2099-12-31",
      });

      expect(result).toContain("No data available");
    }, 15000);

    it("handles invalid interest rate type", async () => {
      await expect(
        handleGetInterestRates(client, { type: "nonexistent" }),
      ).rejects.toThrow(/Unknown interest rate type/);
    });

    it("handles invalid monetary aggregate", async () => {
      await expect(
        handleGetMoneySupply(client, { aggregate: "M99" }),
      ).rejects.toThrow(/Unknown monetary aggregate/);
    });

    it("EUR to EUR conversion returns same amount", async () => {
      const result = await handleConvertCurrency(client, {
        amount: 42.5,
        from: "EUR",
        to: "EUR",
      });

      expect(result).toContain("42.50");
      expect(result).toContain("EUR");
    });

    it("case-insensitive currency input works", async () => {
      const result = await handleGetExchangeRates(client, {
        target: "usd",
        lastNObservations: 1,
      });

      expect(result).toContain("USD");
      expect(result).toMatch(/\d+\.\d+/);
    }, 15000);

    it("date range query returns bounded data", async () => {
      const result = await handleGetExchangeRates(client, {
        target: "USD",
        startPeriod: "2025-01-01",
        endPeriod: "2025-01-31",
      });

      expect(result).toContain("2025-01");
      expect(result).not.toContain("2024-12");
      expect(result).not.toContain("2025-02");
    }, 15000);
  });
});
