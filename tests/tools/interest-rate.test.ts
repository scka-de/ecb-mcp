import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { EcbClient } from "../../src/ecb-client.js";
import { handleGetInterestRates } from "../../src/tools/interest-rate.js";

const fixture = readFileSync(
  join(import.meta.dirname, "../fixtures/fm-mrr.csv"),
  "utf-8",
);

function mockClient(csv: string): EcbClient {
  return {
    fetchData: vi.fn().mockResolvedValue(csv),
    fetchMetadata: vi.fn(),
  } as unknown as EcbClient;
}

afterEach(() => vi.restoreAllMocks());

describe("handleGetInterestRates", () => {
  it("returns formatted output with context header", async () => {
    const client = mockClient(fixture);
    const result = await handleGetInterestRates(client, { type: "MRO" });

    expect(result).toContain("ECB");
    expect(result).toContain("Main Refinancing");
    expect(result).toContain("Date");
    expect(result).toContain("Rate");
  });

  it("contains data values from fixture", async () => {
    const client = mockClient(fixture);
    const result = await handleGetInterestRates(client, { type: "MRO" });

    expect(result).toContain("2025-");
    expect(result).toMatch(/\d+\.\d+/);
  });

  it("calls client with FM dataflow and MRO key", async () => {
    const client = mockClient(fixture);
    await handleGetInterestRates(client, { type: "MRO" });

    expect(client.fetchData).toHaveBeenCalledWith(
      "FM",
      "B.U2.EUR.4F.KR.MRR_FR.LEV",
      expect.any(Object),
    );
  });

  it("calls client with deposit facility key", async () => {
    const client = mockClient(fixture);
    await handleGetInterestRates(client, { type: "deposit_facility" });

    expect(client.fetchData).toHaveBeenCalledWith(
      "FM",
      "B.U2.EUR.4F.KR.DFR.LEV",
      expect.any(Object),
    );
  });

  it("passes date range params", async () => {
    const client = mockClient(fixture);
    await handleGetInterestRates(client, {
      type: "MRO",
      startPeriod: "2024-01-01",
      endPeriod: "2024-12-31",
    });

    expect(client.fetchData).toHaveBeenCalledWith(
      "FM",
      expect.any(String),
      expect.objectContaining({
        startPeriod: "2024-01-01",
        endPeriod: "2024-12-31",
      }),
    );
  });

  it("handles empty CSV gracefully", async () => {
    const headerOnly = "KEY,FREQ,TIME_PERIOD,OBS_VALUE\n";
    const client = mockClient(headerOnly);
    const result = await handleGetInterestRates(client, { type: "MRO" });

    expect(result).toContain("No data");
  });
});
