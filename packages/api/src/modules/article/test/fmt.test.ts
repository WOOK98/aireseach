/**
 * Article route — fmt/fmtB pure function tests (#116)
 *
 * Validates that real zero values render as "0" (not "N/A").
 */
import { describe, it, expect } from "vitest";

import { fmt } from "../data-gate";

describe("fmt", () => {
  it("returns N/A for null", () => {
    expect(fmt(null)).toBe("N/A");
  });

  it("returns N/A for undefined", () => {
    expect(fmt(undefined)).toBe("N/A");
  });

  it("renders real zero as 0.0 (not N/A)", () => {
    expect(fmt(0)).toBe("0.0");
  });

  it("renders zero with custom decimals", () => {
    expect(fmt(0, 2)).toBe("0.00");
  });

  it("renders positive numbers", () => {
    expect(fmt(75.2)).toBe("75.2");
  });

  it("renders negative numbers", () => {
    expect(fmt(-3.14, 2)).toBe("-3.14");
  });
});
