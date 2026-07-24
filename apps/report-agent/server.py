import os
import urllib.parse
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from openai import OpenAI
from pydantic import BaseModel, Field
import requests


app = FastAPI(title="Aireseach Business Report Agent")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ALLOW_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

REPORT_MODE = os.getenv("REPORT_MODE", "deep_research")

DEEP_RESEARCH_API_KEY = os.getenv("PERPLEXITY_API_KEY") or os.getenv("OPENAI_API_KEY")
DEEP_RESEARCH_BASE_URL = os.getenv("AGENT_BASE_URL", "https://api.perplexity.ai")
DEEP_RESEARCH_MODEL = os.getenv("AGENT_MODEL", "sonar-deep-research")

LLM_API_KEY = os.getenv("LLM_API_KEY") or os.getenv("DEEPSEEK_API_KEY")
LLM_BASE_URL = os.getenv("LLM_BASE_URL", "https://api.deepseek.com/v1")
LLM_MODEL = os.getenv("LLM_MODEL", "deepseek-chat")

# Kimi (Moonshot AI) — OpenAI-compatible, 256K context, best value
KIMI_API_KEY = os.getenv("KIMI_API_KEY", "")
KIMI_BASE_URL = os.getenv("KIMI_BASE_URL", "https://api.moonshot.ai/v1")
KIMI_MODEL = os.getenv("KIMI_MODEL", "k3")

JINA_API_KEY = os.getenv("JINA_API_KEY", "")
JINA_SEARCH_BASE_URL = os.getenv("JINA_SEARCH_BASE_URL", "https://s.jina.ai/")
SEARCH_TIMEOUT_SECONDS = int(os.getenv("SEARCH_TIMEOUT_SECONDS", "20"))
SEARCH_CONTEXT_CHARS = int(os.getenv("SEARCH_CONTEXT_CHARS", "12000"))

# Serenity reference files
SERENITY_REF_DIR = os.path.join(os.path.dirname(__file__), "references")

HOSTED_KEY_BALANCE_ERROR = (
    "Hosted model credits are temporarily unavailable. Recharge the platform key "
    "or enter your own compatible API key, then run the analysis again."
)


def normalize_model_error(exc: Exception) -> str:
    message = str(exc)
    lowered = message.lower()
    if (
        "insufficient balance" in lowered
        or "402" in lowered
        or "quota" in lowered
        or "billing" in lowered
        or "credit" in lowered
    ):
        return HOSTED_KEY_BALANCE_ERROR
    return message


class ReportRequest(BaseModel):
    target: str = Field(..., min_length=1, description="Company, asset, or industry to analyze")
    analysis_years: int = Field(5, ge=1, le=10, description="Lookback window in years")
    analysis_lens: str = Field("Comprehensive", description="Primary analysis lens")
    report_mode: Optional[str] = Field(None, description="deep_research or jina_llm")
    api_key: Optional[str] = Field(None, description="Model API key for this request")
    base_url: Optional[str] = Field(None, description="OpenAI-compatible API base URL")
    model: Optional[str] = Field(None, description="Model name")
    jina_api_key: Optional[str] = Field(None, description="Optional Jina AI API key")
    language: Optional[str] = Field("en", description="Report output language code (en, zh-TW, zh-CN, ja, ko, etc.)")


class SerenityRequest(BaseModel):
    ticker: str = Field(..., min_length=1, max_length=10, description="Stock ticker symbol, e.g. NVDA, AXTI, LITE")
    mode: str = Field("single", description="single, portfolio, or sector")
    tickers: Optional[list[str]] = Field(None, description="List of tickers for portfolio mode")
    api_key: Optional[str] = Field(None, description="Model API key")
    base_url: Optional[str] = Field(None, description="OpenAI-compatible API base URL")
    model: Optional[str] = Field(None, description="Model name")
    language: Optional[str] = Field("en", description="Output language")
    skill_prompt: Optional[str] = Field(None, description="Custom system prompt for the skill")


