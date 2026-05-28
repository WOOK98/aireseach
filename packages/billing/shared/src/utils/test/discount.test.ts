import { describe, expect, it, vi } from "vitest";

import {
  BillingType,
  BillingDiscountType,
  BillingModel,
  RecurringInterval,
} from "../../types";
import {
  calculateDiscount,
  calculateRecurringDiscount,
  getVariantDiscount,
  getVariantInitialCost,
  getVariantWithHighestDiscount,
} from "../discount";

vi.mock("../../config", () => import("./__mocks__/config"));

const createRecurringVariant = (
  id: string,
  cost: number,
  interval: RecurringInterval,
) => ({
  id,
  type: BillingType.FLAT,
  cost,
  custom: false as const,
  currency: "usd",
  hidden: false,
  model: BillingModel.RECURRING,
  interval,
});

const createAmountDiscount = (
  code: string,
  off: number,
  appliesTo: string[],
) => ({
  code,
  type: BillingDiscountType.AMOUNT,
  off,
  appliesTo,
});

const createPercentDiscount = (
  code: string,
  off: number,
  appliesTo: string[],
) => ({
  code,
  type: BillingDiscountType.PERCENT,
  off,
  appliesTo,
});

describe("getVariantInitialCost", () => {
  it("returns 0 when variant is undefined", () => {
    expect(getVariantInitialCost()).toBe(0);
  });

  it("returns flat cost for cost-based variants", () => {
    const variant = createRecurringVariant(
      "flat",
      1250,
      RecurringInterval.MONTH,
    );
    expect(getVariantInitialCost(variant)).toBe(1250);
  });

  it("returns first tier cost for tier-based variants", () => {
    const variant = {
      id: "tiered",
      type: BillingType.METERED,
      unit: "request",
      meterId: "meter-tiered",
      custom: false as const,
      currency: "usd",
      hidden: false,
      model: BillingModel.RECURRING,
      interval: RecurringInterval.MONTH,
      tiers: [
        { cost: 300, upTo: 100 },
        { cost: 250, upTo: "infinite" as const },
      ],
    };

    expect(getVariantInitialCost(variant)).toBe(300);
  });

  it("returns 0 for empty tier lists", () => {
    const variant = {
      id: "tiered-empty",
      type: BillingType.METERED,
      unit: "request",
      meterId: "meter-tiered-empty",
      custom: false as const,
      currency: "usd",
      hidden: false,
      model: BillingModel.RECURRING,
      interval: RecurringInterval.MONTH,
      tiers: [],
    };

    expect(getVariantInitialCost(variant)).toBe(0);
  });
});

