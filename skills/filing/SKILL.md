---
name: filing
description: >
  Search and analyze SEC EDGAR filings (10-K, 10-Q, 20-F, 6-K) for any
  US-listed company. Use when the user asks for a company's annual report,
  quarterly filing, earnings release, or any SEC document. Returns real filing
  URLs with page-number anchored analysis. Only covers US-listed filers;
  non-US tickers (HK, A-share, etc.) are rejected with a clear reason.
version: 0.5.0
---

# Filing Search & Analysis — SEC EDGAR

Search for and analyze SEC filings from US-listed companies. Every numeric
claim cites a page number (`p.NN`) linking back to the original document.

## Scope

**Supported**: US-listed filers on SEC EDGAR (10-K, 10-Q, 20-F, 6-K + amendments)
**Not supported**: Hong Kong (HKEX), A-share (CNINFO), or other non-US exchanges

Non-US tickers are rejected at the entity gate with a clear reason and exchange hint.

## Flow

```
User: "NVDA 最新年报"
  ↓ search_filings(query: "NVDA", forms: ["10-K"], limit: 5)
  ↓ Returns candidates with real SEC URLs
  ↓ User selects one (default highlight: latest)
  ↓ fetch_filing_content(url: "https://www.sec.gov/...")
  ↓ Page-indexed text extraction
  ↓ Analysis with page-number anchors in every dataPoint
```

## Hard Rules

1. **Never fabricate URLs** — only URLs from SEC API responses
2. **Always return candidates** — never auto-pick; highlight latest but user confirms
3. **Page-number anchors** — every `dataPoint` cites `p.XX` from the filing
4. **Scanned PDF → OCR required** — return `isScanned=true`, do not guess content
5. **No full-text storage** — copyright compliance; only parsed results cached

## MCP Tools

### `search_filings`

Search SEC EDGAR for company filings.

| Parameter   | Type     | Required | Description                                    |
| ----------- | -------- | -------- | ---------------------------------------------- |
| `query`     | string   | ✅       | Company name or ticker (e.g., "NVDA", "Apple") |
| `forms`     | string[] |          | Filter: ["10-K"], ["10-Q"], ["20-F"], etc.     |
| `startYear` | number   |          | Start year filter (e.g., 2023)                 |
| `endYear`   | number   |          | End year filter (e.g., 2025)                   |
| `limit`     | number   |          | Max results (default: 20)                      |

**Returns**: `{ ok, candidates[], totalResults, source }` or `{ ok: false, reason, message }`

### `fetch_filing_content`

Fetch and parse a filing's content with page indexing.

| Parameter | Type   | Required | Description                               |
| --------- | ------ | -------- | ----------------------------------------- |
| `url`     | string | ✅       | Filing URL from search_filings (SEC only) |

**Returns**: `{ ok, text, pages[], isScanned, contentType }` or `{ ok: false, reason, message }`

## Three Judgments + Invalidation Conditions

Every filing analysis produces exactly three `topJudgments`, each with:

- `judgment` — one falsifiable thesis sentence
- `keyNumber` — numeric anchor from the filing
- `wrongIf` — numeric condition that invalidates the judgment
- `dataPoint` — source + page reference (e.g., "10-K FY2025 p.35")

## L3 Ledger Integration

Top judgments from filing analysis are logged to the L3 Ledger via
`autoInsertLedgerJudgments`, same as the existing report flow.

## Scanned PDF Handling

If `isScanned: true`:

- Do NOT attempt to analyze the content
- Return a clear message: "This filing is a scanned PDF. OCR processing is required."
- Suggest the user convert via OCR service before analysis

## Examples

### Annual Report Search

```
User: "Apple 10-K"
→ search_filings({ query: "Apple", forms: ["10-K"], limit: 5 })
→ Returns: 10-K filings for Apple Inc. (AAPL, CIK 0000320193)
```

### Non-US Rejection

```
User: "腾讯 10-K"
→ search_filings({ query: "0700.HK" })
→ Returns: { ok: false, reason: "no_results", message: "0700.HK is a Hong Kong-listed ticker. SEC EDGAR only covers US-listed filers. Use HKEX 披露易 for HK filings." }
```

### Filing Analysis

```
→ fetch_filing_content({ url: "https://www.sec.gov/Archives/edgar/data/..." })
→ Returns: { ok: true, text: "...", pages: [...], isScanned: false, contentType: "html" }
→ Analysis output includes: "Revenue grew 30% (p.35)" with page anchor
```
