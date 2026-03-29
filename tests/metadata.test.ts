import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { EcbClient } from "../src/ecb-client.js";
import { MetadataService } from "../src/metadata.js";

const dataflowsXml = readFileSync(
  join(import.meta.dirname, "fixtures/dataflows.xml"),
  "utf-8",
);

function mockClient(xml: string): EcbClient {
  return {
    fetchData: vi.fn(),
    fetchMetadata: vi.fn().mockResolvedValue(xml),
  } as unknown as EcbClient;
}

afterEach(() => vi.restoreAllMocks());

describe("MetadataService", () => {
  describe("getDataflowList", () => {
    it("parses dataflows from XML", async () => {
      const client = mockClient(dataflowsXml);
      const service = new MetadataService(client);
      const flows = await service.getDataflowList();

      expect(flows.length).toBe(5);
      expect(flows.find((f) => f.id === "EXR")).toBeDefined();
      expect(flows.find((f) => f.id === "FM")).toBeDefined();
      expect(flows.find((f) => f.id === "ICP")).toBeDefined();
    });

    it("extracts id and name", async () => {
      const client = mockClient(dataflowsXml);
      const service = new MetadataService(client);
      const flows = await service.getDataflowList();

      const exr = flows.find((f) => f.id === "EXR");
      expect(exr?.name).toBe("Exchange Rates");
    });

    it("caches result on second call", async () => {
      const client = mockClient(dataflowsXml);
      const service = new MetadataService(client);

      await service.getDataflowList();
      await service.getDataflowList();

      expect(client.fetchMetadata).toHaveBeenCalledTimes(1);
    });

    it("does NOT cache failures — retries on next call", async () => {
      const client = {
        fetchData: vi.fn(),
        fetchMetadata: vi
          .fn()
          .mockRejectedValueOnce(new Error("503"))
          .mockResolvedValueOnce(dataflowsXml),
      } as unknown as EcbClient;

      const service = new MetadataService(client);

      await expect(service.getDataflowList()).rejects.toThrow();

      const flows = await service.getDataflowList();
      expect(flows.length).toBe(5);
      expect(client.fetchMetadata).toHaveBeenCalledTimes(2);
    });

    it("calls correct endpoint", async () => {
      const client = mockClient(dataflowsXml);
      const service = new MetadataService(client);
      await service.getDataflowList();

      expect(client.fetchMetadata).toHaveBeenCalledWith("dataflow/ECB");
    });
  });

  describe("searchDataflows", () => {
    it("finds dataflows by keyword in name", async () => {
      const client = mockClient(dataflowsXml);
      const service = new MetadataService(client);
      const results = await service.searchDataflows("exchange");

      expect(results.length).toBe(1);
      expect(results[0].id).toBe("EXR");
    });

    it("is case-insensitive", async () => {
      const client = mockClient(dataflowsXml);
      const service = new MetadataService(client);
      const results = await service.searchDataflows("YIELD");

      expect(results.length).toBe(1);
      expect(results[0].id).toBe("YC");
    });

    it("returns multiple matches", async () => {
      const client = mockClient(dataflowsXml);
      const service = new MetadataService(client);
      // "a" appears in "Exchange Rates", "Financial market data", "Balance Sheet Items"
      const results = await service.searchDataflows("market");

      expect(results.length).toBe(1);
      expect(results[0].id).toBe("FM");
    });

    it("returns empty array for no matches", async () => {
      const client = mockClient(dataflowsXml);
      const service = new MetadataService(client);
      const results = await service.searchDataflows("nonexistent");

      expect(results).toHaveLength(0);
    });

    it("matches by dataflow ID", async () => {
      const client = mockClient(dataflowsXml);
      const service = new MetadataService(client);
      const results = await service.searchDataflows("BSI");

      expect(results.length).toBe(1);
      expect(results[0].id).toBe("BSI");
    });
  });
});
