import { describe, expect, it } from "vitest";
import {
  buildBsiKey,
  buildExrKey,
  buildFmKey,
  buildIcpKey,
  buildYcKey,
} from "../src/sdmx-keys.js";

describe("buildExrKey", () => {
  it("builds daily EUR/USD key", () => {
    expect(buildExrKey("USD")).toBe("D.USD.EUR.SP00.A");
  });

  it("builds daily EUR/GBP key", () => {
    expect(buildExrKey("GBP")).toBe("D.GBP.EUR.SP00.A");
  });

  it("accepts monthly frequency", () => {
    expect(buildExrKey("USD", "M")).toBe("M.USD.EUR.SP00.A");
  });

  it("accepts annual frequency", () => {
    expect(buildExrKey("JPY", "A")).toBe("A.JPY.EUR.SP00.A");
  });

  it("accepts frequency aliases", () => {
    expect(buildExrKey("USD", "daily")).toBe("D.USD.EUR.SP00.A");
    expect(buildExrKey("USD", "monthly")).toBe("M.USD.EUR.SP00.A");
    expect(buildExrKey("USD", "annual")).toBe("A.USD.EUR.SP00.A");
  });

  it("normalizes lowercase input to uppercase", () => {
    expect(buildExrKey("usd")).toBe("D.USD.EUR.SP00.A");
    expect(buildExrKey("gbp", "d")).toBe("D.GBP.EUR.SP00.A");
  });

  it("trims whitespace", () => {
    expect(buildExrKey(" USD ")).toBe("D.USD.EUR.SP00.A");
  });

  it("supports multiple currencies with + operator", () => {
    expect(buildExrKey("USD+GBP+JPY")).toBe("D.USD+GBP+JPY.EUR.SP00.A");
  });
});

describe("buildFmKey", () => {
  it("builds MRO key", () => {
    expect(buildFmKey("MRO")).toBe("B.U2.EUR.4F.KR.MRR_FR.LEV");
  });

  it("builds deposit facility key", () => {
    expect(buildFmKey("deposit_facility")).toBe("B.U2.EUR.4F.KR.DFR.LEV");
  });

  it("builds marginal lending key", () => {
    expect(buildFmKey("marginal_lending")).toBe("B.U2.EUR.4F.KR.MLFR.LEV");
  });

  it("accepts aliases", () => {
    expect(buildFmKey("deposit")).toBe("B.U2.EUR.4F.KR.DFR.LEV");
    expect(buildFmKey("marginal")).toBe("B.U2.EUR.4F.KR.MLFR.LEV");
    expect(buildFmKey("main_refinancing")).toBe("B.U2.EUR.4F.KR.MRR_FR.LEV");
  });

  it("is case-insensitive", () => {
    expect(buildFmKey("mro")).toBe("B.U2.EUR.4F.KR.MRR_FR.LEV");
    expect(buildFmKey("Deposit_Facility")).toBe("B.U2.EUR.4F.KR.DFR.LEV");
  });

  it("throws on unknown type", () => {
    expect(() => buildFmKey("unknown")).toThrowError(
      /Unknown interest rate type/,
    );
  });

  it("lists valid types in error message", () => {
    expect(() => buildFmKey("bad")).toThrowError(/MRO/);
  });
});

describe("buildYcKey", () => {
  it("builds 10Y AAA yield curve key (defaults)", () => {
    expect(buildYcKey()).toBe("B.U2.EUR.4F.G_N_C.SV_C_YM.SR_10Y");
  });

  it("builds specific maturity", () => {
    expect(buildYcKey("5Y")).toBe("B.U2.EUR.4F.G_N_C.SV_C_YM.SR_5Y");
  });

  it("builds 3M maturity", () => {
    expect(buildYcKey("3M")).toBe("B.U2.EUR.4F.G_N_C.SV_C_YM.SR_3M");
  });

  it("is case-insensitive for maturity", () => {
    expect(buildYcKey("10y")).toBe("B.U2.EUR.4F.G_N_C.SV_C_YM.SR_10Y");
  });

  it("uses G_N_A for all_gov issuer type", () => {
    expect(buildYcKey("10Y", "all_gov")).toBe(
      "B.U2.EUR.4F.G_N_A.SV_C_YM.SR_10Y",
    );
  });

  it("uses G_N_C (AAA) by default", () => {
    expect(buildYcKey("10Y", "aaa")).toBe("B.U2.EUR.4F.G_N_C.SV_C_YM.SR_10Y");
  });
});

describe("buildIcpKey", () => {
  it("builds euro area annual rate key (defaults)", () => {
    expect(buildIcpKey()).toBe("M.U2.N.000000.4.ANR");
  });

  it("builds specific country", () => {
    expect(buildIcpKey("DE")).toBe("M.DE.N.000000.4.ANR");
  });

  it("builds index measure", () => {
    expect(buildIcpKey("U2", "index")).toBe("M.U2.N.000000.4.INX");
  });

  it("builds France annual rate", () => {
    expect(buildIcpKey("FR", "annual_rate")).toBe("M.FR.N.000000.4.ANR");
  });

  it("is case-insensitive", () => {
    expect(buildIcpKey("de", "INDEX")).toBe("M.DE.N.000000.4.INX");
  });
});

describe("buildBsiKey", () => {
  it("builds M3 outstanding euro area key (defaults)", () => {
    expect(buildBsiKey()).toBe("M.U2.Y.V.M30.X.1.U2.2300.Z01.E");
  });

  it("builds M1 key", () => {
    expect(buildBsiKey("M1")).toBe("M.U2.Y.V.M10.X.1.U2.2300.Z01.E");
  });

  it("builds M2 key", () => {
    expect(buildBsiKey("M2")).toBe("M.U2.Y.V.M20.X.1.U2.2300.Z01.E");
  });

  it("builds growth rate measure", () => {
    expect(buildBsiKey("M3", "growth_rate")).toBe(
      "M.U2.Y.V.M30.X.4.U2.2300.Z01.E",
    );
  });

  it("builds specific country", () => {
    expect(buildBsiKey("M3", "outstanding", "DE")).toBe(
      "M.DE.Y.V.M30.X.1.U2.2300.Z01.E",
    );
  });

  it("is case-insensitive", () => {
    expect(buildBsiKey("m3", "OUTSTANDING", "de")).toBe(
      "M.DE.Y.V.M30.X.1.U2.2300.Z01.E",
    );
  });

  it("throws on unknown aggregate", () => {
    expect(() => buildBsiKey("M4")).toThrowError(/Unknown monetary aggregate/);
  });

  it("lists valid aggregates in error", () => {
    expect(() => buildBsiKey("bad")).toThrowError(/M1, M2, M3/);
  });
});
