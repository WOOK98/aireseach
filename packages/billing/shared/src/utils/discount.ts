import { config } from "../config";
import {
  BillingDiscountType,
  RecurringInterval,
  BillingModel,
  BillingType,
} from "../types";
import { findPlanByVariantId } from "./plan";

import type { BillingConfigDiscount, BillingConfigVariant } from "../config";

export const isFree = (variant?: BillingConfigVariant) => {
  if (!variant) {
    return false;
  }

  if ("cost" in variant) {
    return variant.cost === 0;
  }

  if ("tiers" in variant) {
    return variant.tiers.every((tier) => tier.cost === 0);
  }

  return false;
};

export const getVariantInitialCost = (variant?: BillingConfigVariant) => {
  if (!variant) {
    return 0;
  }

  if ("cost" in variant) {
    return variant.cost;
  }

  if ("tiers" in variant) {
    return variant.tiers[0]?.cost ?? 0;
  }

  return 0;
};

const isRecurringVariant = (
  variant: BillingConfigVariant,
): variant is Extract<
  BillingConfigVariant,
  { model: typeof BillingModel.RECURRING; custom: false }
> =>
  !variant.custom &&
  !variant.hidden &&
  variant.model === BillingModel.RECURRING;

export const getVariantWithHighestDiscount = (
  plans = config.plans,
  discounts = config.discounts,
) => {
  const variantsWithDiscounts = plans
    .flatMap((plan) => plan.variants)
    .map((variant) =>
      Object.assign({}, variant, {
        discounts: discounts.filter((d) => d.appliesTo.includes(variant.id)),
      }),
    )
    .filter((variant) => variant.discounts.length > 0);

  const [variantWithHighestDiscount] = variantsWithDiscounts.sort((a, b) => {
    const highestDiscountA = getVariantDiscount(a, discounts);
    const highestDiscountB = getVariantDiscount(b, discounts);

    const discountA = highestDiscountA
      ? calculateDiscount(a, highestDiscountA)
      : null;
    const discountB = highestDiscountB
      ? calculateDiscount(b, highestDiscountB)
      : null;

    return (
      (getVariantInitialCost(discountB?.original) ?? 0) -
      (getVariantInitialCost(discountA?.original) ?? 0)
    );
  });

  if (!variantWithHighestDiscount) {
    return null;
  }

  return {
    ...variantWithHighestDiscount,
    discount: getVariantDiscount(variantWithHighestDiscount, discounts),
  };
};

export const calculateDiscount = (
  variant: BillingConfigVariant,
  discount: BillingConfigDiscount,
) => {
  if (variant.custom) {
    return null;
  }

  const cost = getVariantInitialCost(variant);

  if (discount.type === BillingDiscountType.AMOUNT) {
    return {
      original: variant,
      discounted: {
        ...variant,
        cost: cost - discount.off,
        ...("tiers" in variant
          ? {
              tiers: variant.tiers.map((tier) => ({
                ...tier,
                cost: tier.cost - discount.off,
              })),
            }
          : {}),
      },
      percentage: Math.floor((discount.off / cost) * 100),
      type: BillingDiscountType.AMOUNT,
    } as const;
  }

  return {
    original: variant,
    discounted: {
      ...variant,
      cost: cost - (cost * discount.off) / 100,
      ...("tiers" in variant
        ? {
            tiers: variant.tiers.map((tier) => ({
              ...tier,
              cost: tier.cost - (tier.cost * discount.off) / 100,
            })),
          }
        : {}),
    },
    percentage: discount.off,
    type: BillingDiscountType.PERCENT,
  } as const;
};

