---
name: deep-dive
description: >
  Generate a full six-lens equity research report on any stock or ticker.
  Use this skill whenever the user asks for a deep dive, full analysis,
  research report, due diligence, a thesis review,
  or any substantive opinion on a listed company — even if they don't say
  "report". Covers six lenses in one pass: Supply Chain, Fundamentals, Macro,
  Technicals, Sentiment, and Risk Matrix. For quick one-screen reads, prefer
  the snapshot skill instead. Decision-support only — never places orders.
---

# Deep Dive — Six-Lens Equity Research Report

Produce ONE integrated report covering ALL SIX lenses below, in this order.
The user does not pick lenses — every Deep Dive includes all of them. Each
lens has a methodology file in `references/`; read the relevant file(s)
before writing that section.

| # | Section | Reference file | Target length |
|---|---------|----------------|---------------|
| 1 | Supply Chain & Value Flow | `references/supply-chain.md` | 300–500 words |
| 2 | Fundamentals | `references/fundamentals.md` | 250–400 words |
| 3 | Macro Context | `references/macro.md` | 150–300 words |
| 4 | Technicals | `references/technicals.md` | 150–250 words |
| 5 | Sentiment & Positioning | `references/sentiment.md` | 150–250 words |
| 6 | Risk Matrix & Conviction | `references/risk-matrix.md` | 250–400 words |

## Workflow

### Step 0 — Entity Resolution Gate (MANDATORY, blocks everything else)

Before ANY analysis, resolve the input to exactly ONE verified listed
entity. This gate exists because the single worst failure mode of
multi-lens research is each lens silently guessing a different company.

1. **Verify the ticker exists.** If the `airesearch-data` MCP server is
   connected, call its `resolve_entity` tool — it returns either one
   verified entity (with an entity-lock block) or candidates. Otherwise,
   web-search the input as a ticker symbol and confirm it resolves to a
   currently listed security. "Looks like a ticker" is not verification —
   confirm against a quote page or filing.
2. **If the input is NOT a valid ticker** (a material, industry, product,
   or brand name — e.g. "Liquid Silicone Rubber"), DO NOT coerce it into
   the nearest-looking symbol and DO NOT let any lens guess. Instead:
   - If plausible ticker candidates exist, STOP and ask the user which
     entity they mean, listing candidates with full names and exchanges.
   - If the input is an industry/material/theme, offer Industry Mode
     (below) instead of forcing the single-stock framework.
3. **Emit an Entity Block** and treat it as immutable for the rest of the
   report:

   ```
   ENTITY: <TICKER> — <full legal name> (<exchange>)
   SECTOR: <sector / industry>
   MKT CAP: <value, as-of date>
   ```

4. **Ambiguous symbols** (multiple listings, e.g. "SOI"): resolve to one
   and state the choice in the Entity Block; never analyze a blend.

### Steps 1–4

1. **Gather current data** for the Entity Block company only. Prefer the
   `airesearch-data` MCP tools when connected: `get_quote`,
   `get_financials` (GAAP fundamentals), `get_technicals` (real computed
   indicators). Use web search for news/filings/contracts, analyst
   coverage, and anything the tools don't cover — and as the full
   fallback when the MCP server is not connected. Never rely on training
   data for prices or recent quarters — theses decay.
2. **Run the six lenses.** Read each reference file, apply it, write the
   section. If subagents are available (Claude Code), you MAY fan out
   lenses 1–5 as parallel subagents — but every subagent prompt MUST begin
   with the verbatim Entity Block and the instruction "analyze ONLY this
   entity; do not re-resolve the ticker; if your lens lacks data for this
   entity, say so rather than substituting a similar company." Lens 6
   (Risk Matrix) must be written LAST by the main agent because it
   integrates the other five.
3. **Reconciliation check (before publishing).** Re-read all six sections
   and verify every company name and ticker mentioned as the subject
   matches the Entity Block. Any section referring to a different entity
   must be rewritten before the report is delivered — never publish and
   caveat.
4. **Write the verdict.** End with a Conviction Summary (see Output format).

## Industry Mode (theme / industry / material queries)

When the input is NOT a valid ticker — it's an industry, material, product
area, or multi-word theme (e.g. "Humanoid robot", "liquid silicone rubber",
"HBM", "grid transformers") — use Industry Mode instead of forcing the
single-stock framework.

### Data source: ETF holdings (preferred)

Theme ETFs are professionally curated lists of listed companies for a
theme, with portfolio weights. If the `airesearch-data` MCP server is
connected:

1. Call `resolve_entity` on the theme query. If it returns candidates with
   `quoteType === "ETF"`, those are theme ETFs.
2. Call `get_etf_holdings` for up to 3 ETF candidates. Each returns
   `{ symbol, name, weightPct }[]`.
3. Merge holdings across ETFs:
   - Track each constituent's average portfolio weight across ETFs.
   - Track consensus: how many of the theme ETFs hold each name.
   - Sort by consensus descending, then weight descending. Take top 20.
4. The merged list IS the constituent universe. Every company in the
   report must come from this list or from the provided search context —
   never from memory alone.

If no ETF candidates exist or `get_etf_holdings` returns empty, fall back
to web-search-only mode (below).

### Web-search-only fallback

