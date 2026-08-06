/**
 * Market session state machine — real timezone logic.
 *
 * Uses Intl.DateTimeFormat with IANA timezones so DST transitions
 * (US daylight saving, etc.) are handled automatically.
 *
 * Zero dependencies, pure functions, unit-testable.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type MarketId = "NYSE" | "HKEX" | "SSE" | "KRX";
export type MarketState = "pre" | "open" | "lunch" | "closed";
export type PageState = "pre" | "us" | "asia" | "weekend";

export interface MarketStatus {
  state: MarketState;
  localTime: string; // "HH:MM"
}

// ─── Timezone mapping ─────────────────────────────────────────────────────────

const TZ: Record<MarketId, string> = {
  NYSE: "America/New_York", // Intl handles US DST automatically
  HKEX: "Asia/Hong_Kong",
  SSE: "Asia/Shanghai",
  KRX: "Asia/Seoul",
};

// ─── Trading hours (minutes from midnight, local exchange time) ────────────────

interface MarketHours {
  pre?: [number, number]; // pre-market session
  sessions: [number, number][]; // regular trading sessions
}

const HOURS: Record<MarketId, MarketHours> = {
  NYSE: {
    pre: [4 * 60, 9 * 60 + 30],
    sessions: [[9 * 60 + 30, 16 * 60]],
  },
  HKEX: {
    sessions: [
      [9 * 60 + 30, 12 * 60],
      [13 * 60, 16 * 60],
    ],
  },
  SSE: {
    sessions: [
      [9 * 60 + 30, 11 * 60 + 30],
      [13 * 60, 15 * 60],
    ],
  },
  KRX: {
    sessions: [[9 * 60, 15 * 60 + 30]],
  },
};

// ─── Holiday table ────────────────────────────────────────────────────────────
// Format: 'YYYY-MM-DD' in exchange-local date.
// If a date is in this list, the market is treated as closed.
//
// Sources:
//   NYSE: ICE/NYSE Group 2026-2028 announcement (ir.theice.com),
//         aistockselection.com (computed from official NYSE rules)
//   HKEX: HK Gov gazette 2026 general holidays (gov.hk),
//         HKEX follows statutory holidays + substitute days
//   SSE:  Official SSE 2026 holiday schedule (sse.org.cn)
//   KRX:  Korean public holidays 2026 (publicholidays.co.kr / law.go.kr)
//
// 2027 notes:
//   NYSE dates are official (ICE announcement).
//   HKEX/SSE/KRX 2027 lunar-date holidays (Lunar New Year, Chuseok,
//   Mid-Autumn, etc.) are NOT yet officially published as of 2026-08.
//   Only fixed Gregorian dates are included for 2027. Lunar-date holidays
//   must be added once official 2027 calendars are published.
//
// Early-close days (NYSE Nov 27, Dec 24) are included as full closures
// because the current state machine has no early-close concept.

export const HOLIDAYS: Record<MarketId, string[]> = {
  NYSE: [
    // ── 2026 (source: ICE/NYSE Group announcement) ──
    "2026-01-01", // New Year's Day
    "2026-01-19", // Martin Luther King Jr. Day
    "2026-02-16", // Presidents' Day
    "2026-04-03", // Good Friday
    "2026-05-25", // Memorial Day
    "2026-06-19", // Juneteenth
    "2026-07-03", // Independence Day observed (July 4 is Saturday)
    "2026-09-07", // Labor Day
    "2026-11-26", // Thanksgiving
    // Note: Nov 27 (day after Thanksgiving) is early close at 1pm ET, NOT
    // a full closure. Excluded because the state machine has no early-close
    // concept; including it would falsely show "closed" during open morning.
    "2026-12-25", // Christmas
    // Note: Dec 24 (Christmas Eve) is early close at 1pm ET, NOT a full
    // closure. Excluded for the same reason as Nov 27 above.
    // ── 2027 (source: ICE/NYSE Group announcement) ──
    "2027-01-01", // New Year's Day
    "2027-01-18", // Martin Luther King Jr. Day
    "2027-02-15", // Presidents' Day
    "2027-03-26", // Good Friday
    "2027-05-31", // Memorial Day
    "2027-07-05", // Independence Day observed (July 4 is Sunday)
    "2027-09-06", // Labor Day
    "2027-11-25", // Thanksgiving
    // Note: Nov 26 (day after Thanksgiving) is early close at 1pm ET, NOT
    // a full closure. Excluded — same rationale as 2026.
    "2027-12-24", // Christmas (falls on Friday)
  ],

  HKEX: [
    // ── 2026 (source: HK Gov gazette general holidays 2026) ──
    "2026-01-01", // New Year's Day
    "2026-02-17", // Lunar New Year's Day
    "2026-02-18", // Lunar New Year 2nd day
    "2026-02-19", // Lunar New Year 3rd day
    "2026-04-03", // Good Friday
    "2026-04-06", // Day following Ching Ming Festival (substitute)
    "2026-04-07", // Easter Monday
    "2026-05-01", // Labour Day
    "2026-05-25", // Birthday of the Buddha (substitute; actual is Sun May 24)
    "2026-06-19", // Tuen Ng Festival
    "2026-07-01", // HKSAR Establishment Day
    "2026-09-25", // Chinese Mid-Autumn Festival (Fri, day before Sat holiday)
    "2026-10-01", // National Day
    "2026-10-19", // Chung Yeung Festival (substitute; actual is Sun Oct 18)
    "2026-12-25", // Christmas Day
    // ── 2027 (fixed-date only; lunar dates NOT yet published) ──
    "2027-01-01", // New Year's Day
    "2027-04-16", // Good Friday
    "2027-04-19", // Easter Monday
    "2027-05-01", // Labour Day (Sat — already closed, included for safety)
    "2027-07-01", // HKSAR Establishment Day
    "2027-12-25", // Christmas Day (Sat — already closed, included for safety)
  ],

  SSE: [
    // ── 2026 (source: SSE official announcement sse.org.cn) ──
    "2026-01-01", // New Year
    "2026-01-02", // New Year
    "2026-02-16", // Spring Festival
    "2026-02-17", // Spring Festival
    "2026-02-18", // Spring Festival
    "2026-02-19", // Spring Festival
    "2026-02-20", // Spring Festival
    "2026-02-23", // Spring Festival
    "2026-04-06", // Qingming Festival (substitute; actual Sun Apr 5)
    "2026-05-01", // Labour Day
    "2026-05-04", // Labour Day
    "2026-05-05", // Labour Day
    "2026-06-19", // Dragon Boat Festival
    "2026-09-25", // Mid-Autumn Festival
    "2026-10-01", // National Day
    "2026-10-02", // National Day
    "2026-10-05", // National Day
    "2026-10-06", // National Day
    "2026-10-07", // National Day
  ],

  KRX: [
    // ── 2026 (source: publicholidays.co.kr / law.go.kr) ──
    "2026-01-01", // New Year's Day
    "2026-02-16", // Seollal
    "2026-02-17", // Seollal
    "2026-02-18", // Seollal
    "2026-03-02", // March 1st Movement Day (substitute; actual Sun Mar 1)
    "2026-05-05", // Children's Day
    "2026-05-25", // Buddha's Birthday (substitute; actual Sun May 24)
    "2026-08-17", // Liberation Day (substitute; actual Sat Aug 15)
    "2026-09-24", // Chuseok
    "2026-09-25", // Chuseok
    "2026-10-05", // National Foundation Day (substitute; actual Sat Oct 3)
    "2026-10-09", // Hangeul Day
    "2026-12-25", // Christmas Day
  ],
};

// ─── Internal helpers ─────────────────────────────────────────────────────────

function tzParts(
  tz: string,
  d: Date,
): { weekday: string; date: string; minutes: number; hhmm: string } {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    hour12: false,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(d);

  const get = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  const hour = parseInt(get("hour"), 10);
  const minute = parseInt(get("minute"), 10);

  return {
    weekday: get("weekday"), // 'Mon', 'Tue', ...
    date: `${get("year")}-${get("month")}-${get("day")}`, // 'YYYY-MM-DD'
    minutes: hour * 60 + minute,
    hhmm: `${get("hour")}:${get("minute")}`,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Get the current state of a single market.
 */