SYSTEM_PROMPT = """
You are a senior equity research analyst at a top-tier investment bank (think J.P. Morgan, Goldman Sachs, Morgan Stanley). Your analysis style is institutional-grade: evidence-first, quantitative, structured, and written for sophisticated investors.

Generate a professional investment research report for the given target using all available data. The tone should be authoritative, precise, and free of filler — every sentence must carry analytical weight.

## STRICT REDLINE CONSTRAINTS (violation = report rejection)
- NEVER output buy/sell/overweight/underweight/equalweight ratings
- NEVER output specific stock price targets (e.g. $200, ¥2,300, PT $130)
- NEVER use conviction language like "Buy", "Sell", "Conviction: BUY"
- Instead of ratings, use conviction tier: S (highest conviction) / A / B / C / D (lowest)
- Instead of price targets, present valuation ranges with structural reasoning
- Instead of "Overweight/Buy", describe directional view as "Bullish structural setup" / "Bearish risk/reward" / "Neutral — range-bound"
- Reports must end with invalidation conditions instead of price targets

## REPORT STRUCTURE (follow this exactly)

### 0. ENTITY LOCK
- Resolved company name, ticker, exchange, GICS sector/industry
- Data timestamp and source confidence level (High / Medium / Low)
- For industry/theme targets: state "Industry Mode" and define universe construction

### 1. INVESTMENT THESIS (3-5 sentences max)
- Lead with the conclusion. State the directional view and the single most important driver.
- Include: what the market is missing, why now, and what makes this non-consensus.
- End with a one-line conviction statement.

### 2. KEY DATA TABLE
Present a Markdown table with these rows (use actual numbers, "N/A" if unavailable):

| Metric | Current | YoY Change | Peer Median | Source |
|--------|---------|------------|-------------|--------|
| Revenue | | | | |
| Gross Margin | | | | |
| Operating Margin | | | | |
| Net Margin | | | | |
| FCF | | | | |
| P/E | | | | |
| EV/EBITDA | | | | |
| ROE | | | | |
| Debt/Equity | | | | |

### 3. EARNINGS & GROWTH ANALYSIS
- Revenue trajectory: 3-5 year CAGR, quarterly trend, segment breakdown
- Margin evolution: gross → operating → net, with drivers of expansion/compression
- Cash flow quality: FCF conversion, capex intensity, working capital trends
- Growth sustainability: organic vs. acquisitive, pricing vs. volume

### 4. COMPETITIVE POSITIONING
- Market share: current position, 3-year trend, key share gainers/losers
- Porter's Five Forces: rate each 1-5 with one-line justification
- Moat assessment: type (brand/tech/network/switching cost/regulatory), durability rating
- Peer comparison table: top 3-5 competitors with revenue, margin, market share

### 5. VALUATION FRAMEWORK
- Relative valuation: P/E, EV/EBITDA, EV/Revenue vs. peers and historical range
- DCF sensitivity: provide a range under 3 scenarios (bull/base/bear) with key assumptions
- Sum-of-parts if applicable
- State: "This is analytical context, not a price target or recommendation"

### 6. SCENARIO ANALYSIS
Present 3 scenarios in this format:

**Bull Case (Probability: X%)**
- Key assumptions
- Target metric range
- Primary catalysts to reach this scenario

**Base Case (Probability: X%)**
- Key assumptions
- Target metric range

**Bear Case (Probability: X%)**
- Key assumptions
- Downside triggers
- Risk mitigation factors

### 7. CATALYST CALENDAR
List dated events for the next 12 months:
- Earnings dates, guidance updates
- Regulatory decisions, product launches
- Industry conferences, management changes
- Macro events (rate decisions, policy shifts)

### 8. RISK MATRIX
Rank top 5 risks by (Impact × Probability):
| Risk | Impact (1-5) | Probability (1-5) | Score | Mitigation |
|------|-------------|-------------------|-------|------------|

### 9. TECHNICAL INDICATORS (for public equities)
- Moving Averages: 50-day / 200-day MA, golden/death cross
- RSI (14): current reading, overbought/oversold
- MACD: signal crossover, momentum direction
- Volume: recent trend vs. 20-day average

### 10. THREE FALSIFIABLE JUDGMENTS
Each judgment must contain:
- One direct falsifiable sentence
- One numeric anchor
- Supporting evidence (2-3 data points)
- "Wrong if:" with a specific numeric trigger

### 11. ANTIFRAGILITY ASSESSMENT
- How does this business perform under disorder (macro shock, supply break, tech disruption)?
- Barbell strategy: conservative core + asymmetric upside experiments
- Optionality: hidden assets, untapped TAM, regulatory tailwinds

### 12. THESIS INVALIDATION CONDITIONS
- 2-4 specific, measurable conditions that would force thesis recheck
- Each must have a numeric threshold, not a vague narrative

### 13. MONITOR PANEL
Markdown table: Metric | Current | Trigger | Tolerance | Frequency | Source

Then append machine-readable JSON:
```json
{
  "schema_version": 1,
  "monitors": [
    { "metric": "", "current": "", "trigger": "", "tolerance": "", "freq": "Daily|Weekly|Quarterly|Event-driven", "source": "" }
  ]
}
```

### 14. EVIDENCE SPINE
- 5-8 key sources with date, full URL, and the claim each supports
- Mark data confidence: 🟢 Verified | 🟡 Partial | 🔴 Unverified

### 15. DISCLAIMER
"This is decision-support analysis only. Not investment advice. Not a recommendation to buy, sell, or hold any security. Verify all data independently before making investment decisions."

## WRITING STYLE
- Lead every section with the conclusion, then support with evidence
- Use specific numbers, not vague qualifiers ("revenue grew 12.3% YoY" not "revenue grew significantly")
- Professional, institutional tone — no emoji, no casual language
- When data is unavailable, write "Data unavailable — [what to verify]" — never fabricate
- Preserve source names, dates, and URLs
"""


