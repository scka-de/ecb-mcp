import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { EcbClient } from "../../src/ecb-client.js";
import { handleGetInflation } from "../../src/tools/inflation.js";

const fixture = readFileSync(
  join(import.meta.dirname, "../fixtures/icp-u2.csv"),
  "utf-8",
);

function mockClient(csv: string): EcbClient {
  return {
    fetchData: vi.fn().mockResolvedValue(csv),
    fetchMetadata: vi.fn(),
  } as unknown as EcbClient;
}

afterEach(() => vi.restoreAllMocks());

describe("handleGetInflation", () => {
  it("returns formatted output with context header", async () => {
    const client = mockClient(fixture);
    const result = await handleGetInflation(client, {});

    expect(result).toContain("HICP");
    expect(result).toContain("ECB");
    expect(result).toContain("Date");
    expect(result).toContain("Rate");
  });

  it("contains data values from fixture", async () => {
    const client = mockClient(fixture);
    const result = await handleGetInflation(client, {});

    expect(result).toContain("2025-");
    expect(result).toMatch(/\d+\.\d/);
  });

  it("defaults to euro area and annual rate", async () => {
    const client = mockClient(fixture);
    await handleGetInflation(client, {});

    expect(client.fetchData).toHaveBeenCalledWith(
      "ICP",
      "M.U2.N.000000.4.ANR",
      expect.any(Object),
    );
  });

  it("accepts specific country", async () => {
    const client = mockClient(fixture);
    await handleGetInflation(client, { country: "DE" });

    expect(client.fetchData).toHaveBeenCalledWith(
      "ICP",
      "M.DE.N.000000.4.ANR",
      expect.any(Object),
    );
  });

  it("accepts index measure", async () => {
    const client = mockClient(fixture);
    await handleGetInflation(client, { measure: "index" });

    expect(client.fetchData).toHaveBeenCalledWith(
      "ICP",
      "M.U2.N.000000.4.INX",
      expect.any(Object),
    );
  });

  it("passes date range params", async () => {
    const client = mockClient(fixture);
    await handleGetInflation(client, {
      startPeriod: "2024-01",
      endPeriod: "2024-12",
    });

    expect(client.fetchData).toHaveBeenCalledWith(
      "ICP",
      expect.any(String),
      expect.objectContaining({
        startPeriod: "2024-01",
        endPeriod: "2024-12",
      }),
    );
  });

  it("handles empty CSV gracefully", async () => {
    const headerOnly = "KEY,FREQ,TIME_PERIOD,OBS_VALUE\n";
    const client = mockClient(headerOnly);
    const result = await handleGetInflation(client, {});

    expect(result).toContain("No data");
  });
});