When the MCP server is not connected or no theme ETFs are available, use
web search to identify key listed players. Be explicit in the report:
"Constituent list derived from web search — no theme-ETF holdings data
available." Only name companies that appear in the search results; never
from memory alone.

### Cross-market expansion (A-shares / H-shares)

US theme ETFs rarely hold A-shares, so a US-ETF-only universe silently
drops the China-listed leg of most value chains. After building the
primary constituent table, run one expansion pass:

1. For each chain layer, search for A-share / H-share listed peers
   (sources: China-listed theme ETF or index constituent lists, HKEX/
   CNINFO filings, financial-media coverage). Same sourcing rule applies:
   every name must come from holdings data or a citable search result —
   never from memory. Tag each with exchange (SSE/SZSE/HKEX) and how it
   was sourced.
2. Where the data layer resolves the ticker (e.g. `0700.HK`, `600xxx.SS`),
   pull real multiples and add a **cross-market valuation gap** table:
   same-layer US peer vs A/H peer, same multiple, both period-labeled.
   State the gap as a fact ("trades at 18x TTM vs US peer 45x, a 60%
   discount") and explain the *structural reasons* for it (liquidity,
   capital controls, governance premium, index inclusion) — this is
   analysis, not a rating.
3. Never write "undervalued, should buy". The compliant form is:
   discount/premium size + period labels + candidate reasons + what would
   close the gap (catalyst) + what keeps it open (risk). Deep Dive offers
   may include A/H names on equal footing with US names.
4. If no sourced A/H peer exists for a layer, say so — an honest "no
   listed A-share pure play found in sources" beats a from-memory guess.

### Output

Produce:

(a) **Value chain map** of the industry (Lens 1 methodology applied to the
    sector) — upstream, midstream, downstream layers.
(b) **Constituent table**: key LISTED players per chain layer with tickers,
    exchanges, market caps, and (when available) avg portfolio weight and
    ETF consensus.
(c) **Bottleneck analysis**: which layers show bottleneck dynamics
    (sole-source, pricing power, small % of downstream BOM).
(d) **Cross-market valuation gap** (when A/H peers resolve in the data
    layer): same-layer, same-multiple, period-labeled comparison with
    structural discount/premium reasons.
(e) **Deep Dive offer**: suggest 2–3 constituents worth a full six-lens
    Deep Dive, with a one-line reason for each.

### Hard rules for Industry Mode

- The constituent universe is the ONLY source of company names. Do not
  add companies from memory.
- Do NOT output per-stock technicals, price targets, entry/stop levels,
  or conviction tiers — those require a single-stock Deep Dive.
- If the theme has no ETF data AND no search results, say so. Never
  fabricate a player list.

## Optional focus argument

If the user asks for a single lens (e.g. "/airesearch:deep-dive NVDA risk" or "just
the supply chain view"), produce only that section at 2–3x its target
length, plus the one-line disclaimer. Valid focus values: `supply-chain`,
`fundamentals`, `macro`, `technicals`, `sentiment`, `risk`.

## Output format

- Respond in the user's language; keep tickers, metric names, and section
  data labels in English.
- Structure:
  1. **ENTITY LOCK** (from the resolved entity block; unchanged).
  2. **Three Falsifiable Judgments** — exactly three. Each judgment must
     include one direct sentence, one numeric anchor, supporting evidence,
     and `Wrong if:` with a numeric trigger. No number, no judgment.
  3. The six lens sections with `##` headers, in the table order above.
     Each lens must end with:
     - `Lens judgment:` one numeric, falsifiable conclusion.
     - `How to read this number:` source, measurement basis, timestamp/date,
       and known blind spot.
  4. **Thesis Invalidation Conditions** — 2–4 observable signals that would
     force the thesis to be rechecked. These are not recommendations.
  5. **Monitor Panel** — a 3–6 row table:
     `Metric | Current value | Trigger line | Tolerance | Check frequency | Data source`
  6. A machine-readable monitor JSON block:

     ```json
     {
       "schema_version": 1,
       "monitors": [
         {
           "metric": "string",
           "current": "string",
           "trigger": "string",
           "tolerance": "string",
           "freq": "Daily | Weekly | Quarterly | Event-driven",
           "source": "string"
         }
       ]
     }
     ```

  7. **Conviction Tier** — S/A/B/C/D/F as a thesis-quality score only:
     evidence completeness and logical closure, not whether to buy, sell,
     hold, size, or allocate.
  8. **Disclaimer**.
- Every quantitative claim gets a date or period attached ("Q1 FY26",
  "as of 2026-07-03"). Distinguish facts from estimates from opinion.
- Close with one line: *Decision-support analysis, not financial advice.
  Verify prices and fundamentals before acting.*

## Hard rules

- Never fabricate financial figures. If a number can't be verified, say so.
- Fabricating price levels, indicator values (RSI, MACD), support/
  resistance, or entry/stop prices is a CRITICAL failure — worse than an
  empty section. Any section that cannot source real current data must
  say "insufficient data — section withheld" instead of estimating.
- Never analyze an entity that was not confirmed through the Entity
  Resolution Gate; never substitute a similarly-named company.
- GAAP first; if citing non-GAAP, name the excluded items.
- Never present the report as a trade instruction and never execute,
  place, or cancel orders under any circumstances.
- Never output target prices, buy/sell ratings, entry levels, stop levels,
  portfolio weights, position sizing, or personalized investment instructions.