describe("calculateDiscount", () => {
  it("returns null for custom variants", () => {
    const variant = {
      id: "business-monthly",
      type: BillingType.FLAT,
      custom: true as const,
      label: "Contact",
      href: "/contact",
      hidden: false,
      currency: "usd",
      model: BillingModel.RECURRING,
      interval: RecurringInterval.MONTH,
    };

    const result = calculateDiscount(
      variant,
      createPercentDiscount("P50", 50, [variant.id]),
    );

    expect(result).toBeNull();
  });

  it("calculates amount discount for flat variants", () => {
    const variant = createRecurringVariant(
      "pro-monthly",
      10000,
      RecurringInterval.MONTH,
    );
    const result = calculateDiscount(
      variant,
      createAmountDiscount("A2000", 2000, [variant.id]),
    );

    expect(getVariantInitialCost(result?.original)).toBe(10000);
    expect(getVariantInitialCost(result?.discounted)).toBe(8000);
    expect(result?.percentage).toBe(20);
    expect(result?.type).toBe(BillingDiscountType.AMOUNT);
  });

  it("calculates percent discount for flat variants", () => {
    const variant = createRecurringVariant(
      "pro-yearly",
      20000,
      RecurringInterval.YEAR,
    );
    const result = calculateDiscount(
      variant,
      createPercentDiscount("P25", 25, [variant.id]),
    );

    expect(getVariantInitialCost(result?.original)).toBe(20000);
    expect(getVariantInitialCost(result?.discounted)).toBe(15000);
    expect(result?.percentage).toBe(25);
    expect(result?.type).toBe(BillingDiscountType.PERCENT);
  });

  it("applies amount discount to all tiers and computes percentage from first tier", () => {
    const variant = {
      id: "metered-monthly",
      type: BillingType.METERED,
      unit: "request",
      meterId: "meter-monthly",
      custom: false as const,
      currency: "usd",
      hidden: false,
      model: BillingModel.RECURRING,
      interval: RecurringInterval.MONTH,
      tiers: [
        { cost: 1000, upTo: 100 },
        { cost: 800, upTo: "infinite" as const },
      ],
    };
    const result = calculateDiscount(
      variant,
      createAmountDiscount("A100", 100, [variant.id]),
    );

    if (!result || !("tiers" in result.discounted)) {
      throw new Error("Expected discounted tiered variant");
    }
    expect(result.discounted.tiers?.[0]?.cost).toBe(900);
    expect(result.discounted.tiers?.[1]?.cost).toBe(700);
    expect(result?.percentage).toBe(10);
  });

  it("applies percent discount to all tiers", () => {
    const variant = {
      id: "metered-yearly",
      type: BillingType.METERED,
      unit: "request",
      meterId: "meter-yearly",
      custom: false as const,
      currency: "usd",
      hidden: false,
      model: BillingModel.RECURRING,
      interval: RecurringInterval.YEAR,
      tiers: [
        { cost: 1000, upTo: 100 },
        { cost: 800, upTo: "infinite" as const },
      ],
    };
    const result = calculateDiscount(
      variant,
      createPercentDiscount("P10", 10, [variant.id]),
    );

    if (!result || !("tiers" in result.discounted)) {
      throw new Error("Expected discounted tiered variant");
    }
    expect(result.discounted.tiers?.[0]?.cost).toBe(900);
    expect(result.discounted.tiers?.[1]?.cost).toBe(720);
  });

  it("handles edge values (discount larger than cost and zero cost)", () => {
    const variant = createRecurringVariant("low", 100, RecurringInterval.MONTH);
    const largeAmount = calculateDiscount(
      variant,
      createAmountDiscount("A500", 500, [variant.id]),
    );
    const zeroCostVariant = createRecurringVariant(
      "zero",
      0,
      RecurringInterval.MONTH,
    );
    const zeroCost = calculateDiscount(
      zeroCostVariant,
      createAmountDiscount("A10", 10, [zeroCostVariant.id]),
    );

    expect(largeAmount?.discounted.cost).toBe(-400);
    expect(largeAmount?.percentage).toBe(500);
    expect(zeroCost?.discounted.cost).toBe(-10);
    expect(zeroCost?.percentage).toBe(Infinity);
  });
});

describe("getVariantDiscount", () => {
  it("returns undefined when no discount applies", () => {
    const variant = createRecurringVariant("x", 1000, RecurringInterval.MONTH);
    const result = getVariantDiscount(variant, [
      createPercentDiscount("P10", 10, ["other"]),
    ]);

    expect(result).toBeUndefined();
  });

  it("returns discount with largest absolute savings for mixed discount types", () => {
    const variant = createRecurringVariant("x", 10000, RecurringInterval.MONTH);
    const result = getVariantDiscount(variant, [
      createPercentDiscount("P10", 10, [variant.id]),
      createAmountDiscount("A1500", 1500, [variant.id]),
      createPercentDiscount("P20", 20, [variant.id]),
    ]);

    expect(result?.code).toBe("P20");
  });

  it("uses config discounts by default", () => {
    const variant = createRecurringVariant(
      "pro-monthly",
      1900,
      RecurringInterval.MONTH,
    );
    const result = getVariantDiscount(variant);

    expect(result?.code).toBe("100OFF");
  });
});

