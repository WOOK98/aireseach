import dayjs from "dayjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SubscriptionStatus } from "../../types";
import { getBillingPeriod } from "../subscription";

describe("getBillingPeriod", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(Date.UTC(2025, 0, 15, 12, 0, 0)));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("active subscription", () => {
    it("should calculate billing period for active subscription", () => {
      const now = dayjs();
      const startsAt = now.subtract(5, "days").toDate();
      const endsAt = now.add(25, "days").toDate();

      const subscription = {
        status: SubscriptionStatus.ACTIVE,
        periodStartsAt: startsAt,
        periodEndsAt: endsAt,
        trialStartsAt: null,
        trialEndsAt: null,
      };

      const result = getBillingPeriod(subscription);

      expect(result.startsAt).toEqual(startsAt);
      expect(result.endsAt).toEqual(endsAt);
      expect(result.trial).toBe(false);
      expect(result.progress).toBeGreaterThan(0);
      expect(result.progress).toBeLessThan(100);
      expect(result.daysRemaining).toBeGreaterThan(0);
      expect(result.daysRemaining).toBeLessThanOrEqual(25);
    });

    it("should calculate progress correctly for subscription at start", () => {
      const now = dayjs();
      const startsAt = now.toDate();
      const endsAt = now.add(30, "days").toDate();

      const subscription = {
        status: SubscriptionStatus.ACTIVE,
        periodStartsAt: startsAt,
        periodEndsAt: endsAt,
        trialStartsAt: null,
        trialEndsAt: null,
      };

      const result = getBillingPeriod(subscription);

      expect(result.progress).toBe(0);
      expect(result.daysRemaining).toBe(30);
    });

    it("should calculate progress correctly for subscription at midpoint", () => {
      const now = dayjs();
      const startsAt = now.subtract(15, "days").toDate();
      const endsAt = now.add(15, "days").toDate();

      const subscription = {
        status: SubscriptionStatus.ACTIVE,
        periodStartsAt: startsAt,
        periodEndsAt: endsAt,
        trialStartsAt: null,
        trialEndsAt: null,
      };

      const result = getBillingPeriod(subscription);

      expect(result.progress).toBeGreaterThan(40);
      expect(result.progress).toBeLessThan(60);
      expect(result.daysRemaining).toBe(15);
    });

    it("should calculate progress correctly for subscription near end", () => {
      const now = dayjs();
      const startsAt = now.subtract(27, "days").toDate();
      const endsAt = now.add(3, "days").toDate();

      const subscription = {
        status: SubscriptionStatus.ACTIVE,
        periodStartsAt: startsAt,
        periodEndsAt: endsAt,
        trialStartsAt: null,
        trialEndsAt: null,
      };

      const result = getBillingPeriod(subscription);

      expect(result.progress).toBeGreaterThan(85);
      expect(result.progress).toBeLessThan(100);
      expect(result.daysRemaining).toBe(3);
    });
  });

  describe("trialing subscription", () => {
    it("should use trial dates for trialing subscription", () => {
      const now = dayjs();
      const trialStartsAt = now.subtract(2, "days").toDate();
      const trialEndsAt = now.add(5, "days").toDate();
      const periodStartsAt = now.add(5, "days").toDate();
      const periodEndsAt = now.add(35, "days").toDate();

      const subscription = {
        status: SubscriptionStatus.TRIALING,
        periodStartsAt,
        periodEndsAt,
        trialStartsAt,
        trialEndsAt,
      };

      const result = getBillingPeriod(subscription);

      expect(result.startsAt).toEqual(trialStartsAt);
      expect(result.endsAt).toEqual(trialEndsAt);
      expect(result.trial).toBe(true);
      expect(result.daysRemaining).toBe(5);
    });

    it("should calculate trial progress correctly", () => {
      const now = dayjs();
      const trialStartsAt = now.subtract(3, "days").toDate();
      const trialEndsAt = now.add(4, "days").toDate();

      const subscription = {
        status: SubscriptionStatus.TRIALING,
        periodStartsAt: now.add(4, "days").toDate(),
        periodEndsAt: now.add(34, "days").toDate(),
        trialStartsAt,
        trialEndsAt,
      };

      const result = getBillingPeriod(subscription);

      expect(result.trial).toBe(true);
      expect(result.progress).toBeGreaterThan(0);
      expect(result.progress).toBeLessThan(100);
      expect(result.daysRemaining).toBe(4);
    });

    it("should handle trial at start", () => {
      const now = dayjs();
      const trialStartsAt = now.toDate();
      const trialEndsAt = now.add(7, "days").toDate();

      const subscription = {
        status: SubscriptionStatus.TRIALING,
        periodStartsAt: now.add(7, "days").toDate(),
        periodEndsAt: now.add(37, "days").toDate(),
        trialStartsAt,
        trialEndsAt,
      };

      const result = getBillingPeriod(subscription);

      expect(result.progress).toBe(0);
      expect(result.daysRemaining).toBe(7);
    });

    it("should handle trial near end", () => {
      const now = dayjs();
      const trialStartsAt = now.subtract(6, "days").toDate();
      const trialEndsAt = now.add(1, "day").toDate();

      const subscription = {
        status: SubscriptionStatus.TRIALING,
        periodStartsAt: now.add(1, "day").toDate(),
        periodEndsAt: now.add(31, "days").toDate(),
        trialStartsAt,
        trialEndsAt,
      };

      const result = getBillingPeriod(subscription);

      expect(result.progress).toBeGreaterThan(80);
      expect(result.daysRemaining).toBe(1);
    });
  });

  describe("other subscription statuses", () => {
    it.each([[SubscriptionStatus.CANCELED], [SubscriptionStatus.PAST_DUE]])(
      "should use period dates for %s subscription",
      (status) => {
        const now = dayjs();
        const startsAt = now.subtract(10, "days").toDate();
        const endsAt = now.add(20, "days").toDate();

        const subscription = {
          status,
          periodStartsAt: startsAt,
          periodEndsAt: endsAt,
          trialStartsAt: null,
          trialEndsAt: null,
        };

        const result = getBillingPeriod(subscription);

        expect(result.startsAt).toEqual(startsAt);
        expect(result.endsAt).toEqual(endsAt);
        expect(result.trial).toBe(false);
      },
    );
  });

  describe("edge cases", () => {
    it("should handle expired subscription (endsAt in past)", () => {
      const now = dayjs();
      const startsAt = now.subtract(30, "days").toDate();
      const endsAt = now.subtract(1, "day").toDate();

      const subscription = {
        status: SubscriptionStatus.ACTIVE,
        periodStartsAt: startsAt,
        periodEndsAt: endsAt,
        trialStartsAt: null,
        trialEndsAt: null,
      };

      const result = getBillingPeriod(subscription);

      expect(result.progress).toBe(100);
      expect(result.daysRemaining).toBe(0);
    });

    it("should handle subscription ending today", () => {
      const now = dayjs();
      const startsAt = now.subtract(30, "days").toDate();
      const endsAt = now.toDate();

      const subscription = {
        status: SubscriptionStatus.ACTIVE,
        periodStartsAt: startsAt,
        periodEndsAt: endsAt,
        trialStartsAt: null,
        trialEndsAt: null,
      };

      const result = getBillingPeriod(subscription);

      expect(result.progress).toBeGreaterThan(95);
      expect(result.daysRemaining).toBe(0);
    });

    it("should handle very short period (1 day)", () => {
      const now = dayjs();
      const startsAt = now.subtract(12, "hours").toDate();
      const endsAt = now.add(12, "hours").toDate();

      const subscription = {
        status: SubscriptionStatus.ACTIVE,
        periodStartsAt: startsAt,
        periodEndsAt: endsAt,
        trialStartsAt: null,
        trialEndsAt: null,
      };

      const result = getBillingPeriod(subscription);

      expect(result.progress).toBeGreaterThan(0);
      expect(result.progress).toBeLessThan(100);
      expect(result.daysRemaining).toBe(0); // Less than a day rounds to 0
    });

    it("should handle very long period (1 year)", () => {
      const now = dayjs();
      const startsAt = now.subtract(6, "months").toDate();
      const endsAt = now.add(6, "months").toDate();

      const subscription = {
        status: SubscriptionStatus.ACTIVE,
        periodStartsAt: startsAt,
        periodEndsAt: endsAt,
        trialStartsAt: null,
        trialEndsAt: null,
      };

      const result = getBillingPeriod(subscription);

      expect(result.progress).toBeGreaterThan(40);
      expect(result.progress).toBeLessThan(60);
      expect(result.daysRemaining).toBeGreaterThan(150);
      expect(result.daysRemaining).toBeLessThan(200);
    });

    it("should handle null trial dates for non-trialing subscription", () => {
      const now = dayjs();
      const startsAt = now.subtract(5, "days").toDate();
      const endsAt = now.add(25, "days").toDate();

      const subscription = {
        status: SubscriptionStatus.ACTIVE,
        periodStartsAt: startsAt,
        periodEndsAt: endsAt,
        trialStartsAt: null,
        trialEndsAt: null,
      };

      const result = getBillingPeriod(subscription);

      expect(result.startsAt).toEqual(startsAt);
      expect(result.endsAt).toEqual(endsAt);
      expect(result.trial).toBe(false);
    });

    it("should handle undefined trial dates", () => {
      const now = dayjs();
      const startsAt = now.subtract(5, "days").toDate();
      const endsAt = now.add(25, "days").toDate();

      const subscription = {
        status: SubscriptionStatus.ACTIVE,
        periodStartsAt: startsAt,
        periodEndsAt: endsAt,
        trialStartsAt: undefined,
        trialEndsAt: undefined,
      };

      const result = getBillingPeriod(subscription);

      expect(result.startsAt).toEqual(startsAt);
      expect(result.endsAt).toEqual(endsAt);
      expect(result.trial).toBe(false);
    });
  });

  describe("progress calculation", () => {
    it("should round progress to integer", () => {
      const now = dayjs();
      const startsAt = now.subtract(10, "days").toDate();
      const endsAt = now.add(10, "days").toDate();

      const subscription = {
        status: SubscriptionStatus.ACTIVE,
        periodStartsAt: startsAt,
        periodEndsAt: endsAt,
        trialStartsAt: null,
        trialEndsAt: null,
      };

      const result = getBillingPeriod(subscription);

      expect(Number.isInteger(result.progress)).toBe(true);
      expect(result.progress).toBeGreaterThanOrEqual(0);
      expect(result.progress).toBeLessThanOrEqual(100);
    });

    it("should never have negative progress", () => {
      const now = dayjs();
      const startsAt = now.add(1, "day").toDate(); // Future start
      const endsAt = now.add(31, "days").toDate();

      const subscription = {
        status: SubscriptionStatus.ACTIVE,
        periodStartsAt: startsAt,
        periodEndsAt: endsAt,
        trialStartsAt: null,
        trialEndsAt: null,
      };

      const result = getBillingPeriod(subscription);

      expect(result.progress).toBeGreaterThanOrEqual(0);
    });
  });

  describe("daysRemaining calculation", () => {
    it("should never have negative days remaining", () => {
      const now = dayjs();
      const startsAt = now.subtract(30, "days").toDate();
      const endsAt = now.subtract(5, "days").toDate(); // Already expired

      const subscription = {
        status: SubscriptionStatus.ACTIVE,
        periodStartsAt: startsAt,
        periodEndsAt: endsAt,
        trialStartsAt: null,
        trialEndsAt: null,
      };

      const result = getBillingPeriod(subscription);

      expect(result.daysRemaining).toBe(0);
    });

    it("should calculate days remaining correctly", () => {
      const now = dayjs();
      const startsAt = now.subtract(5, "days").toDate();
      const endsAt = now.add(25, "days").toDate();

      const subscription = {
        status: SubscriptionStatus.ACTIVE,
        periodStartsAt: startsAt,
        periodEndsAt: endsAt,
        trialStartsAt: null,
        trialEndsAt: null,
      };

      const result = getBillingPeriod(subscription);

      expect(result.daysRemaining).toBeGreaterThanOrEqual(24);
      expect(result.daysRemaining).toBeLessThanOrEqual(25);
    });
  });
});
