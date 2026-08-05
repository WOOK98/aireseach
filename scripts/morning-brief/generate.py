#!/usr/bin/env python3
"""
Morning Brief Generator — automated pre-market watchlist triage.

Usage:
    python scripts/morning-brief/generate.py [--watchlist <path>] [--force]

Outputs to: briefs/YYYY-MM-DD.md (committed by CI).
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import date, datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import requests

# Allow import of sibling module
sys.path.insert(0, os.path.dirname(__file__))
from trading_calendar import (
    TZ,
    date_iso,
    is_nyse_trading_day,
    market_local_time,
    next_trading_day,
)

# ─── Config ──────────────────────────────────────────────────────────────────

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
BRIEFS_DIR = REPO_ROOT / "briefs"

WATCHLIST_SEARCH_PATHS = [
    Path("./watchlist.md"),
    Path("./watchlist.json"),
    Path("./.airesearch/watchlist.md"),
    Path("./.airesearch/watchlist.json"),
    Path.home() / ".airesearch" / "watchlist.md",
    Path.home() / ".airesearch" / "watchlist.json",
    Path.home() / "Documents" / "airesearch-watchlist.md",
    Path.home() / "Documents" / "airesearch-watchlist.json",
]

# Fallback: comma-separated tickers from env (for CI)
WATCHLIST_TICKERS_ENV = os.getenv("WATCHLIST_TICKERS", "")

# LLM config (from env, fallback to report-agent defaults)
LLM_API_KEY = os.getenv("LLM_API_KEY") or os.getenv("DEEPSEEK_API_KEY", "")
LLM_BASE_URL = os.getenv("LLM_BASE_URL", "https://api.deepseek.com/v1")
LLM_MODEL = os.getenv("LLM_MODEL", "deepseek-chat")

JINA_API_KEY = os.getenv("JINA_API_KEY", "")
SEARCH_TIMEOUT = int(os.getenv("SEARCH_TIMEOUT_SECONDS", "20"))

UA = {"User-Agent": "Mozilla/5.0 (MorningBrief/1.0)"}

# ─── Watchlist parsing ───────────────────────────────────────────────────────


def find_watchlist(explicit_path: str | None = None) -> Path | None:
    """Find watchlist file using fallback order from SKILL.md."""
    if explicit_path:
        p = Path(explicit_path)
        if p.exists():
            return p
        print(f"⚠️  Explicit watchlist not found: {p}")
        return None

    env_path = os.getenv("AIRESEARCH_WATCHLIST")
    if env_path:
        p = Path(env_path)
        if p.exists():
            return p

    for p in WATCHLIST_SEARCH_PATHS:
        if p.exists():
            return p
    return None


def parse_watchlist(path: Path) -> list[str]:
    """Extract ticker symbols from .md or .json watchlist."""
    content = path.read_text(encoding="utf-8").strip()

    if path.suffix == ".json":
        data = json.loads(content)
        tickers = data.get("watchlist", data if isinstance(data, list) else [])
    else:
        tickers = []
        for line in content.splitlines():
            line = line.strip()
            if line.startswith("- ") and not line.startswith("- **"):
                ticker = line[2:].strip().split()[0].upper()
                if ticker and ticker != "#":
                    tickers.append(ticker)

    # Deduplicate, preserve order
    seen: set[str] = set()
    result: list[str] = []
    for t in tickers:
        t = t.upper()
        if t not in seen:
            seen.add(t)
            result.append(t)
    return result


# ─── Data gathering ──────────────────────────────────────────────────────────


def fetch_yahoo_quote(ticker: str) -> dict | None:
    """Fetch current quote from Yahoo Finance."""
    try:
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}"
        params = {"interval": "1d", "range": "2d"}
        res = requests.get(url, params=params, headers=UA, timeout=10)
        if not res.ok:
            return None
        data = res.json()
        result = data.get("chart", {}).get("result", [])
        if not result:
            return None
        meta = result[0].get("meta", {})
        return {
            "ticker": ticker,
            "price": meta.get("regularMarketPrice"),
            "prev_close": meta.get("chartPreviousClose") or meta.get("previousClose"),
            "currency": meta.get("currency", "USD"),
            "exchange": meta.get("exchangeName", ""),
            "name": meta.get("shortName", ticker),
        }
    except Exception as e:
        print(f"  ⚠️  Yahoo quote failed for {ticker}: {e}")
        return None


def fetch_news_jina(ticker: str, company_name: str) -> str:
    """Fetch recent news via Jina Search API."""
    if not JINA_API_KEY:
        return ""
    try:
        query = f"{company_name} ({ticker}) stock news today"
        url = f"https://s.jina.ai/{requests.utils.quote(query)}"
        headers = {**UA, "Authorization": f"Bearer {JINA_API_KEY}"}
        res = requests.get(url, headers=headers, timeout=SEARCH_TIMEOUT)
        if not res.ok:
            return ""
        return res.text[:3000]  # Truncate
    except Exception as e:
        print(f"  ⚠️  Jina search failed for {ticker}: {e}")
        return ""


# ─── LLM ─────────────────────────────────────────────────────────────────────


def call_llm(system: str, user: str) -> str:
    """Call LLM API (OpenAI-compatible)."""
    if not LLM_API_KEY:
        raise RuntimeError("No LLM API key configured (LLM_API_KEY or DEEPSEEK_API_KEY)")

    headers = {
        "Authorization": f"Bearer {LLM_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": LLM_MODEL,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "temperature": 0.3,
        "max_tokens": 4096,
    }
    res = requests.post(
        f"{LLM_BASE_URL}/chat/completions",
        headers=headers,
        json=payload,
        timeout=120,
    )
    if not res.ok:
        body = res.text[:500] if res.text else "(empty body)"
        print(f"❌ LLM API error: HTTP {res.status_code}")
        print(f"   Response: {body}")
        # Do not print key, headers, or full payload
        res.raise_for_status()
    return res.json()["choices"][0]["message"]["content"]


# ─── Brief generation ────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are a pre-market brief writer for stock investors.
Your job: rank watchlist names by overnight attention needed.

Rules:
- Output ONLY the markdown brief, no preamble.
- Rank by: material event > earnings/filing > large price move > sector shock > upcoming catalyst > no change.
- Top 8 get individual sections; rest go to "Quiet names".
- Never fabricate prices, news, or catalysts. If data is missing, say so.
- Never give trade instructions (buy/sell/hold/target/stop).
- Include source dates where available.
- Use the user's language for prose; keep tickers and metrics in English.
- "Skipped" section for tickers that couldn't be resolved."""


