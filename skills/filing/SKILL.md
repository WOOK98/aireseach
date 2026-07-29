---
name: filing
description: >
  Search and analyze SEC EDGAR filings (10-K, 10-Q, 20-F, 6-K) for any
  US-listed company. Use when the user asks for a company's annual report,
  quarterly filing, earnings release, or any SEC document. Supports two
  modes: Mode A (user provides a filing URL directly) and Mode B (user
  provides a company name → search candidates → user selects → analyze).
  Every numeric claim cites a page number (p.NN) linking back to the
  original filing. Only covers US-listed filers; non-US tickers are
  rejected with a clear reason and exchange hint.
version: 0.5.0
---

# Filing — SEC EDGAR Document Search & Analysis

Search for and analyze SEC filings from US-listed companies. Every numeric
claim cites a page number (`p.NN`) linking back to the original document.

## Scope

**Supported**: US-listed filers on SEC EDGAR (10-K, 10-Q, 20-F, 6-K + amendments)
**Not supported**: Hong Kong (HKEX), A-share (CNINFO), or other non-US exchanges

Non-US tickers are rejected at the entity gate with a clear reason and
exchange hint. The skill MUST pass this guidance through to the user
verbatim — never say "no reports found" when the real reason is
"SEC EDGAR only covers US-listed filers."

## Two Modes

### Mode A — Direct Filing (user provides URL or file)

When the user provides a filing URL or document directly:

1. Validate the URL is a SEC domain (`sec.gov`, `efts.sec.gov`, `data.sec.gov`)
2. Call `fetch_filing_content` to parse the document
3. If `isScanned: true` → tell user OCR is required, do not analyze
4. Analyze with page-number anchors (see Output Format below)

### Mode B — Search & Select (user provides company name)

When the user provides a company name or ticker:

1. **Entity Gate** (MANDATORY):
   - Call `search_filings` with the query
   - If the response is `ok: false` with a non-US reason → pass the
     guidance message through VERBATIM to the user. Include the exchange
     hint (e.g., "Use HKEX 披露易 for HK filings"). Do NOT say "no
     reports found" — that hides the real reason.
   - If candidates are returned → proceed to step 2

2. **Candidate Selection**:
   - Present candidates to the user: form type, filing date, period ending
   - Default-highlight the most recent filing of the requested type
   - **Wait for user to confirm selection** — never auto-pick
   - If user says "latest" or "newest", use the first candidate

3. **Fetch & Analyze**:
   - Call `fetch_filing_content` with the selected filing URL
   - If `isScanned: true` → tell user OCR is required
   - Analyze with page-number anchors (see Output Format below)

## MCP Tools

### `search_filings`

Search SEC EDGAR for company filings.

**Parameters:**
- `query` (string, required): Company name or ticker
- `forms` (string[]): Filter by form types, e.g. `["10-K"]`, `["10-Q"]`
- `startYear` / `endYear` (number): Date range filter
- `limit` (number): Max results (default: 20)

**Returns:** `{ ok: true, candidates[], totalResults }` or
`{ ok: false, reason, message }`

For non-US queries, the response includes an exchange hint:
```
{ ok: false, reason: "no_results",
  message: "\"0700.HK\" is a Hong Kong-listed ticker. SEC EDGAR only
  covers US-listed filers. Use HKEX 披露易 for HK filings." }
```

### `fetch_filing_content`

Fetch and parse a filing's content with page indexing.

**Parameters:**
- `url` (string, required): Filing URL from `search_filings` (SEC only)

**Returns:** `{ ok: true, text, pages[], isScanned, contentType }` or
`{ ok: false, reason, message }`

## Output Format

Every filing analysis produces:

### 1. Filing Summary

```
FILING: NVIDIA CORP 10-K (FY2025)
PERIOD: Ending Jan 26, 2025
FILED: Feb 26, 2025
SOURCE: SEC EDGAR (p.1–87)
```

### 2. Key Changes

3–5 significant changes from the filing, each with:
- What changed
- Why it matters
- Page reference (e.g., "p.35")

### 3. Financial Highlights

Key metrics extracted from the filing, each with:
- Metric name + value + period
- YoY/QoQ change
- Page reference

### 4. Three Falsifiable Judgments

Exactly three `topJudgments`, each with:
- `judgment` — one falsifiable thesis sentence
- `keyNumber` — numeric anchor from the filing
- `wrongIf` — numeric condition that invalidates the judgment
- `dataPoint` — source + page reference (e.g., "10-K FY2025 p.35")

### 5. Risk Factors

Top risks from the filing, each with severity and page reference.

### 6. Thesis Invalidation Conditions

2–4 observable signals that would force the thesis to be rechecked.

### 7. Monitor Panel

3–6 row table: `Metric | Current | Trigger | Tolerance | Freq | Source`

Plus machine-readable JSON:

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

### 8. Conviction Tier

S/A/B/C/D/F — thesis quality score only (evidence completeness and
logical closure), not a buy/sell recommendation.

## L3 Ledger Integration

Top judgments from filing analysis are logged to the L3 Ledger via
`autoInsertLedgerJudgments`, same as the existing report flow.

## Scanned PDF Handling

If `isScanned: true`:
- Do NOT attempt to analyze the content
- Return: "This filing is a scanned PDF (image-based). OCR processing is
  required to extract text. Please use an OCR service to convert the
  document to text first."
- Do NOT guess or infer content from the filing title/type

## Hard Rules

1. **Never fabricate URLs** — only URLs from SEC API responses
2. **Always return candidates** — never auto-pick; highlight latest but
   user confirms
3. **Page-number anchors** — every `dataPoint` cites `p.XX` from the filing
4. **Scanned PDF → OCR required** — do not guess content
5. **No full-text storage** — copyright compliance; only parsed results
6. **Non-US guidance is verbatim** — pass through the exchange hint from
   `search_filings`, never replace with generic "no reports found"
7. **Never use web search as fallback** for filing data — web search
   returns secondary sources, not primary filings
8. **Never output target prices, buy/sell ratings, entry levels, stop
   levels, portfolio weights, or position sizing**

## Examples

### Mode B: NVDA Annual Report

```
User: /airesearch:filing NVDA

→ search_filings({ query: "NVDA", forms: ["10-K"], limit: 5 })
→ Returns 6 candidates, latest: 10-K FY2025 (filed 2026-02-25)

Present to user:
  1. 10-K | 2026-02-25 | FY2025 (Jan 26, 2025)  ← highlighted
  2. 10-K | 2025-02-26 | FY2024 (Jan 28, 2024)
  3. 10-K | 2024-02-21 | FY2023 (Jan 29, 2023)
  ...

User confirms #1
→ fetch_filing_content({ url: "https://www.sec.gov/Archives/..." })
→ Analyze with page anchors
→ Output with "Revenue $130.5B (p.35)" style citations
```

### Non-US Rejection: 0700.HK

```
User: /airesearch:filing 0700.HK

→ search_filings({ query: "0700.HK" })
→ Returns: { ok: false, reason: "no_results",
    message: "\"0700.HK\" is a Hong Kong-listed ticker. SEC EDGAR only
    covers US-listed filers. Use HKEX 披露易 for HK filings." }

Output to user:
  ❌ SEC EDGAR does not cover 0700.HK (Tencent Holdings).

  This ticker is listed on the Hong Kong Stock Exchange (HKEX).
  SEC EDGAR only covers US-listed filers.

  For HK filings, use HKEX 披露易 (hkexnews.hk).

  [Do NOT say "no reports found" or offer web search as fallback]
```
