import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  EcbApiError,
  EcbClient,
  _resetRateLimiter,
  createClientConfig,
} from "../src/ecb-client.js";
import type { EcbClientConfig } from "../src/types.js";

function testConfig(overrides?: Partial<EcbClientConfig>): EcbClientConfig {
  return {
    baseUrl: "https://data-api.ecb.europa.eu/service",
    timeoutMs: 1000,
    maxRetries: 1,
    ...overrides,
  };
}

function mockFetch(body: string, status = 200): void {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      url: "https://data-api.ecb.europa.eu/service/test",
      text: () => Promise.resolve(body),
    }),
  );
}

function mockFetchSequence(
  responses: Array<{ body: string; status: number }>,
): void {
  const fn = vi.fn();
  for (const r of responses) {
    fn.mockResolvedValueOnce({
      ok: r.status >= 200 && r.status < 300,
      status: r.status,
      url: "https://data-api.ecb.europa.eu/service/test",
      text: () => Promise.resolve(r.body),
    });
  }
  vi.stubGlobal("fetch", fn);
}

beforeEach(() => {
  _resetRateLimiter();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createClientConfig", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns default config", () => {
    const config = createClientConfig();
    expect(config.baseUrl).toBe("https://data-api.ecb.europa.eu/service");
    expect(config.timeoutMs).toBe(10_000);
    expect(config.maxRetries).toBe(3);
  });

  it("respects ECB_API_URL env var", () => {
    process.env.ECB_API_URL = "https://custom.ecb.test/api/";
    const config = createClientConfig();
    expect(config.baseUrl).toBe("https://custom.ecb.test/api");
  });

  it("strips trailing slashes from URL", () => {
    process.env.ECB_API_URL = "https://custom.ecb.test///";
    const config = createClientConfig();
    expect(config.baseUrl).toBe("https://custom.ecb.test");
  });
});

describe("EcbClient", () => {
  describe("fetchData", () => {
    it("fetches CSV data with correct URL and headers", async () => {
      const csv = "KEY,FREQ,OBS_VALUE\nEXR.D.USD,D,1.08";
      mockFetch(csv);

      const client = new EcbClient(testConfig());
      const result = await client.fetchData("EXR", "D.USD.EUR.SP00.A");

      expect(result).toBe(csv);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/data/EXR/D.USD.EUR.SP00.A"),
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({ Accept: "text/csv" }),
        }),
      );
    });

    it("includes format=csvdata query param", async () => {
      mockFetch("data");
      const client = new EcbClient(testConfig());
      await client.fetchData("EXR", "D.USD.EUR.SP00.A");

      const calledUrl = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(calledUrl).toContain("format=csvdata");
    });

    it("passes optional query params", async () => {
      mockFetch("data");
      const client = new EcbClient(testConfig());
      await client.fetchData("EXR", "D.USD.EUR.SP00.A", {
        startPeriod: "2025-01-01",
        endPeriod: "2025-12-31",
      });

      const calledUrl = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(calledUrl).toContain("startPeriod=2025-01-01");
      expect(calledUrl).toContain("endPeriod=2025-12-31");
    });

    it("throws on 400 with helpful message", async () => {
      mockFetch("Bad Request", 400);
      const client = new EcbClient(testConfig());

      await expect(client.fetchData("EXR", "INVALID.KEY")).rejects.toThrowError(
        EcbApiError,
      );
      await expect(client.fetchData("EXR", "INVALID.KEY")).rejects.toThrowError(
        /Invalid query/,
      );
    });

    it("throws on 404 with no-data message", async () => {
      mockFetch("Not Found", 404);
      const client = new EcbClient(testConfig());

      await expect(
        client.fetchData("EXR", "D.XYZ.EUR.SP00.A"),
      ).rejects.toThrowError(/No data found/);
    });
  });

  describe("fetchMetadata", () => {
    it("fetches XML with correct Accept header", async () => {
      const xml = '<Structure xmlns="...">...</Structure>';
      mockFetch(xml);

      const client = new EcbClient(testConfig());
      const result = await client.fetchMetadata("dataflow/ECB");

      expect(result).toBe(xml);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("/dataflow/ECB"),
        expect.objectContaining({
          headers: expect.objectContaining({
            Accept: "application/xml",
          }),
        }),
      );
    });

    it("throws on 404 with dataset-not-found message", async () => {
      mockFetch("Not Found", 404);
      const client = new EcbClient(testConfig());

      await expect(
        client.fetchMetadata("datastructure/ECB/NONEXISTENT"),
      ).rejects.toThrowError(/Dataset not found/);
    });

    it("throws on 406", async () => {
      mockFetch("Not Acceptable", 406);
      const client = new EcbClient(testConfig());

      await expect(client.fetchMetadata("dataflow/ECB")).rejects.toThrowError(
        /406/,
      );
    });
  });

  describe("retry logic", () => {
    it("retries on 503 and succeeds", async () => {
      mockFetchSequence([
        { body: "Service Unavailable", status: 503 },
        { body: "KEY,OBS_VALUE\nEXR,1.08", status: 200 },
      ]);

      const client = new EcbClient(testConfig({ maxRetries: 2 }));
      const result = await client.fetchData("EXR", "D.USD.EUR.SP00.A");

      expect(result).toBe("KEY,OBS_VALUE\nEXR,1.08");
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it("throws after retries exhausted on 503", async () => {
      mockFetchSequence([
        { body: "Service Unavailable", status: 503 },
        { body: "Service Unavailable", status: 503 },
      ]);

      const client = new EcbClient(testConfig({ maxRetries: 1 }));

      await expect(
        client.fetchData("EXR", "D.USD.EUR.SP00.A"),
      ).rejects.toThrowError(EcbApiError);
    });

    it("throws timeout error with clear message", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockRejectedValue(
          Object.assign(new Error("The operation was aborted"), {
            name: "AbortError",
          }),
        ),
      );

      const client = new EcbClient(testConfig({ maxRetries: 0 }));

      await expect(
        client.fetchData("EXR", "D.USD.EUR.SP00.A"),
      ).rejects.toThrowError(/timed out/);
    });

    it("throws network error with clear message", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockRejectedValue(new Error("getaddrinfo ENOTFOUND")),
      );

      const client = new EcbClient(testConfig({ maxRetries: 0 }));

      await expect(
        client.fetchData("EXR", "D.USD.EUR.SP00.A"),
      ).rejects.toThrowError(/Cannot reach ECB API/);
    });
  });
});