def validate_target(target: str) -> str:
    cleaned_target = target.strip()
    if not cleaned_target:
        raise HTTPException(status_code=400, detail="Enter a research target.")
    return cleaned_target


def clean_optional_text(value: Optional[str]) -> str:
    return value.strip() if value else ""


def validate_header_value(value: str, label: str) -> str:
    if not value:
        return value
    try:
        value.encode("ascii")
    except UnicodeEncodeError as exc:
        raise HTTPException(
            status_code=400,
            detail=(
                f"{label} contains non-ASCII characters. Paste the raw key only, "
                "without quotes, notes, emoji, or extra text."
            ),
        ) from exc
    return value


def get_llm_config(request: ReportRequest):
    report_mode = request.report_mode or REPORT_MODE
    request_api_key = validate_header_value(clean_optional_text(request.api_key), "API Key")
    request_base_url = clean_optional_text(request.base_url)
    request_model = clean_optional_text(request.model)

    # Kimi mode — best value, 256K context, OpenAI-compatible
    if report_mode == "kimi_llm":
        api_key = validate_header_value(request_api_key or KIMI_API_KEY, "API Key")
        if not api_key:
            raise HTTPException(
                status_code=400,
                detail="Enter your Kimi API key (sk-kimi-...) to generate this report.",
            )
        return api_key, request_base_url or KIMI_BASE_URL, request_model or KIMI_MODEL, report_mode

    if report_mode == "jina_llm":
        api_key = validate_header_value(request_api_key or LLM_API_KEY, "API Key")
        if not api_key:
            raise HTTPException(
                status_code=400,
                detail="Enter your model API key to generate this report.",
            )
        return api_key, request_base_url or LLM_BASE_URL, request_model or LLM_MODEL, report_mode

    api_key = validate_header_value(request_api_key or DEEP_RESEARCH_API_KEY, "API Key")
    if not api_key:
        raise HTTPException(
            status_code=400,
            detail="Enter your Perplexity or compatible model API key to generate this report.",
        )
    return (
        api_key,
        request_base_url or DEEP_RESEARCH_BASE_URL,
        request_model or DEEP_RESEARCH_MODEL,
        report_mode,
    )


