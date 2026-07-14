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
// Empty arrays = placeholder; fill before production launch.
// If a date is in this list, the market is treated as closed.

export const HOLIDAYS: Record<MarketId, string[]> = {
  NYSE: [],
  HKEX: [],
  SSE: [],
  KRX: [],
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
