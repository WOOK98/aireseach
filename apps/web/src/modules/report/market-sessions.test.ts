import { describe, expect, it } from "vitest";

import {
  derivePageState,
  getDayOfWeek,
  getHkStatus,
  getKrxStatus,
  getNyseStatus,
} from "./market-sessions";

// Helper: build a Date at a specific UTC instant using ISO string.
// Convention: ALL fixtures MUST use ISO strings (no numeric month params).
// Every fixture MUST include a weekday guard: expect(d.getUTCDay()).toBe(N).
// getUTCDay(): 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat.
function utc(iso: string): Date {
  return new Date(iso + "Z");
}

describe("getDayOfWeek", () => {
  it("returns correct weekday in ET", () => {
    const d = utc("2026-07-10T14:00");
    expect(d.getUTCDay()).toBe(5); // Friday
    expect(getDayOfWeek("America/New_York", d)).toBe(5);
  });

  it("returns Saturday in HK when it's Friday evening ET", () => {
    const d = utc("2026-07-11T02:00");
    expect(d.getUTCDay()).toBe(6); // Saturday UTC
    expect(getDayOfWeek("Asia/Hong_Kong", d)).toBe(6); // Saturday HKT
  });

  it("handles Sunday correctly", () => {
    const d = utc("2026-07-12T14:00");
    expect(d.getUTCDay()).toBe(0); // Sunday
    expect(getDayOfWeek("America/New_York", d)).toBe(0);
  });
});

describe("getNyseStatus", () => {
  it("returns 'open' during regular hours (10:30 ET = 14:30 UTC in EDT)", () => {
    const d = utc("2026-07-10T14:30");
    expect(d.getUTCDay()).toBe(5); // Friday
    expect(getNyseStatus(d).phase).toBe("open");
  });

  it("returns 'pre' during pre-market (07:00 ET = 11:00 UTC in EDT)", () => {
    const d = utc("2026-07-10T11:00");
    expect(d.getUTCDay()).toBe(5); // Friday
    expect(getNyseStatus(d).phase).toBe("pre");
  });

  it("returns 'closed' after hours (21:00 ET = 01:00 UTC next day in EDT)", () => {
    const d = utc("2026-07-11T01:00");
    expect(d.getUTCDay()).toBe(6); // Saturday UTC, but ET = Friday 21:00
    expect(getNyseStatus(d).phase).toBe("closed");
  });

  it("returns 'closed' on Saturday", () => {
    const d = utc("2026-07-11T14:00");
    expect(d.getUTCDay()).toBe(6); // Saturday
    expect(getNyseStatus(d).phase).toBe("closed");
  });

  it("returns 'closed' on Sunday", () => {
    const d = utc("2026-07-12T14:00");
    expect(d.getUTCDay()).toBe(0); // Sunday
    expect(getNyseStatus(d).phase).toBe("closed");
  });

  // Winter time (EST, UTC-5): 10:30 ET = 15:30 UTC
  it("handles EST (winter) correctly — open at 15:30 UTC", () => {
    const d = utc("2026-01-12T15:30");
    expect(d.getUTCDay()).toBe(1); // Monday
    expect(getNyseStatus(d).phase).toBe("open");
  });

  // DST boundary: EDT starts 2nd Sunday of March 2026.
  it("handles DST switch day correctly", () => {
    const d = utc("2026-03-09T14:30");
    expect(d.getUTCDay()).toBe(1); // Monday after DST switch
    expect(getNyseStatus(d).phase).toBe("open");
  });
});

describe("getHkStatus", () => {
  it("returns 'open' during morning session (10:00 HKT = 02:00 UTC)", () => {
    const d = utc("2026-07-10T02:00");
    expect(d.getUTCDay()).toBe(5); // Friday
    expect(getHkStatus(d).phase).toBe("open");
  });

  it("returns 'closed' during lunch break (12:30 HKT = 04:30 UTC)", () => {
    const d = utc("2026-07-10T04:30");
    expect(d.getUTCDay()).toBe(5); // Friday
    expect(getHkStatus(d).phase).toBe("closed");
  });

  it("returns 'open' during afternoon session (14:00 HKT = 06:00 UTC)", () => {
    const d = utc("2026-07-10T06:00");
    expect(d.getUTCDay()).toBe(5); // Friday
    expect(getHkStatus(d).phase).toBe("open");
  });

  it("returns 'closed' on Saturday even during market hours", () => {
    const d = utc("2026-07-11T02:00");
    expect(d.getUTCDay()).toBe(6); // Saturday
    expect(getHkStatus(d).phase).toBe("closed");
  });
});

describe("getKrxStatus", () => {
  it("returns 'open' during morning session (10:00 KST = 01:00 UTC)", () => {
    const d = utc("2026-07-10T01:00");
    expect(d.getUTCDay()).toBe(5); // Friday
    expect(getKrxStatus(d).phase).toBe("open");
  });

  it("returns 'closed' during lunch break (12:00 KST = 03:00 UTC)", () => {
    const d = utc("2026-07-10T03:00");
    expect(d.getUTCDay()).toBe(5); // Friday
    expect(getKrxStatus(d).phase).toBe("closed");
  });

  it("returns 'closed' on Sunday", () => {
    const d = utc("2026-07-12T01:00");
    expect(d.getUTCDay()).toBe(0); // Sunday
    expect(getKrxStatus(d).phase).toBe("closed");
  });
});

describe("derivePageState", () => {
  it("returns 'us' when NYSE is open (Friday 10:30 ET)", () => {
    const d = utc("2026-07-10T14:30");
    expect(d.getUTCDay()).toBe(5); // Friday
    expect(derivePageState(d)).toBe("us");
  });

  it("returns 'pre' during NYSE pre-market (Friday 07:00 ET)", () => {
    const d = utc("2026-07-10T11:00");
    expect(d.getUTCDay()).toBe(5); // Friday
    expect(derivePageState(d)).toBe("pre");
  });

  it("returns 'weekend' when Friday evening ET crosses into HK Saturday", () => {
    // Friday 21:30 ET = Saturday 09:30 HKT → HK weekend
    const d = utc("2026-07-11T01:30");
    expect(d.getUTCDay()).toBe(6); // Saturday UTC (ET = Friday 21:30)
    expect(derivePageState(d)).toBe("weekend");
  });

  it("returns 'weekend' on Saturday ET", () => {
    const d = utc("2026-07-11T14:00");
    expect(d.getUTCDay()).toBe(6); // Saturday
    expect(derivePageState(d)).toBe("weekend");
  });

  it("returns 'weekend' on Sunday ET", () => {
    const d = utc("2026-07-12T14:00");
    expect(d.getUTCDay()).toBe(0); // Sunday
    expect(derivePageState(d)).toBe("weekend");
  });

  it("returns 'asia' on Monday evening ET when HK is Tuesday morning (open)", () => {
    // Monday 21:30 ET = Tuesday 09:30 HKT → HK is open
    const d = utc("2026-07-14T01:30");
    expect(d.getUTCDay()).toBe(2); // Tuesday UTC (ET = Monday 21:30)
    expect(derivePageState(d)).toBe("asia");
  });

  it("reverse test: Friday 18:30 PDT (21:30 ET) should be weekend if HK is Saturday", () => {
    // 2026-07-11 01:30 UTC = ET Friday 21:30 = HK Saturday 09:30
    const d = utc("2026-07-11T01:30");
    expect(d.getUTCDay()).toBe(6); // Saturday UTC (HK = Saturday)
    expect(derivePageState(d)).toBe("weekend");
  });
});