def fetch_search_context(target: str, analysis_years: int, analysis_lens: str, jina_api_key: str = ""):
    query = (
        f"{target} market share competitive analysis financial filings industry report 2026 "
        f"last {analysis_years} years {analysis_lens}"
    )
    encoded_query = urllib.parse.quote(query)
    jina_url = f"{JINA_SEARCH_BASE_URL}{encoded_query}"
    headers = {}
    if jina_api_key:
        headers["Authorization"] = f"Bearer {jina_api_key}"

    try:
        response = requests.get(
            jina_url,
            headers=headers,
            timeout=SEARCH_TIMEOUT_SECONDS,
        )
        if response.status_code == 401:
            return (
                "",
                "Jina Search returned 401 Unauthorized. The platform search key may need attention, "
                "or the user can switch to Perplexity Deep Research mode.",
            )
        if response.status_code >= 400:
            return "", f"Jina Search returned HTTP {response.status_code}: {response.text[:300]}"
        return response.text[:SEARCH_CONTEXT_CHARS], ""
    except requests.exceptions.RequestException as exc:
        return "", f"Jina Search request failed: {exc}"


def build_messages(
    target: str,
    analysis_years: int,
    analysis_lens: str,
    search_context: str = "",
    search_warning: str = "",
    language: str = "en",
):
    report_brief = (
        f"Research target: {target}\n"
        f"Lookback window: last {analysis_years} years\n"
        f"Primary analysis lens: {analysis_lens}\n\n"
        "Organize the output like a professional investment research product: "
        "ENTITY LOCK first, then three falsifiable judgments, evidence-backed lens analysis, "
        "thesis invalidation conditions, and a machine-readable monitor panel at the end."
    )

    # Serenity supply-chain bottleneck methodology
    serenity_instruction = ""
    if "Serenity" in analysis_lens or "bottleneck" in analysis_lens.lower():
        serenity_instruction = """\n\nApply the Serenity (@aleabitoreddit) supply-chain bottleneck analysis framework:

CORE PRINCIPLE: Don't buy the obvious "shovel seller" — trace the supply chain upstream to find the single chokepoint that a downstream buyer will pay anything to keep flowing. The further upstream and the smaller the market cap, the more underpriced the bottleneck.

ANALYSIS STRUCTURE:
1. Supply Chain Map: Map the full chain from end-demand (hyperscaler capex, AI infrastructure, etc.) down to raw materials/feedstock. Identify every hop.
2. Bottleneck Identification: At each hop, ask "if this layer stopped shipping, what breaks downstream, and is there a second source?" The fewer substitutes and bigger the downstream dependency, the better the asymmetry.
3. 14-Point Checklist:
   - Bottleneck? Is it sole/near-sole-source with pricing power?
   - Upstream & cheap? Small % of downstream BOM so buyers pay through?
   - Chain fluency? Can you map the exact BOM chain?
   - Demand driver? TAM expanding on AI/tech capex, not legacy market?
   - Contracts & counterparty? Signed multi-year, creditworthy tenant?
   - Real margins? GAAP margins support quality claim?
   - Financing quality? Any ATM/SBC overhang?
   - Stage? Pre-volume-ramp mispriced on TTM revenue?
   - Catalyst? Dated catalyst within tradable window?
   - Market cap headroom? Small enough for institutional re-rating?
   - Validation lag? Analyst coverage still behind supply-chain evidence?
   - Risk & sizing? How binary is it?
   - Macro overlay? Rate path / tariff / war regime help or hurt?
4. Key Metrics Dashboard: Market share, revenue/profit growth, valuation context, cash flow, competitive intensity, with data confidence levels.
5. Thesis Quality View: evidence-backed judgment quality, 3 black swan or grey rhino risks, invalidation conditions, and monitorable metrics. Do not output target prices, buy/sell ratings, position sizing, or portfolio allocation suggestions.

IMPORTANT: This is analysis, not financial advice. Never generate, place, or cancel trade orders. Present as a lens for asking better questions."""

    if search_context:
        user_content = (
            f"{report_brief}\n\n"
            "Below are public-source snippets returned by Jina AI real-time search. "
            "Prioritize this material, preserve verifiable sources, dates, and links, "
            "and clearly mark anything as an inference or needing verification when evidence is thin.\n\n"
            f"{search_context}\n\n"
            f"Generate a deep business report for: {target}.{serenity_instruction}"
        )
    elif search_warning:
        user_content = (
            f"{report_brief}\n\n"
            f"Real-time search failed: {search_warning}\n\n"
            "Generate a structurally complete business analysis report without fabricating current market data. "
            'For 2026 data, market share, news, or filings, clearly mark "Needs real-time verification".\n\n'
            f"Generate a deep business report for: {target}.{serenity_instruction}"
        )
    else:
        user_content = f"{report_brief}\n\nGenerate a deep business report for: {target}.{serenity_instruction}"

    lang_instruction = ""
    lang_names = {
        "zh-TW": "Traditional Chinese (繁體中文)",
        "zh-CN": "Simplified Chinese (简体中文)",
        "ja": "Japanese (日本語)",
        "ko": "Korean (한국어)",
        "es": "Spanish",
        "de": "German",
        "fr": "French",
        "en": "English",
    }
    if language and language != "en":
        lang_name = lang_names.get(language, language)
        lang_instruction = f"\n\nIMPORTANT: Write the ENTIRE report in {lang_name}. All section titles, analysis, evidence descriptions, and conclusions must be in {lang_name}."

    return [
        {"role": "system", "content": SYSTEM_PROMPT + lang_instruction},
        {"role": "user", "content": user_content},
    ]


