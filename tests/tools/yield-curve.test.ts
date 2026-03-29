import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { EcbClient } from "../../src/ecb-client.js";
import { handleGetYieldCurve } from "../../src/tools/yield-curve.js";

const fixture = readFileSync(
  join(import.meta.dirname, "../fixtures/yc-10y.csv"),
  "utf-8",
);

function mockClient(csv: string): EcbClient {
  return {
    fetchData: vi.fn().mockResolvedValue(csv),
    fetchMetadata: vi.fn(),
  } as unknown as EcbClient;
}

afterEach(() => vi.restoreAllMocks());

describe("handleGetYieldCurve", () => {
  it("returns formatted output with context header", async () => {
    const client = mockClient(fixture);
    const result = await handleGetYieldCurve(client, {});

    expect(result).toContain("Yield Curve");
    expect(result).toContain("ECB");
    expect(result).toContain("10Y");
    expect(result).toContain("Date");
    expect(result).toContain("Yield");
  });

  it("contains data values from fixture", async () => {
    const client = mockClient(fixture);
    const result = await handleGetYieldCurve(client, {});

    expect(result).toContain("2026-03");
    expect(result).toMatch(/\d+\.\d+/);
  });

  it("defaults to 10Y AAA", async () => {
    const client = mockClient(fixture);
    await handleGetYieldCurve(client, {});

    expect(client.fetchData).toHaveBeenCalledWith(
      "YC",
      "B.U2.EUR.4F.G_N_A.SV_C_YM.SR_10Y",
      expect.any(Object),
    );
  });

  it("accepts specific maturity", async () => {
    const client = mockClient(fixture);
    await handleGetYieldCurve(client, { maturity: "5Y" });

    expect(client.fetchData).toHaveBeenCalledWith(
      "YC",
      "B.U2.EUR.4F.G_N_A.SV_C_YM.SR_5Y",
      expect.any(Object),
    );
  });

  it("passes date range params", async () => {
    const client = mockClient(fixture);
    await handleGetYieldCurve(client, {
      startPeriod: "2025-01-01",
      endPeriod: "2025-12-31",
    });

    expect(client.fetchData).toHaveBeenCalledWith(
      "YC",
      expect.any(String),
      expect.objectContaining({
        startPeriod: "2025-01-01",
        endPeriod: "2025-12-31",
      }),
    );
  });

  it("handles empty CSV gracefully", async () => {
    const headerOnly = "KEY,FREQ,TIME_PERIOD,OBS_VALUE\n";
    const client = mockClient(headerOnly);
    const result = await handleGetYieldCurve(client, {});

    expect(result).toContain("No data");
  });
});
