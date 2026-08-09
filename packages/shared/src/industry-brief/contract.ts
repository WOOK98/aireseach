// ─── Industry Research Brief v1 — Shared Prompt Contract ─────────────────────
// Single source of truth for the Industry Research Brief methodology.
// Used by: API generator (industry-brief-generator.ts), web route (serenity/route.ts)
//
// Adapted from Guan-Yep/industry-research (MIT License)
// Original: https://github.com/Guan-Yep/industry-research
// License: https://github.com/Guan-Yep/industry-research/blob/main/LICENSE
//
// RED LINES:
// - No fabricated data. If unavailable, write "Data unavailable — [what to verify]".
// - No target prices, buy/sell ratings, or portfolio allocation.
// - Every quantitative claim needs a date, source, and confidence level.
// - Reports end with invalidation conditions, not price targets.

/**
 * Core methodology for Industry Research Brief v1.
 * Shared between API generator (JSON output) and web route (markdown output).
 */
export const INDUSTRY_BRIEF_METHODOLOGY = `
## INDUSTRY RESEARCH BRIEF — METHODOLOGY

You are producing an Industry Research Brief. This is a structured one-page industry overview that complements the universe table (constituent list). The brief answers: "What is this industry, how big is it, who competes, and what don't we know?"

### Source Priority (7-Tier Classification)
When citing data, classify sources into these tiers. Always prefer higher tiers.

| Tier | Source Type | Examples |
|------|------------|----------|
| 1 | Official government / regulator / statistical bureau / exchange | NBS, Eurostat, SEC, customs data, patent offices |
| 2 | Company filings / annual reports / prospectuses / earnings calls | 10-K, 20-F, IPO prospectus, investor day decks |
| 3 | Industry associations / standards organizations | SEMI, IFR, WSTS, IPC, IEEE |
| 4 | Research firms / consultancies / investment banks | Gartner, IDC, McKinsey, Goldman Sachs research |
| 5 | Credible trade media / databases | SemiEngineering, Bloomberg, S&P Capital IQ |
| 6 | Company websites / product documentation / interviews | Press releases, product pages, executive interviews |
| 7 | Secondary media summaries | News articles, blog posts, Wikipedia |

Mark data confidence: 🟢 Verified (Tier 1-2) | 🟡 Partial (Tier 3-5) | 🔴 Unverified (Tier 6-7 or inferred).

### Market Sizing Framework (TAM / SAM / SOM)
Apply both top-down and bottom-up approaches:

**Top-Down:**
Total Population / Total Market × Target Segment % × Penetration Rate × Average Spend = TAM

**Bottom-Up:**
Number of Active Players × Average Revenue per Player = Market Size

**Cross-Validation Rule:** If the gap between top-down and bottom-up exceeds 20%, investigate and explain the discrepancy. Present both estimates and the validated range.

| Layer | Definition | Calculation |
|-------|-----------|-------------|
| TAM | Total Addressable Market — if all potential customers bought | Population × Max Penetration × Average Spend |
| SAM | Serviceable Addressable Market — what you can actually reach | TAM × Geography / Channel / Segment Filter |
| SOM | Serviceable Obtainable Market — realistic 3-5 year capture | SAM × Expected Market Share (5-20%) |

### Growth Decomposition
Break growth into measurable drivers:
- Penetration rate change
- Purchase frequency change
- Average price change
- Retention / usage intensity change
- New segment entry

### Competitive Analysis Framework

**Concentration Metrics:**
| Metric | Formula | Interpretation |
|--------|---------|----------------|
| CR3 | Top 3 players' combined share | >60% = oligopoly; <40% = fragmented |
| CR5 | Top 5 players' combined share | >80% = highly concentrated |
| HHI | Sum of squared shares (×10,000) | <1,500 = competitive; 1,500-2,500 = moderate; >2,500 = concentrated |

Track CR3/CR5 trend: rising = consolidation, falling = fragmentation.

**Share Attribution (when share shifts occur):**
Share Change = Brand Effect + Channel Effect + Price Effect + Innovation Effect

### Evidence & Charts Rules
- Every quantitative claim needs a data table or structured evidence
- Minimum 2 data tables: (1) market size with years, (2) competitive share breakdown
- Each table gets an **assertive caption** — state the insight, not just the data type
  - ✅ "LSR market reaches $3.2B in 2025, driven by medical device demand"
  - ❌ "Market size table"
- Mark estimates explicitly: "estimated", "projected", "based on [source]"

### Consulting Narrative Style
Write in paragraph-level prose following: **Assertion → Evidence → Interpretation → Implication**
- Lead each section with the conclusion, then support with evidence
- Use specific numbers, not vague qualifiers
- Avoid bullet-point-only sections in the brief body
- Frameworks guide your thinking but should be invisible to the reader

### Quality Checklist (11 Items)
Before finalizing, verify:
1. ✅ Scope, geography, time range, and audience are clear
2. ✅ Key data points have sources or are marked as estimates
3. ✅ Market sizing uses both top-down and bottom-up
4. ✅ Cross-validation gap > 20% is explained
5. ✅ CR3/CR5/HHI are calculated with trend direction
6. ✅ Each table has an assertive caption
7. ✅ Sources are classified by 7-tier priority
8. ✅ Data confidence levels are marked (🟢🟡🔴)
9. ✅ Limitations section lists what's unavailable
10. ✅ Recommendations are tied to evidence, not generic
11. ✅ No fabricated data — "Data unavailable" for missing info
`.trim();

