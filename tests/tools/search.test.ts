import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { EcbClient } from "../../src/ecb-client.js";
import { MetadataService } from "../../src/metadata.js";
import { handleSearchDatasets } from "../../src/tools/search.js";

const dataflowsXml = readFileSync(
  join(import.meta.dirname, "../fixtures/dataflows.xml"),
  "utf-8",
);

function mockClient(xml: string): EcbClient {
  return {
    fetchData: vi.fn(),
    fetchMetadata: vi.fn().mockResolvedValue(xml),
  } as unknown as EcbClient;
}

afterEach(() => vi.restoreAllMocks());

describe("handleSearchDatasets", () => {
  it("returns formatted results with matching datasets", async () => {
    const client = mockClient(dataflowsXml);
    const metadata = new MetadataService(client);
    const result = await handleSearchDatasets(metadata, {
      query: "exchange",
    });

    expect(result).toContain("EXR");
    expect(result).toContain("Exchange Rates");
  });

  it("shows result count", async () => {
    const client = mockClient(dataflowsXml);
    const metadata = new MetadataService(client);
    const result = await handleSearchDatasets(metadata, { query: "exchange" });

    expect(result).toMatch(/1 dataset/i);
  });

  it("returns no-results message for unmatched query", async () => {
    const client = mockClient(dataflowsXml);
    const metadata = new MetadataService(client);
    const result = await handleSearchDatasets(metadata, {
      query: "nonexistent",
    });

    expect(result).toContain("No datasets found");
  });

  it("lists multiple results", async () => {
    const client = mockClient(dataflowsXml);
    const metadata = new MetadataService(client);
    // "i" appears in Financial market data, Indices of Consumer Prices, Yield Curve, Balance Sheet Items
    const result = await handleSearchDatasets(metadata, { query: "i" });

    expect(result).toContain("FM");
    expect(result).toContain("ICP");
    expect(result).toMatch(/4 datasets/i);
  });
});
