import { describe, expect, it } from "vitest";
import { parseEcbCsv } from "../src/csv-parser.js";

describe("parseEcbCsv", () => {
  it("parses standard CSV with headers", () => {
    const csv = "KEY,TIME_PERIOD,OBS_VALUE\nEXR.D,2026-03-25,1.08\n";
    const rows = parseEcbCsv(csv);

    expect(rows).toHaveLength(1);
    expect(rows[0].TIME_PERIOD).toBe("2026-03-25");
    expect(rows[0].OBS_VALUE).toBe("1.08");
  });

  it("parses multiple rows", () => {
    const csv =
      "KEY,TIME_PERIOD,OBS_VALUE\nA,2026-01,1.1\nB,2026-02,1.2\nC,2026-03,1.3\n";
    const rows = parseEcbCsv(csv);
    expect(rows).toHaveLength(3);
  });

  it("handles quoted fields with commas", () => {
    const csv = 'KEY,TITLE,OBS_VALUE\nEXR,"US dollar/Euro, rate",1.08\n';
    const rows = parseEcbCsv(csv);

    expect(rows).toHaveLength(1);
    expect(rows[0].TITLE).toBe("US dollar/Euro, rate");
  });

  it("strips BOM marker", () => {
    const csv = "\uFEFFKEY,TIME_PERIOD,OBS_VALUE\nEXR,2026-03-25,1.08\n";
    const rows = parseEcbCsv(csv);

    expect(rows).toHaveLength(1);
    expect(rows[0].KEY).toBe("EXR");
  });

  it("returns empty array for headers only", () => {
    const csv = "KEY,TIME_PERIOD,OBS_VALUE\n";
    const rows = parseEcbCsv(csv);
    expect(rows).toHaveLength(0);
  });

  it("returns empty array for empty string", () => {
    const rows = parseEcbCsv("");
    expect(rows).toHaveLength(0);
  });

  it("parses real ECB fixture correctly", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const fixture = readFileSync(
      join(import.meta.dirname, "fixtures/exr-usd.csv"),
      "utf-8",
    );
    const rows = parseEcbCsv(fixture);

    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]).toHaveProperty("TIME_PERIOD");
    expect(rows[0]).toHaveProperty("OBS_VALUE");
    expect(rows[0]).toHaveProperty("CURRENCY");
    expect(rows[0].CURRENCY).toBe("USD");
  });
});
