import { describe, expect, it } from "vitest";

import { marketState, HOLIDAYS } from "./market-sessions";

/**
 * Helper: create a Date at a specific local time in a given timezone.
 */
function dateInTZ(
  tz: string,
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): Date {
  const guess = new Date(Date.UTC(year, month - 1, day, hour, minute));
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(guess);

  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const localHour = parseInt(get("hour"), 10);
  const localMinute = parseInt(get("minute"), 10);
  const localDay = parseInt(get("day"), 10);

  const diffMinutes =
    (localHour * 60 + localMinute - (hour * 60 + minute)) % 1440;
  const dayDiff = localDay - day;
  const totalDiff = diffMinutes + dayDiff * 1440;

  return new Date(guess.getTime() - totalDiff * 60 * 1000);
}

// ─── Holiday closure tests ─────────────────────────────────────────────────

describe("NYSE holidays", () => {
  const tz = "America/New_York";

  it.each([
    ["2026-01-01", "New Year's Day"],
    ["2026-01-19", "MLK Day"],
    ["2026-04-03", "Good Friday"],
    ["2026-07-03", "Independence Day observed"],
    ["2026-11-26", "Thanksgiving"],
    ["2026-12-25", "Christmas"],
    ["2027-01-01", "New Year's Day 2027"],
    ["2027-03-26", "Good Friday 2027"],
    ["2027-07-05", "Independence Day 2027 observed"],
  ])("closed on %s (%s)", (dateStr, _label) => {
    const [y, m, d] = dateStr.split("-").map(Number) as [
      number,
      number,
      number,
    ];
    const dt = dateInTZ(tz, y, m, d, 10, 30);
    expect(marketState("NYSE", dt).state).toBe("closed");
  });

  // Early-close days are NOT in HOLIDAYS — market is open in the morning
  it.each([
    ["2026-11-27", "Day after Thanksgiving (early close 1pm ET)"],
    ["2026-12-24", "Christmas Eve (early close 1pm ET)"],
  ])("open on %s (%s) — early close, not full closure", (dateStr, _label) => {
    const [y, m, d] = dateStr.split("-").map(Number) as [
      number,
      number,
      number,
    ];
    // 10:30 AM ET — market is open on early-close days
    const dt = dateInTZ(tz, y, m, d, 10, 30);
    expect(marketState("NYSE", dt).state).toBe("open");
  });
});

describe("HKEX holidays", () => {
  const tz = "Asia/Hong_Kong";

  it.each([
    ["2026-01-01", "New Year's Day"],
    ["2026-02-17", "Lunar New Year Day 1"],
    ["2026-02-19", "Lunar New Year Day 3"],
    ["2026-04-03", "Good Friday"],
    ["2026-06-19", "Tuen Ng Festival"],
    ["2026-07-01", "HKSAR Establishment Day"],
    ["2026-10-01", "National Day"],
    ["2026-12-25", "Christmas Day"],
  ])("closed on %s (%s)", (dateStr, _label) => {
    const [y, m, d] = dateStr.split("-").map(Number) as [
      number,
      number,
      number,
    ];
    const dt = dateInTZ(tz, y, m, d, 10, 30);
    expect(marketState("HKEX", dt).state).toBe("closed");
  });
});

describe("SSE holidays", () => {
  const tz = "Asia/Shanghai";

  it.each([
    ["2026-01-01", "New Year"],
    ["2026-01-02", "New Year"],
    ["2026-02-16", "Spring Festival"],
    ["2026-02-19", "Spring Festival"],
    ["2026-04-06", "Qingming Festival"],
    ["2026-05-01", "Labour Day"],
    ["2026-06-19", "Dragon Boat Festival"],
    ["2026-09-25", "Mid-Autumn Festival"],
    ["2026-10-01", "National Day"],
    ["2026-10-07", "National Day"],
  ])("closed on %s (%s)", (dateStr, _label) => {
    const [y, m, d] = dateStr.split("-").map(Number) as [
      number,
      number,
      number,
    ];
    const dt = dateInTZ(tz, y, m, d, 10, 0);
    expect(marketState("SSE", dt).state).toBe("closed");
  });
});

describe("KRX holidays", () => {
  const tz = "Asia/Seoul";

  it.each([
    ["2026-01-01", "New Year's Day"],
    ["2026-02-17", "Seollal"],
    ["2026-03-02", "March 1st Movement Day substitute"],
    ["2026-05-05", "Children's Day"],
    ["2026-09-25", "Chuseok"],
    ["2026-10-09", "Hangeul Day"],
    ["2026-12-25", "Christmas Day"],
  ])("closed on %s (%s)", (dateStr, _label) => {
    const [y, m, d] = dateStr.split("-").map(Number) as [
      number,
      number,
      number,
    ];
    const dt = dateInTZ(tz, y, m, d, 10, 0);
    expect(marketState("KRX", dt).state).toBe("closed");
  });
});

// ─── Non-holiday open tests ────────────────────────────────────────────────

describe("regular trading days are NOT falsely closed", () => {
  it.each<["NYSE" | "HKEX" | "SSE" | "KRX", string, number, number, number]>([
    ["NYSE", "America/New_York", 2026, 1, 7],
    ["NYSE", "America/New_York", 2026, 3, 2],
    ["HKEX", "Asia/Hong_Kong", 2026, 1, 8],
    ["HKEX", "Asia/Hong_Kong", 2026, 3, 4],
    ["SSE", "Asia/Shanghai", 2026, 1, 8],
    ["SSE", "Asia/Shanghai", 2026, 3, 4],
    ["KRX", "Asia/Seoul", 2026, 1, 8],
    ["KRX", "Asia/Seoul", 2026, 3, 4],
    ["KRX", "Asia/Seoul", 2026, 5, 6],
    ["SSE", "Asia/Shanghai", 2026, 4, 8],
  ])("%s open on %d-%02d-%02d", (market, tz, y, m, d) => {
    const dt = dateInTZ(tz, y, m, d, 10, 30);
    const state = marketState(market, dt).state;
    expect(["open", "lunch", "pre"]).toContain(state);
  });
});

// ─── HOLIDAYS array sanity ─────────────────────────────────────────────────

describe("HOLIDAYS array sanity", () => {
  it("no market has an empty HOLIDAYS array", () => {
    for (const [_market, dates] of Object.entries(HOLIDAYS)) {
      expect(dates.length > 0).toBe(true);
    }
  });

  it("all dates are valid YYYY-MM-DD format", () => {
    const dateRe = /^\d{4}-\d{2}-\d{2}$/;
    for (const [_market, dates] of Object.entries(HOLIDAYS)) {
      for (const d of dates) {
        expect(d).toMatch(dateRe);
        const parsed = new Date(`${d}T00:00:00Z`);
        expect(isNaN(parsed.getTime())).toBe(false);
      }
    }
  });

  it("no duplicate dates per market", () => {
    for (const [_market, dates] of Object.entries(HOLIDAYS)) {
      const unique = new Set(dates);
      expect(unique.size).toBe(dates.length);
    }
  });
});