export function marketState(m: MarketId, now = new Date()): MarketStatus {
  const { weekday, date, minutes, hhmm } = tzParts(TZ[m], now);
  const closed: MarketStatus = { state: "closed", localTime: hhmm };

  // Weekend
  if (weekday === "Sat" || weekday === "Sun") return closed;

  // Holiday
  if (HOLIDAYS[m].includes(date)) return closed;

  const h = HOURS[m];

  // Pre-market
  if (h.pre && minutes >= h.pre[0] && minutes < h.pre[1]) {
    return { state: "pre", localTime: hhmm };
  }

  // Regular sessions
  for (const [a, b] of h.sessions) {
    if (minutes >= a && minutes < b) {
      return { state: "open", localTime: hhmm };
    }
  }

  // Lunch break (between two sessions)
  if (h.sessions.length === 2) {
    const [morning, afternoon] = h.sessions;
    if (
      morning &&
      afternoon &&
      minutes >= morning[1] &&
      minutes < afternoon[0]
    ) {
      return { state: "lunch", localTime: hhmm };
    }
  }

  return closed;
}

/**
 * Derive the page state from current market conditions.
 *
 * Logic:
 * - NYSE pre-market → 'pre'
 * - NYSE open → 'us'
 * - Any Asia market open/lunch → 'asia'
 * - Otherwise → 'weekend' (covers after-hours gaps + actual weekends)
 */
export function derivePageState(now = new Date()): PageState {
  const ny = marketState("NYSE", now).state;

  if (ny === "pre") return "pre";
  if (ny === "open") return "us";

  const asiaLive = (["HKEX", "SSE", "KRX"] as MarketId[]).some((m) =>
    ["open", "lunch"].includes(marketState(m, now).state),
  );

  if (asiaLive) return "asia";

  return "weekend";
}

// ─── UI label helpers ─────────────────────────────────────────────────────────

export const MARKET_LABELS: Record<MarketId, string> = {
  NYSE: "NYSE·NASDAQ",
  HKEX: "HKEX·A股",
  SSE: "SSE",
  KRX: "KRX",
};

export function stateLabel(s: MarketState): string {
  switch (s) {
    case "pre":
      return "PRE-MARKET";
    case "open":
      return "OPEN";
    case "lunch":
      return "LUNCH";
    case "closed":
      return "CLOSED ✓";
  }
}

export function stateColor(s: MarketState): string {
  switch (s) {
    case "pre":
      return "border-amber-600 text-amber-800";
    case "open":
      return "border-emerald-600 text-emerald-700";
    case "lunch":
      return "border-stone-400 text-stone-600";
    case "closed":
      return "border-[#e5e0d6] text-[#6b675e]";
  }
}
