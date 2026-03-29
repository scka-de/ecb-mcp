import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { EcbClient } from "../../src/ecb-client.js";
import { handleGetMoneySupply } from "../../src/tools/money-supply.js";

const fixture = readFileSync(
  join(import.meta.dirname, "../fixtures/bsi-m3.csv"),
  "utf-8",
);

function mockClient(csv: string): EcbClient {
  return {
    fetchData: vi.fn().mockResolvedValue(csv),
    fetchMetadata: vi.fn(),
  } as unknown as EcbClient;
}

afterEach(() => vi.restoreAllMocks());

describe("handleGetMoneySupply", () => {
  it("returns formatted output with context header", async () => {
    const client = mockClient(fixture);
    const result = await handleGetMoneySupply(client, {});

    expect(result).toContain("M3");
    expect(result).toContain("ECB");
    expect(result).toContain("Date");
    expect(result).toContain("Value");
  });

  it("contains data values from fixture", async () => {
    const client = mockClient(fixture);
    const result = await handleGetMoneySupply(client, {});

    expect(result).toContain("2025-");
    expect(result).toMatch(/\d+/);
  });

  it("defaults to M3 outstanding euro area", async () => {
    const client = mockClient(fixture);
    await handleGetMoneySupply(client, {});

    expect(client.fetchData).toHaveBeenCalledWith(
      "BSI",
      "M.U2.Y.V.M30.X.1.U2.2300.Z01.E",
      expect.any(Object),
    );
  });

  it("accepts M1 aggregate", async () => {
    const client = mockClient(fixture);
    await handleGetMoneySupply(client, { aggregate: "M1" });

    expect(client.fetchData).toHaveBeenCalledWith(
      "BSI",
      "M.U2.Y.V.M10.X.1.U2.2300.Z01.E",
      expect.any(Object),
    );
  });

  it("accepts growth_rate measure", async () => {
    const client = mockClient(fixture);
    await handleGetMoneySupply(client, { measure: "growth_rate" });

    expect(client.fetchData).toHaveBeenCalledWith(
      "BSI",
      "M.U2.Y.V.M30.X.4.U2.2300.Z01.E",
      expect.any(Object),
    );
  });

  it("accepts specific country", async () => {
    const client = mockClient(fixture);
    await handleGetMoneySupply(client, { country: "DE" });

    expect(client.fetchData).toHaveBeenCalledWith(
      "BSI",
      "M.DE.Y.V.M30.X.1.U2.2300.Z01.E",
      expect.any(Object),
    );
  });

  it("passes date range params", async () => {
    const client = mockClient(fixture);
    await handleGetMoneySupply(client, {
      startPeriod: "2024-01",
      endPeriod: "2024-12",
    });

    expect(client.fetchData).toHaveBeenCalledWith(
      "BSI",
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
    const result = await handleGetMoneySupply(client, {});

    expect(result).toContain("No data");
  });
});
