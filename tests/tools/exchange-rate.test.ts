import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { EcbClient } from "../../src/ecb-client.js";
import { handleGetExchangeRates } from "../../src/tools/exchange-rate.js";

const FIXTURE_DIR = join(import.meta.dirname, "../fixtures");
const exrFixture = readFileSync(join(FIXTURE_DIR, "exr-usd.csv"), "utf-8");

function mockClient(csvResponse: string): EcbClient {
  return {
    fetchData: vi.fn().mockResolvedValue(csvResponse),
    fetchMetadata: vi.fn(),
  } as unknown as EcbClient;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("handleGetExchangeRates", () => {
  it("returns formatted output with context header", async () => {
    const client = mockClient(exrFixture);
    const result = await handleGetExchangeRates(client, { target: "USD" });

    expect(result).toContain("EUR/USD");
    expect(result).toContain("ECB");
    expect(result).toContain("Date");
    expect(result).toContain("Rate");
  });

  it("contains actual data values from fixture", async () => {
    const client = mockClient(exrFixture);
    const result = await handleGetExchangeRates(client, { target: "USD" });

    // The fixture has real ECB data — check that values appear
    expect(result).toContain("2026-03");
    expect(result).toMatch(/1\.\d{4}/);
  });

  it("calls client with correct dataflow and key", async () => {
    const client = mockClient(exrFixture);
    await handleGetExchangeRates(client, { target: "USD" });

    expect(client.fetchData).toHaveBeenCalledWith(
      "EXR",
      "D.USD.EUR.SP00.A",
      expect.any(Object),
    );
  });

  it("passes frequency to key builder", async () => {
    const client = mockClient(exrFixture);
    await handleGetExchangeRates(client, {
      target: "GBP",
      frequency: "M",
    });

    expect(client.fetchData).toHaveBeenCalledWith(
      "EXR",
      "M.GBP.EUR.SP00.A",
      expect.any(Object),
    );
  });

  it("passes date range params to client", async () => {
    const client = mockClient(exrFixture);
    await handleGetExchangeRates(client, {
      target: "USD",
      startPeriod: "2025-01-01",
      endPeriod: "2025-12-31",
    });

    expect(client.fetchData).toHaveBeenCalledWith(
      "EXR",
      "D.USD.EUR.SP00.A",
      expect.objectContaining({
        startPeriod: "2025-01-01",
        endPeriod: "2025-12-31",
      }),
    );
  });

  it("passes lastNObservations param", async () => {
    const client = mockClient(exrFixture);
    await handleGetExchangeRates(client, {
      target: "USD",
      lastNObservations: 5,
    });

    expect(client.fetchData).toHaveBeenCalledWith(
      "EXR",
      "D.USD.EUR.SP00.A",
      expect.objectContaining({ lastNObservations: "5" }),
    );
  });

  it("handles empty CSV (headers only) gracefully", async () => {
    const headerOnly =
      "KEY,FREQ,CURRENCY,CURRENCY_DENOM,EXR_TYPE,EXR_SUFFIX,TIME_PERIOD,OBS_VALUE\n";
    const client = mockClient(headerOnly);
    const result = await handleGetExchangeRates(client, { target: "XYZ" });

    expect(result).toContain("No data");
  });
});
