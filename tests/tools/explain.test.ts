import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { EcbClient } from "../../src/ecb-client.js";
import { MetadataService } from "../../src/metadata.js";
import { handleExplainDataset } from "../../src/tools/explain.js";

const FIXTURE_DIR = join(import.meta.dirname, "../fixtures");
const dataflowsXml = readFileSync(join(FIXTURE_DIR, "dataflows.xml"), "utf-8");
const structureXml = readFileSync(
  join(FIXTURE_DIR, "structure-exr.xml"),
  "utf-8",
);

function mockClient(): EcbClient {
  return {
    fetchData: vi.fn(),
    fetchMetadata: vi.fn().mockImplementation((path: string) => {
      if (path.includes("dataflow")) return Promise.resolve(dataflowsXml);
      if (path.includes("datastructure")) return Promise.resolve(structureXml);
      return Promise.reject(new Error(`Unexpected path: ${path}`));
    }),
  } as unknown as EcbClient;
}

afterEach(() => vi.restoreAllMocks());

describe("handleExplainDataset", () => {
  it("returns formatted output with dataset name", async () => {
    const client = mockClient();
    const metadata = new MetadataService(client);
    const result = await handleExplainDataset(metadata, {
      dataset_id: "EXR",
    });

    expect(result).toContain("EXR");
    expect(result).toContain("Exchange Rates");
  });

  it("lists dimensions with positions", async () => {
    const client = mockClient();
    const metadata = new MetadataService(client);
    const result = await handleExplainDataset(metadata, {
      dataset_id: "EXR",
    });

    expect(result).toContain("FREQ");
    expect(result).toContain("CURRENCY");
    expect(result).toContain("CURRENCY_DENOM");
    expect(result).toContain("EXR_TYPE");
    expect(result).toContain("EXR_SUFFIX");
  });

  it("shows valid values for dimensions", async () => {
    const client = mockClient();
    const metadata = new MetadataService(client);
    const result = await handleExplainDataset(metadata, {
      dataset_id: "EXR",
    });

    expect(result).toContain("USD");
    expect(result).toContain("GBP");
    expect(result).toContain("Daily");
    expect(result).toContain("Monthly");
  });

  it("includes an example query", async () => {
    const client = mockClient();
    const metadata = new MetadataService(client);
    const result = await handleExplainDataset(metadata, {
      dataset_id: "EXR",
    });

    expect(result).toMatch(/example/i);
  });

  it("is case-insensitive for dataset_id", async () => {
    const client = mockClient();
    const metadata = new MetadataService(client);
    const result = await handleExplainDataset(metadata, {
      dataset_id: "exr",
    });

    expect(result).toContain("EXR");
  });

  it("throws for unknown dataset", async () => {
    const client = mockClient();
    const metadata = new MetadataService(client);

    await expect(
      handleExplainDataset(metadata, { dataset_id: "NONEXISTENT" }),
    ).rejects.toThrow(/not found/i);
  });
});