describe("getVariantWithHighestDiscount", () => {
  it("returns null when there are no discounted variants", () => {
    const result = getVariantWithHighestDiscount(undefined, [
      createPercentDiscount("P50", 50, ["unknown-variant"]),
    ]);
    expect(result).toBeNull();
  });

  it("returns variant/discount pair with highest absolute savings", () => {
    const result = getVariantWithHighestDiscount(undefined, [
      createPercentDiscount("P50", 50, ["pro-monthly"]),
      createPercentDiscount("P10", 10, ["pro-yearly"]),
    ]);

    expect(result?.id).toBe("pro-yearly");
    expect(result?.discount?.code).toBe("P10");
  });

  it("uses config defaults and includes chosen discount", () => {
    const result = getVariantWithHighestDiscount();
    expect(result).not.toBeNull();
    expect(result?.discount).toBeDefined();
  });
});

describe("calculateRecurringDiscount", () => {
  it("returns null for non-recurring, custom, hidden, and unknown variants", () => {
    const nonRecurring = {
      id: "one-time",
      type: BillingType.FLAT,
      cost: 1000,
      custom: false as const,
      currency: "usd",
      hidden: false,
      model: BillingModel.ONE_TIME,
    };
    const customRecurring = {
      id: "custom-recurring",
      type: BillingType.FLAT,
      custom: true as const,
      label: "Contact",
      href: "/contact",
      hidden: false,
      currency: "usd",
      model: BillingModel.RECURRING,
      interval: RecurringInterval.MONTH,
    };
    const hiddenRecurring = {
      ...createRecurringVariant("hidden", 1000, RecurringInterval.MONTH),
      hidden: true,
    };
    const unknownRecurring = createRecurringVariant(
      "unknown",
      1000,
      RecurringInterval.MONTH,
    );

    expect(calculateRecurringDiscount(nonRecurring)).toBeNull();
    expect(calculateRecurringDiscount(customRecurring)).toBeNull();
    expect(calculateRecurringDiscount(hiddenRecurring)).toBeNull();
    expect(calculateRecurringDiscount(unknownRecurring)).toBeNull();
  });

  it("returns null for highest effective-cost variant within plan", () => {
    const highestInPro = createRecurringVariant(
      "pro-monthly",
      1900,
      RecurringInterval.MONTH,
    );

    expect(calculateRecurringDiscount(highestInPro)).toBeNull();
  });

  it("compares monthly and yearly costs after interval normalization", () => {
    const target = createRecurringVariant(
      "pro-yearly",
      19000,
      RecurringInterval.YEAR,
    );
    const result = calculateRecurringDiscount(target);

    expect(result).not.toBeNull();
    expect(result?.original.id).toBe("pro-monthly");
    expect(result?.original.interval).toBe(RecurringInterval.YEAR);
    expect(result?.original.cost).toBe(10800);
    expect(result?.discounted.id).toBe("pro-yearly");
    expect(result?.type).toBe(BillingDiscountType.PERCENT);
    expect(result?.percentage).toBe(12);
  });

  it("considers default discounts when comparing recurring variants", () => {
    const result = calculateRecurringDiscount(
      createRecurringVariant("pro-yearly", 19000, RecurringInterval.YEAR),
    );

    expect(result?.original.cost).toBe(10800);
    expect(getVariantInitialCost(result?.discounted)).toBe(19000);
  });

  it("skips recurring interval discounts for metered variants", () => {
    const meteredMonthly = {
      id: "pro-metered-monthly",
      type: BillingType.METERED,
      unit: "credit",
      meterId: "meter-credits-monthly",
      custom: false as const,
      currency: "usd",
      hidden: false,
      model: BillingModel.RECURRING,
      interval: RecurringInterval.MONTH,
      tiers: [
        { cost: 8, upTo: 25_000 },
        { cost: 6, upTo: 125_000 },
        { cost: 4, upTo: "infinite" as const },
      ],
    };

    expect(calculateRecurringDiscount(meteredMonthly)).toBeNull();
  });
});
