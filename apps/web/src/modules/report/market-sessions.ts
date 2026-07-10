/**
 * Market session utilities — each market derives its state entirely in its own timezone.
 * No cross-timezone windows, DST-immune by design.
 *
 * Handoff spec: `market-sessions.ts` with pure functions + unit-testable.
 */

// ─── Timezone helpers ────────────────────────────────────────────────────────

/** Get {h, m, label} in a specific IANA timezone. Pass `now` for testing. */
export function getTimeInTz(
  tz: string,
  now?: Date,
): { h: number; m: number; label: string } {
  const d = now ?? new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
    timeZone: tz,
  }).formatToParts(d);
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  const label = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: tz,
  }).format(d);
  return { h, m, label };
}

/** Get day-of-week (0=Sun … 6=Sat) in a specific IANA timezone. */
export function getDayOfWeek(tz: string, now?: Date): number {
  const weekday = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: tz,
  }).format(now ?? new Date());
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[weekday] ?? 0;
}

// ─── Market status types ─────────────────────────────────────────────────────

export type MarketPhase = "open" | "pre" | "closed";

export interface MarketStatus {
  phase: MarketPhase;
  clock: string; // human-readable time in that tz
}

// ─── Per-market pure functions ───────────────────────────────────────────────

/**
 * NYSE / NASDAQ — all times in America/New_York.
 * Pre-market: 04:00–09:29, Regular: 09:30–15:59, Closed: 16:00–03:59.
 * Weekend: Sat/Sun in ET.
 */
export function getNyseStatus(now?: Date): MarketStatus {
  const tz = "America/New_York";
  const t = getTimeInTz(tz, now);
  const dow = getDayOfWeek(tz, now);
  if (dow === 0 || dow === 6) return { phase: "closed", clock: t.label };
  const mins = t.h * 60 + t.m;
  if (mins >= 570 && mins < 960) return { phase: "open", clock: t.label };
  if (mins >= 240 && mins < 570) return { phase: "pre", clock: t.label };
  return { phase: "closed", clock: t.label };
}

/**
 * HKEX + China-A (SSE/SZSE) — all times in Asia/Hong_Kong.
 * Regular: 09:30–11:59 + 13:00–15:59 (lunch break 12:00–12:59 = closed).
 * Pre-market: 09:00–09:29.
 * Weekend: Sat/Sun in HKT.
 */
export function getHkStatus(now?: Date): MarketStatus {
  const tz = "Asia/Hong_Kong";
  const t = getTimeInTz(tz, now);
  const dow = getDayOfWeek(tz, now);
  if (dow === 0 || dow === 6) return { phase: "closed", clock: t.label };
  const mins = t.h * 60 + t.m;
  // Morning session: 09:30–11:59
  if (mins >= 570 && mins < 720) return { phase: "open", clock: t.label };
  // Lunch break: 12:00–12:59 → closed
  // Afternoon session: 13:00–15:59
  if (mins >= 780 && mins < 960) return { phase: "open", clock: t.label };
  // Pre-market: 09:00–09:29
  if (mins >= 540 && mins < 570) return { phase: "pre", clock: t.label };
  return { phase: "closed", clock: t.label };
}

/**
 * KRX — all times in Asia/Seoul.
 * Regular: 09:00–15:29 (closes 15:30).
 * Lunch break: 11:30–12:29 = closed.
 * Weekend: Sat/Sun in KST.
 */
export function getKrxStatus(now?: Date): MarketStatus {
  const tz = "Asia/Seoul";
  const t = getTimeInTz(tz, now);
  const dow = getDayOfWeek(tz, now);
  if (dow === 0 || dow === 6) return { phase: "closed", clock: t.label };
  const mins = t.h * 60 + t.m;
  // Morning session: 09:00–11:29
  if (mins >= 540 && mins < 690) return { phase: "open", clock: t.label };
  // Lunch break: 11:30–12:29 → closed
  // Afternoon session: 12:30–15:29
  if (mins >= 750 && mins < 930) return { phase: "open", clock: t.label };
  return { phase: "closed", clock: t.label };
}

// ─── Page state derivation ───────────────────────────────────────────────────

export type PageState = "pre" | "us" | "asia" | "weekend";

/**
 * Derive page state by asking each market independently.
 * No cross-timezone windows — each market reports its own phase.
 */
export function derivePageState(now?: Date): PageState {
  const nyse = getNyseStatus(now);
  const hk = getHkStatus(now);
  const kr = getKrxStatus(now);

  // If all three are closed and it's a weekend in at least one → weekend
  const nyseDow = getDayOfWeek("America/New_York", now);
  const hkDow = getDayOfWeek("Asia/Hong_Kong", now);
  const krDow = getDayOfWeek("Asia/Seoul", now);
  const anyWeekend =
    nyseDow === 0 ||
    nyseDow === 6 ||
    hkDow === 0 ||
    hkDow === 6 ||
    krDow === 0 ||
    krDow === 6;

  if (
    anyWeekend &&
    nyse.phase === "closed" &&
    hk.phase === "closed" &&
    kr.phase === "closed"
  ) {
    return "weekend";
  }

  // NYSE pre-market
  if (nyse.phase === "pre") return "pre";
  // NYSE open (US session)
  if (nyse.phase === "open") return "us";
  // Asia markets open
  if (hk.phase === "open" || kr.phase === "open") return "asia";

  // All closed but not a weekend edge case (e.g. late night ET on a weekday)
  // Default to the most relevant state
  if (anyWeekend) return "weekend";
  return "asia"; // ET evening on a weekday → Asia window
}

// ─── Labels ──────────────────────────────────────────────────────────────────

export function formatDate(): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date());
}

export function formatDateInTz(tz: string, now?: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: tz,
  }).format(now ?? new Date());
}