def build_user_prompt(
    tickers: list[str],
    quotes: dict[str, dict],
    news: dict[str, str],
    brief_date: str,
) -> str:
    """Build the LLM prompt with gathered data."""
    sections = []
    for ticker in tickers:
        q = quotes.get(ticker)
        n = news.get(ticker, "")
        if q and q.get("price"):
            prev = q.get("prev_close", 0)
            price = q["price"]
            change_pct = ((price - prev) / prev * 100) if prev else 0
            direction = "▲" if change_pct >= 0 else "▼"
            section = f"### {ticker} — {q.get('name', ticker)} ({q.get('exchange', '')})\n"
            section += f"- Price: {price} {q['currency']} ({direction}{abs(change_pct):.1f}%)\n"
            if n:
                section += f"- Recent news:\n{n[:1500]}\n"
            sections.append(section)
        else:
            sections.append(f"### {ticker}\n- No quote data available.\n")

    return f"""Generate a morning brief for {brief_date}.

Watchlist ({len(tickers)} tickers):
{"".join(sections)}

Output the brief in the specified format. Language: English."""


def generate_brief(tickers: list[str], brief_date: str) -> str:
    """Full pipeline: gather data → LLM → markdown brief."""
    print(f"📊 Gathering data for {len(tickers)} tickers...")

    quotes: dict[str, dict] = {}
    news: dict[str, str] = {}

    for ticker in tickers:
        print(f"  → {ticker}")
        q = fetch_yahoo_quote(ticker)
        if q:
            quotes[ticker] = q
            n = fetch_news_jina(ticker, q.get("name", ticker))
            if n:
                news[ticker] = n

    print(f"🧠 Generating brief with {LLM_MODEL}...")
    user_prompt = build_user_prompt(tickers, quotes, news, brief_date)
    brief = call_llm(SYSTEM_PROMPT, user_prompt)

    # Prepend header if LLM didn't include it
    if not brief.strip().startswith("# Morning Brief"):
        brief = f"# Morning Brief — {brief_date}\n\n{brief}"

    return brief


# ─── Main ────────────────────────────────────────────────────────────────────


def main():
    parser = argparse.ArgumentParser(description="Morning Brief Generator")
    parser.add_argument("--watchlist", help="Explicit watchlist path")
    parser.add_argument("--force", action="store_true", help="Run even if not a trading day")
    args = parser.parse_args()

    nyse_tz = TZ["NYSE"]
    now = market_local_time("NYSE")
    today = now.date()
    brief_date = date_iso(today)

    print(f"⏰ NYSE time: {now.strftime('%Y-%m-%d %H:%M %Z')}")

    # Trading day check
    if not args.force and not is_nyse_trading_day(today):
        next_day = next_trading_day(today)
        print(f"📅 {brief_date} is not a NYSE trading day. Next: {date_iso(next_day)}")
        print("⏭️  Skipping brief. Use --force to override.")
        # Write skip marker for CI
        skip_file = BRIEFS_DIR / f"{brief_date}.skip"
        skip_file.parent.mkdir(parents=True, exist_ok=True)
        skip_file.write_text(f"Skipped: not a trading day. Next: {date_iso(next_day)}\n")
        return 0

    # Find watchlist
    watchlist_path = find_watchlist(args.watchlist)
    if watchlist_path:
        print(f"📋 Watchlist: {watchlist_path}")
        tickers = parse_watchlist(watchlist_path)
    elif WATCHLIST_TICKERS_ENV:
        # Fallback: comma-separated tickers from env (CI use)
        tickers = [t.strip().upper() for t in WATCHLIST_TICKERS_ENV.split(',') if t.strip()]
        print(f"📋 Watchlist from WATCHLIST_TICKERS env: {len(tickers)} tickers")
    else:
        print("❌ No watchlist found. Set WATCHLIST_TICKERS env or create watchlist.md")
        return 1
    if not tickers:
        print("❌ Watchlist is empty.")
        return 1

    print(f"📝 {len(tickers)} tickers: {', '.join(tickers)}")

    # Generate
    try:
        brief = generate_brief(tickers, brief_date)
    except Exception as e:
        print(f"❌ Generation failed: {e}")
        return 1

    # Write output
    BRIEFS_DIR.mkdir(parents=True, exist_ok=True)
    out_path = BRIEFS_DIR / f"{brief_date}.md"
    out_path.write_text(brief, encoding="utf-8")
    print(f"✅ Brief written: {out_path.relative_to(REPO_ROOT)}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