export const calculateRecurringDiscount = (variant: BillingConfigVariant) => {
  if (!isRecurringVariant(variant) || variant.type === BillingType.METERED) {
    return null;
  }

  const { plan } = findPlanByVariantId(variant.id);

  if (!plan) {
    return null;
  }

  const recurringVariants = plan.variants
    .filter(isRecurringVariant)
    .filter((v) => v.type === variant.type);

  if (!recurringVariants.length) {
    return null;
  }

  const targetInterval = variant.interval;

  const highestVariant = recurringVariants.reduce((highest, current) => {
    const highestCost = normalizeToIntervalCost(highest, targetInterval);
    const currentCost = normalizeToIntervalCost(current, targetInterval);
    return currentCost > highestCost ? current : highest;
  }, recurringVariants[0]!);

  if (highestVariant.id === variant.id) {
    return null;
  }

  const highestCost = normalizeToIntervalCost(highestVariant, targetInterval);
  const currentCost = normalizeToIntervalCost(variant, targetInterval);

  const difference = highestCost - currentCost;

  if (difference <= 0) {
    return null;
  }

  return {
    original: {
      ...highestVariant,
      cost: Math.round(highestCost),
      interval: targetInterval,
    },
    discounted: variant,
    percentage: Math.floor((difference / highestCost) * 100),
    type: BillingDiscountType.PERCENT,
  } as const;
};

export const getVariantDiscount = (
  variant: BillingConfigVariant,
  discounts = config.discounts,
) => {
  const discountsForVariant = discounts.filter((d) =>
    d.appliesTo.includes(variant.id),
  );

  const [highestDiscount] = discountsForVariant.sort((a, b) => {
    const discountA = calculateDiscount(variant, a);
    const discountB = calculateDiscount(variant, b);

    const amountA =
      (getVariantInitialCost(discountA?.original) ?? 0) -
      (getVariantInitialCost(discountA?.discounted) ?? 0);
    const amountB =
      (getVariantInitialCost(discountB?.original) ?? 0) -
      (getVariantInitialCost(discountB?.discounted) ?? 0);

    return amountB - amountA;
  });

  return highestDiscount;
};

const getEffectiveCost = (
  variant: Extract<
    BillingConfigVariant,
    { model: typeof BillingModel.RECURRING; custom: false }
  >,
  discounts = config.discounts,
): number => {
  const discount = getVariantDiscount(variant, discounts);
  if (discount) {
    const discountResult = calculateDiscount(variant, discount);
    return discountResult?.discounted.cost ?? getVariantInitialCost(variant);
  }
  return getVariantInitialCost(variant);
};

const MONTHS_PER_YEAR = 12;
const WEEKS_PER_YEAR = 52;
const WEEKS_PER_MONTH = 4;
const DAYS_PER_YEAR = 365;
const DAYS_PER_MONTH = 30;
const DAYS_PER_WEEK = 7;

const normalizeToIntervalCost = (
  variant: Extract<
    BillingConfigVariant,
    { model: typeof BillingModel.RECURRING; custom: false }
  >,
  targetInterval: RecurringInterval,
  discounts = config.discounts,
): number => {
  const cost = getEffectiveCost(variant, discounts);
  const sourceInterval = variant.interval;

  if (sourceInterval === targetInterval) {
    return cost;
  }

  switch (sourceInterval) {
    case RecurringInterval.DAY:
      switch (targetInterval) {
        case RecurringInterval.WEEK:
          return cost * DAYS_PER_WEEK;
        case RecurringInterval.MONTH:
          return cost * DAYS_PER_MONTH;
        case RecurringInterval.YEAR:
          return cost * DAYS_PER_YEAR;
        default:
          return cost;
      }
    case RecurringInterval.WEEK:
      switch (targetInterval) {
        case RecurringInterval.DAY:
          return cost / DAYS_PER_WEEK;
        case RecurringInterval.MONTH:
          return cost * WEEKS_PER_MONTH;
        case RecurringInterval.YEAR:
          return cost * WEEKS_PER_YEAR;
        default:
          return cost;
      }
    case RecurringInterval.MONTH:
      switch (targetInterval) {
        case RecurringInterval.DAY:
          return cost / DAYS_PER_MONTH;
        case RecurringInterval.WEEK:
          return cost / WEEKS_PER_MONTH;
        case RecurringInterval.YEAR:
          return cost * MONTHS_PER_YEAR;
        default:
          return cost;
      }
    case RecurringInterval.YEAR:
      switch (targetInterval) {
        case RecurringInterval.DAY:
          return cost / DAYS_PER_YEAR;
        case RecurringInterval.WEEK:
          return cost / WEEKS_PER_YEAR;
        case RecurringInterval.MONTH:
          return cost / MONTHS_PER_YEAR;
        default:
          return cost;
      }
    default:
      return cost;
  }
};
