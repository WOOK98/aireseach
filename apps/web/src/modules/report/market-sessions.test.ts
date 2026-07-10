import { describe, expect, it } from "vitest";

import {
  derivePageState,
  getDayOfWeek,
  getHkStatus,
  getKrxStatus,
  getNyseStatus,
} from "./market-sessions";

// Helper: build a Date at a specific UTC instant using ISO string to avoid month-index bugs
function utc(iso: string) {
  return new Date(iso + "Z");
}

describe("getDayOfWeek", () => {
  it("returns correct weekday in ET", () => {
    // 2026-07-10 is a Friday. UTC 14:00 = ET 10:00 (EDT, UTC-4)
    expect(getDayOfWeek("America/New_York", utc("2026-07-10T14:00"))).toBe(5);
  });

  it("returns Saturday in HK when it's Friday evening ET", () => {
    // 2026-07-11 02:00 UTC = ET Friday 22:00 = HK Saturday 10:00
    expect(getDayOfWeek("Asia/Hong_Kong", utc("2026-07-11T02:00"))).toBe(6);
  });

  it("handles Sunday correctly", () => {
    // 2026-07-12 is a Sunday
    expect(getDayOfWeek("America/New_York", utc("2026-07-12T14:00"))).toBe(0);
  });
});

describe("getNyseStatus", () => {
  it("returns 'open' during regular hours (10:30 ET = 14:30 UTC in EDT)", () => {
    // 2026-07-10 14:30 UTC = ET 10:30 — regular session
    expect(getNyseStatus(utc("2026-07-10T14:30")).phase).toBe("open");
  });

  it("returns 'pre' during pre-market (07:00 ET = 11:00 UTC in EDT)", () => {
    expect(getNyseStatus(utc("2026-07-10T11:00")).phase).toBe("pre");
  });

  it("returns 'closed' after hours (21:00 ET = 01:00 UTC next day in EDT)", () => {
    // 2026-07-11 01:00 UTC = ET July 10 21:00 — closed
    expect(getNyseStatus(utc("2026-07-11T01:00")).phase).toBe("closed");
  });

  it("returns 'closed' on Saturday", () => {
    // 2026-07-11 is Saturday. 14:00 UTC = ET 10:00
    expect(getNyseStatus(utc("2026-07-11T14:00")).phase).toBe("closed");
  });

  it("returns 'closed' on Sunday", () => {
    expect(getNyseStatus(utc("2026-07-12T14:00")).phase).toBe("closed");
  });

  // Winter time (EST, UTC-5): 10:30 ET = 15:30 UTC
  it("handles EST (winter) correctly — open at 15:30 UTC", () => {
    // 2026-01-12 is a Monday. 15:30 UTC = ET 10:30 EST
    expect(getNyseStatus(utc("2026-01-12T15:30")).phase).toBe("open");
  });

  // DST boundary: EDT starts 2nd Sunday of March. 2026-03-08 is the switch.
  it("handles DST switch day correctly", () => {
    // 2026-03-09 (Monday after DST switch) 14:30 UTC = ET 10:30 EDT
    expect(getNyseStatus(utc("2026-03-09T14:30")).phase).toBe("open");
  });
});

describe("getHkStatus", () => {
  it("returns 'open' during morning session (10:00 HKT = 02:00 UTC)", () => {
    // 2026-07-10 02:00 UTC = HKT 10:00 — morning session
    expect(getHkStatus(utc("2026-07-10T02:00")).phase).toBe("open");
  });

  it("returns 'closed' during lunch break (12:30 HKT = 04:30 UTC)", () => {
    expect(getHkStatus(utc("2026-07-10T04:30")).phase).toBe("closed");
  });

  it("returns 'open' during afternoon session (14:00 HKT = 06:00 UTC)", () => {
    expect(getHkStatus(utc("2026-07-10T06:00")).phase).toBe("open");
  });

  it("returns 'closed' on Saturday even during market hours", () => {
    // 2026-07-11 is Saturday. 02:00 UTC = HKT 10:00
    expect(getHkStatus(utc("2026-07-11T02:00")).phase).toBe("closed");
  });
});

describe("getKrxStatus", () => {
  it("returns 'open' during morning session (10:00 KST = 01:00 UTC)", () => {
    // 2026-07-10 01:00 UTC = KST 10:00
    expect(getKrxStatus(utc("2026-07-10T01:00")).phase).toBe("open");
  });

  it("returns 'closed' during lunch break (12:00 KST = 03:00 UTC)", () => {
    expect(getKrxStatus(utc("2026-07-10T03:00")).phase).toBe("closed");
  });

  it("returns 'closed' on Sunday", () => {
    // 2026-07-12 is Sunday. 01:00 UTC = KST 10:00
    expect(getKrxStatus(utc("2026-07-12T01:00")).phase).toBe("closed");
  });
});

describe("derivePageState", () => {
  it("returns 'us' when NYSE is open (Friday 10:30 ET)", () => {
    // 2026-07-10 14:30 UTC = ET 10:30 Friday
    expect(derivePageState(utc("2026-07-10T14:30"))).toBe("us");
  });

  it("returns 'pre' during NYSE pre-market (Friday 07:00 ET)", () => {
    // 2026-07-10 11:00 UTC = ET 07:00 Friday
    expect(derivePageState(utc("2026-07-10T11:00"))).toBe("pre");
  });

  it("returns 'weekend' when Friday evening ET crosses into HK Saturday", () => {
    // Friday 21:30 ET = Saturday 09:30 HKT → HK weekend
    // 2026-07-11 01:30 UTC = ET Friday 21:30
    expect(derivePageState(utc("2026-07-11T01:30"))).toBe("weekend");
  });

  it("returns 'weekend' on Saturday ET", () => {
    // 2026-07-11 14:00 UTC = ET Saturday 10:00
    expect(derivePageState(utc("2026-07-11T14:00"))).toBe("weekend");
  });

  it("returns 'weekend' on Sunday ET", () => {
    expect(derivePageState(utc("2026-07-12T14:00"))).toBe("weekend");
  });

  it("returns 'asia' on Monday evening ET when HK is Tuesday morning (open)", () => {
    // Monday 21:30 ET = Tuesday 09:30 HKT → HK is open
    // 2026-07-14 01:30 UTC = ET Monday 21:30 (July 13)
    expect(derivePageState(utc("2026-07-14T01:30"))).toBe("asia");
  });

  it("reverse test: Friday 18:30 PDT (21:30 ET) should be weekend if HK is Saturday", () => {
    // 2026-07-11 01:30 UTC = ET Friday 21:30 = HK Saturday 09:30
    // HK is Saturday → weekend, not Asia
    expect(derivePageState(utc("2026-07-11T01:30"))).toBe("weekend");
  });
});
