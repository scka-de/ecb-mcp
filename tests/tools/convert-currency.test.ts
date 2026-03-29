import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { EcbClient } from "../../src/ecb-client.js";
import { handleConvertCurrency } from "../../src/tools/exchange-rate.js";

const FIXTURE_DIR = join(import.meta.dirname, "../fixtures");
const singleFixture = readFileSync(join(FIXTURE_DIR, "exr-usd.csv"), "utf-8");
const crossFixture = readFileSync(
  join(FIXTURE_DIR, "exr-usd-gbp.csv"),
  "utf-8",
);

function mockClient(csv: string): EcbClient {
  return {
    fetchData: vi.fn().mockResolvedValue(csv),
    fetchMetadata: vi.fn(),
  } as unknown as EcbClient;
}

afterEach(() => vi.restoreAllMocks());

describe("handleConvertCurrency", () => {
  it("converts EUR to USD (direct)", async () => {
    const client = mockClient(singleFixture);
    const result = await handleConvertCurrency(client, {
      amount: 100,
      from: "EUR",
      to: "USD",
    });

    expect(result).toContain("USD");
    expect(result).toMatch(/\d+\.\d{2}/); // formatted amount
    expect(result).toContain("ECB");
  });

  it("converts USD to EUR (inverse)", async () => {
    const client = mockClient(singleFixture);
    const result = await handleConvertCurrency(client, {
      amount: 100,
      from: "USD",
      to: "EUR",
    });

    expect(result).toContain("EUR");
    expect(result).toMatch(/\d+\.\d{2}/);
  });

  it("converts USD to GBP (cross-rate via EUR)", async () => {
    const client = mockClient(crossFixture);
    const result = await handleConvertCurrency(client, {
      amount: 100,
      from: "USD",
      to: "GBP",
    });

    expect(result).toContain("GBP");
    expect(result).toContain("EUR"); // mentions triangulation
    expect(result).toMatch(/\d+\.\d{2}/);
  });

  it("uses SDMX OR operator for cross-rate fetch", async () => {
    const client = mockClient(crossFixture);
    await handleConvertCurrency(client, {
      amount: 100,
      from: "USD",
      to: "GBP",
    });

    // Should fetch both currencies in a single request
    const calledKey = (client.fetchData as ReturnType<typeof vi.fn>).mock
      .calls[0][1] as string;
    expect(calledKey).toContain("+");
    expect(calledKey).toContain("USD");
    expect(calledKey).toContain("GBP");
  });

  it("fetches single currency for EUR→X", async () => {
    const client = mockClient(singleFixture);
    await handleConvertCurrency(client, {
      amount: 100,
      from: "EUR",
      to: "USD",
    });

    expect(client.fetchData).toHaveBeenCalledTimes(1);
    const calledKey = (client.fetchData as ReturnType<typeof vi.fn>).mock
      .calls[0][1] as string;
    expect(calledKey).not.toContain("+");
  });

  it("includes rate and date in output", async () => {
    const client = mockClient(singleFixture);
    const result = await handleConvertCurrency(client, {
      amount: 100,
      from: "EUR",
      to: "USD",
    });

    expect(result).toMatch(/rate: \d+\.\d+/i);
    expect(result).toMatch(/date: \d{4}-\d{2}-\d{2}/i);
  });

  it("accepts optional date parameter", async () => {
    const client = mockClient(singleFixture);
    await handleConvertCurrency(client, {
      amount: 100,
      from: "EUR",
      to: "USD",
      date: "2025-06-15",
    });

    expect(client.fetchData).toHaveBeenCalledWith(
      "EXR",
      expect.any(String),
      expect.objectContaining({ startPeriod: "2025-06-15" }),
    );
  });

  it("handles EUR to EUR gracefully", async () => {
    const client = mockClient(singleFixture);
    const result = await handleConvertCurrency(client, {
      amount: 100,
      from: "EUR",
      to: "EUR",
    });

    expect(result).toContain("100.00");
    expect(result).toContain("EUR");
    expect(client.fetchData).not.toHaveBeenCalled();
  });
});