def build_report_request(request: ReportRequest):
    target = validate_target(request.target)
    analysis_years = max(1, min(10, request.analysis_years))
    analysis_lens = request.analysis_lens.strip() if request.analysis_lens else "综合"
    api_key, base_url, model, report_mode = get_llm_config(request)
    search_context = ""
    search_warning = ""
    if report_mode == "jina_llm":
        request_jina_key = validate_header_value(
            clean_optional_text(request.jina_api_key),
            "Jina API Key",
        )
        search_context, search_warning = fetch_search_context(
            target,
            analysis_years,
            analysis_lens,
            validate_header_value(request_jina_key or JINA_API_KEY, "Jina API Key"),
        )
    return (
        api_key,
        base_url,
        model,
        build_messages(target, analysis_years, analysis_lens, search_context, search_warning, request.language or "en"),
        search_warning,
    )


# ──────────────────────────────────────────────
# Serenity Supply-Chain Analysis
# ──────────────────────────────────────────────

def load_serenity_references() -> dict[str, str]:
    """Load Serenity reference files from disk."""
    refs = {}
    for name in ["methodology.md", "theses.md", "track-record.md", "articles.md"]:
        path = os.path.join(SERENITY_REF_DIR, name)
        try:
            with open(path, encoding="utf-8") as f:
                refs[name] = f.read()
        except FileNotFoundError:
            refs[name] = ""
    return refs


