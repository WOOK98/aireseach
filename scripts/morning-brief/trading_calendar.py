"""
Trading calendar — pure functions, ISO fixtures, DST-safe.

Ported from apps/web/src/modules/dashboard/market-sessions.ts.
Red-line ④: pure functions + ISO fixtures, no numeric month parameters.
"""

from __future__ import annotations

from datetime import datetime, date
from zoneinfo import ZoneInfo

# ─── Market IDs ──────────────────────────────────────────────────────────────

MarketId = str  # "NYSE" | "HKEX" | "SSE" | "KRX"

TZ: dict[str, str] = {
    "NYSE": "America/New_York",
    "HKEX": "Asia/Hong_Kong",
    "SSE": "Asia/Shanghai",
    "KRX": "Asia/Seoul",
}

# ─── NYSE Holidays (2025-2026) ───────────────────────────────────────────────
# ISO date strings in exchange-local time.
# Add new holidays annually. Empty = treat all weekdays as trading days.

NYSE_HOLIDAYS: set[str] = {
    # 2025
    "2025-01-01",  # New Year's Day
    "2025-01-20",  # MLK Jr Day
    "2025-02-17",  # Presidents' Day
    "2025-04-18",  # Good Friday
    "2025-05-26",  # Memorial Day
    "2025-06-19",  # Juneteenth
    "2025-07-04",  # Independence Day
    "2025-09-01",  # Labor Day
    "2025-11-27",  # Thanksgiving
    "2025-12-25",  # Christmas
    # 2026
    "2026-01-01",  # New Year's Day
    "2026-01-19",  # MLK Jr Day
    "2026-02-16",  # Presidents' Day
    "2026-04-03",  # Good Friday
    "2026-05-25",  # Memorial Day
    "2026-06-19",  # Juneteenth
    "2026-07-03",  # Independence Day (observed)
    "2026-09-07",  # Labor Day
    "2026-11-26",  # Thanksgiving
    "2026-12-25",  # Christmas
}

# ─── Core functions ──────────────────────────────────────────────────────────


def now_in_tz(tz_name: str) -> datetime:
    """Current datetime in the given IANA timezone."""
    return datetime.now(ZoneInfo(tz_name))


def date_iso(d: date | datetime) -> str:
    """ISO date string 'YYYY-MM-DD'."""
    return d.strftime("%Y-%m-%d")


def is_weekday(d: date | datetime) -> bool:
    """Monday=0 .. Friday=4 → True."""
    return d.weekday() < 5


def is_nyse_holiday(d: date | datetime) -> bool:
    """Check against the NYSE holiday table (ISO date string)."""
    return date_iso(d) in NYSE_HOLIDAYS


def is_nyse_trading_day(d: date | datetime | None = None) -> bool:
    """True if NYSE is open on this date (weekday + not a holiday)."""
    if d is None:
        d = now_in_tz(TZ["NYSE"])
    return is_weekday(d) and not is_nyse_holiday(d)


def next_trading_day(from_date: date | datetime | None = None) -> date:
    """Find the next NYSE trading day (inclusive if today is one)."""
    if from_date is None:
        from_date = now_in_tz(TZ["NYSE"])
    d = from_date if isinstance(from_date, date) and not isinstance(from_date, datetime) else from_date.date()
    for _ in range(10):  # max 10 days lookahead
        if is_nyse_trading_day(d):
            return d
        d = date.fromordinal(d.toordinal() + 1)
    return d  # fallback


def market_local_time(market: MarketId) -> datetime:
    """Current datetime in the exchange's timezone."""
    return now_in_tz(TZ[market])


# ─── Self-test ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    today = now_in_tz(TZ["NYSE"])
    print(f"NYSE local time: {today.isoformat()}")
    print(f"Today ({date_iso(today)}): trading day = {is_nyse_trading_day(today)}")
    print(f"Next trading day: {next_trading_day(today)}")

    # Verify known holidays
    assert is_nyse_holiday(date(2025, 12, 25)), "2025-12-25 should be holiday"
    assert not is_nyse_holiday(date(2025, 12, 26)), "2025-12-26 should not be holiday"
    assert is_weekday(date(2026, 7, 27)), "2026-07-27 (Mon) should be weekday"
    print("All assertions passed.")
