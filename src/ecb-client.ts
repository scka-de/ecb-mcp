import { logger } from "./logger.js";
import type { EcbClientConfig } from "./types.js";

const ECB_BASE_URL = "https://data-api.ecb.europa.eu/service";

export function createClientConfig(): EcbClientConfig {
  return {
    baseUrl: (process.env.ECB_API_URL || ECB_BASE_URL).replace(/\/+$/, ""),
    timeoutMs: 10_000,
    maxRetries: 3,
  };
}

export class EcbApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EcbApiError";
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Tracks last request time to enforce minimum delay between calls. */
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL_MS = 1000;

async function fetchWithRetry(
  url: string,
  headers: Record<string, string>,
  config: EcbClientConfig,
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      // Rate limiting: wait at least 1s between requests
      const now = Date.now();
      const elapsed = now - lastRequestTime;
      if (elapsed < MIN_REQUEST_INTERVAL_MS && lastRequestTime > 0) {
        await sleep(MIN_REQUEST_INTERVAL_MS - elapsed);
      }
      lastRequestTime = Date.now();

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

      const response = await fetch(url, {
        method: "GET",
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (response.status >= 500 && attempt < config.maxRetries) {
        const delay = 2 ** attempt * 1000;
        logger.warn(
          `ECB API error (${response.status}), retrying in ${delay}ms`,
          { attempt: attempt + 1, url },
        );
        await sleep(delay);
        continue;
      }

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < config.maxRetries) {
        const delay = 2 ** attempt * 1000;
        const reason =
          lastError.name === "AbortError" ? "Timeout" : "Network error";
        logger.warn(`${reason}, retrying in ${delay}ms`, {
          attempt: attempt + 1,
          error: lastError.message,
        });
        await sleep(delay);
      } else if (lastError.name === "AbortError") {
        throw new EcbApiError(
          `Request timed out after ${config.timeoutMs / 1000} seconds. ECB API may be slow.`,
        );
      }
    }
  }

  throw new EcbApiError(
    `Cannot reach ECB API. Check your internet connection. (${lastError?.message})`,
  );
}

function handleDataResponse(response: Response): Promise<string> {
  if (response.status === 400) {
    throw new EcbApiError(
      "Invalid query. Check your parameters — the SDMX series key may be malformed.",
    );
  }

  if (response.status === 404) {
    throw new EcbApiError(
      "No data found for this query. The combination of parameters may not have data for the requested period.",
    );
  }

  if (!response.ok) {
    throw new EcbApiError(`ECB API error (${response.status})`);
  }

  return response.text();
}

function handleMetadataResponse(response: Response): Promise<string> {
  if (response.status === 400) {
    throw new EcbApiError("Invalid metadata query.");
  }

  if (response.status === 404) {
    throw new EcbApiError(
      "Dataset not found. Use search_datasets to find available dataset IDs.",
    );
  }

  if (response.status === 406) {
    throw new EcbApiError(
      "ECB metadata endpoint returned 406. This is an internal error.",
    );
  }

  if (!response.ok) {
    throw new EcbApiError(`ECB API error (${response.status})`);
  }

  return response.text();
}

export class EcbClient {
  private config: EcbClientConfig;

  constructor(config: EcbClientConfig) {
    this.config = config;
  }

  /**
   * Fetch data from an ECB SDMX dataflow.
   * Returns raw CSV string.
   *
   * @param dataflow - e.g. "EXR", "FM", "ICP"
   * @param key - SDMX series key, e.g. "D.USD.EUR.SP00.A"
   * @param params - optional query params (startPeriod, endPeriod, lastNObservations)
   */
  async fetchData(
    dataflow: string,
    key: string,
    params?: Record<string, string>,
  ): Promise<string> {
    const query = new URLSearchParams({ format: "csvdata", ...params });
    const url = `${this.config.baseUrl}/data/${dataflow}/${key}?${query}`;

    logger.debug("Fetching ECB data", { dataflow, key, url });

    const response = await fetchWithRetry(
      url,
      { Accept: "text/csv" },
      this.config,
    );

    return handleDataResponse(response);
  }

  /**
   * Fetch metadata (XML) from the ECB SDMX API.
   * Returns raw XML string.
   *
   * @param path - e.g. "dataflow/ECB" or "datastructure/ECB/ECB_EXR1?references=children"
   */
  async fetchMetadata(path: string): Promise<string> {
    const url = `${this.config.baseUrl}/${path}`;

    logger.debug("Fetching ECB metadata", { path, url });

    const response = await fetchWithRetry(
      url,
      { Accept: "application/xml" },
      this.config,
    );

    return handleMetadataResponse(response);
  }
}

/**
 * Reset the rate limiter — only used in tests.
 * @internal
 */
export function _resetRateLimiter(): void {
  lastRequestTime = 0;
}