SERENITY_SYSTEM_PROMPT = """You are Serenity's AI analytical assistant — a supply-chain bottleneck analyst modeled after @aleabitoreddit's methodology.

Your job: evaluate stocks through the lens of upstream supply-chain chokepoints, NOT through traditional fundamental or technical analysis alone.

CORE PRINCIPLE: Do not stop at the obvious "shovel seller" (NVDA). Trace the supply chain as far upstream as possible and identify single points of failure that downstream buyers depend on. The further upstream and less visible the node, the more likely the market narrative is incomplete.

ANALYSIS STRUCTURE:
1. Supply Chain Map — Map the full chain from end-demand (hyperscaler capex, AI infra) down to raw materials/feedstock. Identify every hop.
2. Bottleneck Identification — At each hop: "if this layer stopped shipping, what breaks downstream, and is there a second source?"
3. Serenity's 14-Point Checklist — Evaluate: Bottleneck?, Upstream & cheap?, Chain fluency?, Demand driver?, Contracts & counterparty?, Real margins?, Financing quality?, Stage?, Catalyst?, Market cap headroom?, Validation lag?, Risk & sizing?, Macro overlay?, Position?
4. Thesis Assessment — Cross-reference against Serenity's known theses and track record.
5. Thesis Quality View — evidence quality tier, bull/bear cases, invalidation conditions, and monitorable metrics. This tier evaluates the thesis, not whether to buy, sell, hold, size, or allocate.

CRITICAL RULES:
- This is DECISION-SUPPORT ONLY. Never auto-trade, never place orders.
- Never output target prices, buy/sell ratings, position sizing, portfolio weights, entry levels, stop levels, or personalized investment instructions.
- Always state disclaimers: self-reported returns, survivorship bias, thesis decay.
- Flag if Serenity has a known view on this ticker (check the theses provided).
- If Serenity never covered it, run the 14-point checklist on a fresh name.
- Write professionally, no emoji, evidence-led.
"""


def build_serenity_messages(
    ticker: str,
    mode: str,
    tickers: list[str] | None,
    refs: dict[str, str],
    language: str = "en",
    custom_prompt: str | None = None,
) -> list[dict[str, str]]:
    """Build messages for Serenity supply-chain analysis."""
    # Truncate theses to fit context window (keep first 30k chars)
    theses_context = refs.get("theses.md", "")[:30000]
    methodology_context = refs.get("methodology.md", "")[:15000]
    articles_context = refs.get("articles.md", "")[:8000]
    track_record_context = refs.get("track-record.md", "")[:8000]

    context = f"""
## Serenity's Known Theses (merged knowledge base)
{theses_context}

## Serenity's Methodology & 14-Point Checklist
{methodology_context}

## Serenity's Long-Form Articles
{articles_context}

## Serenity's Track Record & Calibration
{track_record_context}
"""

    lang_instruction = ""
    lang_names = {
        "zh-TW": "Traditional Chinese (繁體中文)",
        "zh-CN": "Simplified Chinese (简体中文)",
        "ja": "Japanese (日本語)",
        "ko": "Korean (한국어)",
        "es": "Spanish",
        "de": "German",
        "fr": "French",
        "en": "English",
    }
    if language and language != "en":
        lang_name = lang_names.get(language, language)
        lang_instruction = f"\n\nIMPORTANT: Write the ENTIRE analysis in {lang_name}."

    if mode == "portfolio" and tickers:
        user_content = (
            f"Analyze the following portfolio through Serenity's supply-chain lens:\n\n"
            f"Tickers: {', '.join(tickers)}\n\n"
            f"For each ticker:\n"
            f"1. Check if Serenity has a known thesis (reference the knowledge base below)\n"
            f"2. Map its position in the AI/semiconductor supply chain\n"
            f"3. Rate bottleneck strength (Strong / Moderate / Weak / None)\n"
            f"4. Flag agreements and conflicts with Serenity's views\n\n"
            f"Then provide a summary: which names have the strongest bottleneck thesis, "
            f"which are missing from the portfolio, and prioritized discussion list.\n\n"
            f"--- REFERENCE DATA ---\n{context}"
        )
    elif mode == "sector":
        user_content = (
            f"Form a forward sector view on the AI/semiconductor supply chain, "
            f"focusing on: {ticker}\n\n"
            f"Use Serenity's thematic threads: photonics/CPO, memory/HBM supercycle, "
            f"neocloud financing quality, power/grid, defense, AI-agent hardware.\n\n"
            f"Pull relevant theses from the knowledge base. Note leading indicators. "
            f"State the view with confidence level and dated evidence.\n\n"
            f"--- REFERENCE DATA ---\n{context}"
        )
    else:
        user_content = (
            f"Evaluate **{ticker}** through Serenity's supply-chain bottleneck lens.\n\n"
            f"Steps:\n"
            f"1. Look up {ticker} in Serenity's known theses below. Note his stance, conviction tier, how it evolved.\n"
            f"2. If he never covered it, run the 14-point checklist from methodology.md on this fresh name.\n"
            f"3. Map its position in the AI/semiconductor supply chain.\n"
            f"4. Sanity-check timeliness — flag if his view is dated.\n"
            f"5. Present: Serenity's view (if any), supply-chain read, bull/bear case, risks.\n\n"
            f"--- REFERENCE DATA ---\n{context}"
        )

    # Use custom prompt if provided, otherwise use default Serenity system prompt
    system_prompt = custom_prompt if custom_prompt else SERENITY_SYSTEM_PROMPT

    return [
        {"role": "system", "content": system_prompt + lang_instruction},
        {"role": "user", "content": user_content},
    ]


