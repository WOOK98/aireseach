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

JINA_API_KEY = os.getenv("JINA_API_KEY", "")
JINA_SEARCH_BASE_URL = os.getenv("JINA_SEARCH_BASE_URL", "https://s.jina.ai/")
SEARCH_TIMEOUT_SECONDS = int(os.getenv("SEARCH_TIMEOUT_SECONDS", "20"))
SEARCH_CONTEXT_CHARS = int(os.getenv("SEARCH_CONTEXT_CHARS", "12000"))

# Serenity reference files
SERENITY_REF_DIR = os.path.join(os.path.dirname(__file__), "references")


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


SYSTEM_PROMPT = """
You are a senior business intelligence analyst with deep expertise in company architecture, financial analysis, competitive strategy, and Nassim Taleb's concept of antifragility.

Generate a high-value Markdown business report for the user's target using current public market data, financial filings, news, and industry reports whenever retrieved context is available.

Think like a professional investment research product: build the evidence spine first, then develop the judgment. Start the report with:
- Core metrics dashboard: table with market share, revenue/profit growth, valuation or funding metrics, cash flow/asset quality, competitive intensity, and data confidence. If reliable data is unavailable, write "Needs verification" instead of inventing numbers.
- Evidence list: 5-8 key sources with date, full URL link, and the claim each source supports. Always include the complete URL (https://...) for each source so it can be rendered as a clickable link.
- Reading path: 3-5 bullets showing which risks or opportunities the reader should inspect first.

Then include exactly these four sections:

1. Market Share & Landscape
- Provide the latest verifiable market share for the company or segment when available, citing public filings or credible third-party research.
- Compare the top three to five industry players in a table, including strengths and weaknesses.

2. Competitive Analysis - Porter's Five Forces Extended
- Analyze direct competitors, potential entrants, substitutes, supplier power, and customer power.
- Identify durable moats such as technology, network effects, distribution, supply chain advantages, regulation, or switching costs.

3. Antifragility Assessment
- Do not confuse antifragility with resilience. Resilience means surviving shocks; antifragility means benefiting from volatility, disorder, or external shocks.
- Assess how the business performs under macro downturns, supply chain breaks, technology shifts, legal/regulatory pressure, and funding stress.
- Look for a barbell strategy: conservative core operations that preserve survival plus asymmetric, high-upside experiments at the edge.

4. Investment View & Risks
- Give a clear rating such as Strong Buy, Hold/Watch, Avoid, or High Risk.
- List three black swan or grey rhino risks over the next 12-24 months.
- Provide concrete portfolio allocation, market-entry, or strategic action suggestions.

Write in English by default. Be professional, analytical, critical, and evidence-led. Preserve source names, dates, and links when available.

When the research target is a publicly traded company or asset, include a "Technical Indicators" section with these classic indicators:
- **Moving Averages**: 50-day and 200-day MA positions, golden/death cross status
- **RSI (14)**: Current reading and overbought/oversold interpretation
- **MACD**: Signal line crossover direction and momentum
- **Bollinger Bands**: Position relative to bands, squeeze/expand status
- **Volume**: Recent volume trend vs average
Format each as a bullet with the indicator name, current value, and signal (bullish/bearish/neutral).
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
        "structured metrics and evidence first, then interpretation and judgment."
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
4. Key Metrics Dashboard: Market share, revenue/profit growth, valuation, cash flow, competitive intensity, with data confidence levels.
5. Investment View: Strong Buy / Hold/Watch / Avoid / High Risk, with 3 black swan risks and portfolio allocation suggestions.

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

CORE PRINCIPLE: Don't buy the obvious "shovel seller" (NVDA). Trace the supply chain as far upstream as possible and find the single point of failure that a hyperscaler will pay *anything* to keep flowing. The further upstream and the smaller the market cap, the more underpriced the chokepoint.

ANALYSIS STRUCTURE:
1. Supply Chain Map — Map the full chain from end-demand (hyperscaler capex, AI infra) down to raw materials/feedstock. Identify every hop.
2. Bottleneck Identification — At each hop: "if this layer stopped shipping, what breaks downstream, and is there a second source?"
3. Serenity's 14-Point Checklist — Evaluate: Bottleneck?, Upstream & cheap?, Chain fluency?, Demand driver?, Contracts & counterparty?, Real margins?, Financing quality?, Stage?, Catalyst?, Market cap headroom?, Validation lag?, Risk & sizing?, Macro overlay?, Position?
4. Thesis Assessment — Cross-reference against Serenity's known theses and track record.
5. Investment View — Strong Buy / Hold / Watch / Avoid / High Risk, with bull/bear cases.

CRITICAL RULES:
- This is DECISION-SUPPORT ONLY. Never auto-trade, never place orders.
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

    return [
        {"role": "system", "content": SERENITY_SYSTEM_PROMPT + lang_instruction},
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
    messages = build_serenity_messages(ticker, request.mode, tickers, refs, language)

    def stream():
        try:
            client = OpenAI(api_key=api_key, base_url=base_url)
            response = client.chat.completions.create(
                model=model,
                messages=messages,
                stream=True,
            )
            for chunk in response:
                delta = chunk.choices[0].delta.content
                if delta:
                    yield delta
        except Exception as exc:
            yield f"\n\nAnalysis failed: {exc}"

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