/**
 * Output structure for Industry Research Brief (markdown mode).
 * Used by serenity/route.ts for streaming markdown output.
 */
export const INDUSTRY_BRIEF_OUTPUT_STRUCTURE = `
## OUTPUT STRUCTURE — INDUSTRY RESEARCH BRIEF

Produce these sections in order:

### 1. INDUSTRY DEFINITION & BOUNDARY
- What this industry/theme is and isn't
- Key sub-segments and their boundaries
- Geographic scope of this analysis
- Why this matters now (demand drivers, inflection points)

### 2. VALUE CHAIN MAP
- From end-demand to upstream raw materials
- Key listed players per layer with: ticker, exchange, role description
- Bottleneck assessment per layer: strong / moderate / weak / none
- "If this layer stopped shipping, what breaks downstream?"

### 3. MARKET SIZING
- TAM / SAM / SOM with both top-down and bottom-up estimates
- Historical market size table: Year | Size | Growth Rate | Source
- Growth drivers decomposition
- Cross-validation note (if gap > 20%)

### 4. COMPETITIVE LANDSCAPE
- CR3, CR5, HHI with trend direction
- Market share table: Player | Share | YoY Change | Source
- Share attribution if a recent shift occurred
- Key competitive dynamics narrative

### 5. EVIDENCE TABLES
- Minimum 2 structured data tables
- Each with assertive caption, data, and source column
- Market size trend table + competitive share table

### 6. SOURCES & CONFIDENCE
- All sources listed with 7-tier classification
- Each claim mapped to a source
- Confidence levels: 🟢 Verified | 🟡 Partial | 🔴 Unverified

### 7. LIMITATIONS & DATA GAPS
- What data was unavailable and why
- What assumptions were made
- What requires independent verification

### 8. FOLLOW-UP CANDIDATES
- 3-6 listed companies deserving single-stock deep dive
- Each with: ticker, exchange, one-line reason
`.trim();

/**
 * JSON output instructions for the API generator.
 * Appended to INDUSTRY_BRIEF_METHODOLOGY when generating structured JSON.
 */
export const INDUSTRY_BRIEF_JSON_INSTRUCTIONS = `
## OUTPUT FORMAT

Return ONLY valid JSON matching this exact schema. No markdown, no commentary, no code fences.

{
  "definition": "string — what this industry is, key sub-segments, why it matters now",
  "valueChain": [
    {
      "layer": "string — e.g. End Demand, Midstream, Upstream",
      "description": "string",
      "keyPlayers": [{ "ticker": "string", "name": "string", "exchange": "string", "role": "string" }],
      "bottleneckStrength": "strong | moderate | weak | none"
    }
  ],
  "marketSizing": {
    "tam": { "label": "Total Addressable Market", "value": "string", "methodology": "top-down | bottom-up | both", "source": "string", "confidence": "verified | partial | unverified" },
    "sam": { "label": "Serviceable Addressable Market", "value": "string", "methodology": "top-down | bottom-up | both", "source": "string", "confidence": "verified | partial | unverified" },
    "som": { "label": "Serviceable Obtainable Market", "value": "string", "methodology": "top-down | bottom-up | both", "source": "string", "confidence": "verified | partial | unverified" },
    "crossValidationNote": "string — optional, explain if gap > 20%"
  },
  "marketSizeHistory": [{ "year": "string", "size": "string", "growthRate": "string", "source": "string" }],
  "competition": {
    "cr3": "string | null",
    "cr5": "string | null",
    "hhi": "string | null",
    "trend": "consolidating | fragmenting | stable | unknown",
    "shareAttribution": { "brand": "string", "channel": "string", "price": "string", "innovation": "string" }
  },
  "shareBreakdown": [{ "player": "string", "ticker": "string", "share": "string", "change": "string", "source": "string" }],
  "sources": [{ "name": "string", "tier": 1-7, "tierLabel": "string", "url": "string", "claim": "string", "date": "string", "confidence": "verified | partial | unverified" }],
  "limitations": ["string"],
  "followUpCandidates": [{ "ticker": "string", "name": "string", "exchange": "string", "reason": "string" }]
}

ADDITIONAL RULES FOR JSON OUTPUT:
- Never fabricate tickers. Only use companies from the provided universe data.
- CR3/CR5: calculate from share breakdown if available, or set to null.
- Market sizing: use both top-down and bottom-up when possible. Cross-validate.
`.trim();