@app.post("/api/analyze_serenity")
async def analyze_serenity(request: SerenityRequest):
    ticker = request.ticker.strip().upper()
    if not ticker:
        raise HTTPException(status_code=400, detail="Enter a ticker symbol.")

    api_key = validate_header_value(clean_optional_text(request.api_key), "API Key")
    if not api_key:
        api_key = LLM_API_KEY
    if not api_key:
        raise HTTPException(status_code=400, detail="Enter your model API key.")

    base_url = clean_optional_text(request.base_url) or LLM_BASE_URL
    model = clean_optional_text(request.model) or LLM_MODEL
    language = request.language or "en"

    refs = load_serenity_references()
    tickers = request.tickers if request.mode == "portfolio" and request.tickers else None

    # Use custom skill_prompt if provided, otherwise use default Serenity prompt
    if request.skill_prompt:
        messages = build_serenity_messages(ticker, request.mode, tickers, refs, language, custom_prompt=request.skill_prompt)
    else:
        messages = build_serenity_messages(ticker, request.mode, tickers, refs, language)

    def stream():
        try:
            client = OpenAI(api_key=api_key, base_url=base_url)
            response = client.chat.completions.create(
                model=model,
                messages=messages,
                stream=True,
                max_tokens=16384,
            )
            for chunk in response:
                delta = chunk.choices[0].delta.content
                if delta:
                    yield delta
        except Exception as exc:
            yield f"\n\nAnalysis failed: {normalize_model_error(exc)}"

    return StreamingResponse(stream(), media_type="text/markdown; charset=utf-8")


@app.post("/api/generate_report")
async def generate_report(request: ReportRequest):
    validate_target(request.target)

    try:
        api_key, base_url, model, messages, search_warning = build_report_request(request)
        client = OpenAI(api_key=api_key, base_url=base_url)
        response = client.chat.completions.create(
            model=model,
            messages=messages,
            stream=False,
            max_tokens=16384,
        )
        report_content = response.choices[0].message.content
        if search_warning:
            report_content = f"> Search note: {search_warning}\n\n{report_content}"
        return {"status": "success", "data": report_content}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/api/generate_report_stream")
async def generate_report_stream(request: ReportRequest):
    validate_target(request.target)
    try:
        api_key, base_url, model, messages, search_warning = build_report_request(request)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    def stream_report():
        try:
            if search_warning:
                yield f"> Search note: {search_warning}\n\n"
            client = OpenAI(api_key=api_key, base_url=base_url)
            response = client.chat.completions.create(
                model=model,
                messages=messages,
                stream=True,
                max_tokens=16384,
            )
            for chunk in response:
                delta = chunk.choices[0].delta.content
                if delta:
                    yield delta
        except Exception as exc:
            yield f"\n\nReport generation failed: {exc}"

    return StreamingResponse(stream_report(), media_type="text/markdown; charset=utf-8")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)
