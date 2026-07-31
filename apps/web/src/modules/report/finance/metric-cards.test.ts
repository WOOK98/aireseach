import { describe, expect, it } from "vitest";

import { fmt, fmtB, fmtMoney } from "./metric-format";

describe("finance metric card formatters", () => {
  it("does not append suffixes to empty values", () => {
    expect(fmt(null, 1, "x")).toBe("N/A");
    expect(fmt(undefined, 1, "%")).toBe("N/A");
    expect(fmt(Number.NaN, 1, "x")).toBe("N/A");
  });

  it("does not prefix currency to empty values", () => {
    expect(fmtMoney(null)).toBe("N/A");
    expect(fmtMoney(undefined)).toBe("N/A");
    expect(fmtB(null)).toBe("N/A");
  });

  it("keeps units on valid numbers", () => {
    expect(fmt(2.41, 1, "x")).toBe("2.4x");
    expect(fmt(12.34, 1, "%")).toBe("12.3%");
    expect(fmtMoney(3.25)).toBe("$3.25");
  });
});
