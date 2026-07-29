/**
 * SEC EDGAR Filing Search
 *
 * Hard rules:
 * 1. NEVER fabricate URLs — only use URLs returned by the SEC API
 * 2. If no results, return empty + reason (never invent data)
 * 3. Always return candidates for user selection (never auto-pick)
 */

import { ttlMemoize } from "./cache";
import { resolveEntity } from "./entity-resolution";

// ── Non-US Entity Detection ─────────────────────────────────────────────────

/**
 * Detect non-US tickers/exchanges that EDGAR cannot serve.
 * Returns a rejection reason if the query looks non-US, or null if it's likely US.
 */
const detectNonUsEntity = (
  query: string,
): { reason: string; exchange: string } | null => {
  const q = query.trim();

  // Hong Kong: 0700.HK, 9988.HK, etc.
  if (/^\d{1,5}\.HK$/i.test(q)) {
    return {
      reason: `"${query}" is a Hong Kong-listed ticker. SEC EDGAR only covers US-listed filers. Use HKEX 披露易 for HK filings.`,
      exchange: "HKEX",
    };
  }

  // A-share (Shanghai): 600011.SS, 600519.SH
  if (/^\d{6}\.(SS|SH)$/i.test(q)) {
    return {
      reason: `"${query}" is an A-share ticker. SEC EDGAR only covers US-listed filers. Use 巨潮 (CNINFO) for A-share filings.`,
      exchange: "SSE/SZSE",
    };
  }

  // A-share (Shenzhen): 000001.SZ
  if (/^\d{6}\.SZ$/i.test(q)) {
    return {
      reason: `"${query}" is an A-share ticker. SEC EDGAR only covers US-listed filers. Use 巨潮 (CNINFO) for A-share filings.`,
      exchange: "SZSE",
    };
  }

  // Korea: 000660.KS, 005930.KQ
  if (/^\d{6}\.(KS|KQ)$/i.test(q)) {
    return {
      reason: `"${query}" is a Korean-listed ticker. SEC EDGAR only covers US-listed filers.`,
      exchange: "KRX",
    };
  }

  // Japan: 7203.T, 9984.T
  if (/^\d{4,5}\.T$/i.test(q)) {
    return {
      reason: `"${query}" is a Japanese-listed ticker. SEC EDGAR only covers US-listed filers.`,
      exchange: "TSE",
    };
  }

  // London: VOD.L, HSBA.L
  if (/^[A-Z0-9]{2,5}\.L$/i.test(q)) {
    return {
      reason: `"${query}" is a London-listed ticker. SEC EDGAR only covers US-listed filers.`,
      exchange: "LSE",
    };
  }

  // Frankfurt: SAP.DE, BMW.DE
  if (/^[A-Z0-9]{2,5}\.DE$/i.test(q)) {
    return {
      reason: `"${query}" is a Frankfurt-listed ticker. SEC EDGAR only covers US-listed filers.`,
      exchange: "XETRA",
    };
  }

  return null;
};

// ── Types ───────────────────────────────────────────────────────────────────

export interface FilingCandidate {
  /** Filing type (10-K, 10-Q, 20-F, 6-K, etc.) */
  form: string;
  /** Filing date (YYYY-MM-DD) */
  filingDate: string;
  /** Period ending date (YYYY-MM-DD) */
  periodEnding: string;
  /** Primary document description */
  description: string;
  /** Real URL from SEC — NEVER fabricated */
  url: string;
  /** EDGAR accession number */
  accessionNumber: string;
  /** Source data provider */
  source: "sec_edgar";
  /** Company display name from SEC */
  companyName: string;
  /** CIK (Central Index Key) */
  cik: string;
}

export interface FilingSearchResult {
  ok: true;
  query: string;
  candidates: FilingCandidate[];
  totalResults: number;
  source: "sec_edgar";
}

export interface FilingSearchError {
  ok: false;
  query: string;
  reason: "no_results" | "api_error" | "invalid_query";
  message: string;
}

export type FilingSearchResponse = FilingSearchResult | FilingSearchError;

// ── Constants ───────────────────────────────────────────────────────────────

const EDGAR_USER_AGENT = "airesearch/1.0 (contact@airesearchs.com)";
const COMPANY_TICKERS_URL = "https://www.sec.gov/files/company_tickers.json";
const SUBMISSIONS_BASE = "https://data.sec.gov/submissions/CIK";
const EFTS_BASE = "https://efts.sec.gov/LATEST/search-index";

/** Filing types we consider "financial reports" */
const REPORT_FORMS = new Set([
  "10-K",
  "10-K/A",
  "10-Q",
  "10-Q/A",
  "20-F",
  "20-F/A",
  "6-K",
  "6-K/A",
]);

/** Priority for sorting: annual reports first, then quarterly, then others */
const FORM_PRIORITY: Record<string, number> = {
  "10-K": 0,
  "10-K/A": 1,
  "20-F": 2,
  "20-F/A": 3,
  "10-Q": 4,
  "10-Q/A": 5,
  "6-K": 6,
  "6-K/A": 7,
};

// ── Company Tickers Cache ───────────────────────────────────────────────────

interface CompanyTickerEntry {
  cik_str: number;
  ticker: string;
  title: string;
}

/**
 * Download and cache the full company tickers JSON from SEC.
 * This is ~4MB and changes infrequently — cache for 1 hour.
 */
const fetchCompanyTickers = async (): Promise<
  Map<string, CompanyTickerEntry[]>
> => {
  const response = await fetch(COMPANY_TICKERS_URL, {
    headers: {
      "User-Agent": EDGAR_USER_AGENT,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    throw new Error(
      `SEC company tickers fetch failed: ${response.status} ${response.statusText}`,
    );
  }

  const data = (await response.json()) as Record<string, CompanyTickerEntry>;

  // Build lookup: normalized name/ticker → entries
  const lookup = new Map<string, CompanyTickerEntry[]>();

  for (const entry of Object.values(data)) {
    const tickerKey = entry.ticker.toUpperCase();
    const nameKey = entry.title.toUpperCase();

    // Index by ticker
    const existing = lookup.get(tickerKey) ?? [];
    existing.push(entry);
    lookup.set(tickerKey, existing);

    // Also index by company name
    if (!lookup.has(nameKey)) {
      lookup.set(nameKey, [entry]);
    }
  }

  return lookup;
};

const cachedCompanyTickers = ttlMemoize(fetchCompanyTickers, {
  ttlMs: 60 * 60 * 1000, // 1 hour
  key: () => "company_tickers",
});

// ── Submissions Fetch ───────────────────────────────────────────────────────

interface SubmissionsResponse {
  name: string;
  tickers: string[];
  exchanges: string[];
  filings: {
    recent: {
      form: string[];
      filingDate: string[];
      accessionNumber: string[];
      primaryDocument: string[];
      primaryDocDescription: string[];
      reportDate: string[];
    };
  };
}

/**
 * Fetch recent filings for a company by CIK.
 * Returns only financial report forms (10-K, 10-Q, 20-F, 6-K + amendments).
 */
const fetchCompanyFilings = async (cik: number): Promise<FilingCandidate[]> => {
  const cikPadded = String(cik).padStart(10, "0");
  const url = `${SUBMISSIONS_BASE}${cikPadded}.json`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": EDGAR_USER_AGENT,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    if (response.status === 404) return [];
    throw new Error(
      `EDGAR submissions fetch failed for CIK ${cik}: ${response.status}`,
    );
  }

  const data = (await response.json()) as SubmissionsResponse;
  const recent = data.filings?.recent;
  if (!recent) return [];

  const candidates: FilingCandidate[] = [];

  for (let i = 0; i < recent.form.length; i++) {
    const form = recent.form[i];
    if (!form || !REPORT_FORMS.has(form)) continue;

    const accession = recent.accessionNumber[i];
    const primaryDoc = recent.primaryDocument[i];
    const filingDate = recent.filingDate[i];
    if (!accession || !primaryDoc || !filingDate) continue;

    // Construct URL from real API data — NEVER fabricate
    const accClean = accession.replace(/-/g, "");
    const filingUrl = `https://www.sec.gov/Archives/edgar/data/${cik}/${accClean}/${primaryDoc}`;

    candidates.push({
      form,
      filingDate,
      periodEnding: recent.reportDate?.[i] ?? "",
      description: recent.primaryDocDescription?.[i] ?? form,
      url: filingUrl,
      accessionNumber: accession,
      source: "sec_edgar",
      companyName: data.name,
      cik: String(cik),
    });
  }

  // Sort: annual reports first, then by date descending
  candidates.sort((a, b) => {
    const pa = FORM_PRIORITY[a.form] ?? 99;
    const pb = FORM_PRIORITY[b.form] ?? 99;
    if (pa !== pb) return pa - pb;
    return b.filingDate.localeCompare(a.filingDate);
  });

  return candidates;
};

// ── EFTS Full-Text Search ───────────────────────────────────────────────────

interface EftsHit {
  _source: {
    ciks: string[];
    display_names: string[];
    form: string;
    root_forms: string[];
    file_date: string;
    period_ending: string;
    adsh: string;
    file_type: string;
    file_description: string;
  };
}

interface EftsResponse {
  hits: {
    total: { value: number; relation: string };
    hits: EftsHit[];
  };
  aggregations?: {
    entity_filter?: {
      buckets: Array<{ key: string; doc_count: number }>;
    };
  };
}

/**
 * Search EDGAR filings by full-text query.
 * Uses the EFTS search-index API.
 */
const searchEfts = async (
  query: string,
  forms?: string[],
  startYear?: number,
  endYear?: number,
): Promise<FilingCandidate[]> => {
  const params = new URLSearchParams({ q: query });

  if (forms && forms.length > 0) {
    params.set("forms", forms.join(","));
  }

  if (startYear || endYear) {
    params.set("dateRange", "custom");
    params.set("startdt", `${startYear ?? 2020}-01-01`);
    params.set("enddt", `${endYear ?? new Date().getFullYear()}-12-31`);
  }

  const url = `${EFTS_BASE}?${params.toString()}`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": EDGAR_USER_AGENT,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`EFTS search failed: ${response.status}`);
  }

  const data = (await response.json()) as EftsResponse;

  // Deduplicate by accession number
  const seen = new Set<string>();
  const candidates: FilingCandidate[] = [];

  for (const hit of data.hits.hits) {
    const src = hit._source;
    const adsh = src.adsh;
    if (!adsh || seen.has(adsh)) continue;
    seen.add(adsh);

    // Only include report forms
    if (!REPORT_FORMS.has(src.form)) continue;

    const cikStr = src.ciks?.[0];
    if (!cikStr) continue;
    const cikNum = parseInt(cikStr, 10);
    const accClean = adsh.replace(/-/g, "");

    // For EFTS results, construct the filing index URL
    const filingIndexUrl = `https://www.sec.gov/Archives/edgar/data/${cikNum}/${accClean}/`;

    candidates.push({
      form: src.form,
      filingDate: src.file_date,
      periodEnding: src.period_ending ?? "",
      description: src.file_description ?? src.form,
      url: filingIndexUrl,
      accessionNumber: adsh,
      source: "sec_edgar",
      companyName: src.display_names?.[0] ?? "Unknown",
      cik: cikStr,
    });
  }

  // Sort by date descending
  candidates.sort((a, b) => b.filingDate.localeCompare(a.filingDate));

  return candidates;
};

// ── Main Search Function ────────────────────────────────────────────────────

export interface SearchFilingsOptions {
  /** Company name or ticker */
  query: string;
  /** Filter by form types (default: all report forms) */
  forms?: string[];
  /** Start year for date range filter */
  startYear?: number;
  /** End year for date range filter */
  endYear?: number;
  /** Max results to return (default: 20) */
  limit?: number;
  /** If true, use full-text search instead of company filing list */
  fullText?: boolean;
  /** Full-text search term (only used when fullText=true) */
  searchTerm?: string;
}

/**
 * Search for company filings from SEC EDGAR.
 *
 * HARD RULES:
 * 1. NEVER fabricate URLs — only URLs from SEC API
 * 2. No results → return empty + reason (never invent)
 * 3. Always return candidates for user selection
 */
export const searchFilings = async (
  options: SearchFilingsOptions,
): Promise<FilingSearchResponse> => {
  const {
    query,
    forms,
    startYear,
    endYear,
    limit = 20,
    fullText = false,
    searchTerm,
  } = options;

  if (!query?.trim()) {
    return {
      ok: false,
      query,
      reason: "invalid_query",
      message: "Provide a company name or ticker to search filings.",
    };
  }

  try {
    if (fullText && searchTerm) {
      // Full-text search mode: search across all EDGAR filings
      const candidates = await searchEfts(
        searchTerm,
        forms,
        startYear,
        endYear,
      );

      if (candidates.length === 0) {
        return {
          ok: false,
          query,
          reason: "no_results",
          message: `No EDGAR filings found matching "${searchTerm}" for "${query}". The company may not file with the SEC, or try a different search term.`,
        };
      }

      return {
        ok: true,
        query,
        candidates: candidates.slice(0, limit),
        totalResults: candidates.length,
        source: "sec_edgar",
      };
    }

    // ── Entity gate: reject non-US entities early ──
    const nonUs = detectNonUsEntity(query);
    if (nonUs) {
      return {
        ok: false,
        query,
        reason: "no_results",
        message: nonUs.reason,
      };
    }

    // ── Entity gate: resolve via Yahoo Finance first ──
    const entity = await resolveEntity(query);

    // If entity resolution found it's an industry/theme, not a company
    if (!entity.ok && entity.mode === "industry") {
      return {
        ok: false,
        query,
        reason: "no_results",
        message: `"${query}" looks like an industry/theme, not a company. SEC EDGAR filing search requires a specific company name or ticker.`,
      };
    }

    // If entity resolution has multiple candidates, pass them through
    // but still use the original query for EDGAR lookup
    const resolvedTicker = entity.ok ? entity.ticker : null;
    const resolvedName = entity.ok ? entity.companyName : null;

    // ── EDGAR lookup: use resolved entity name/ticker ──
    const tickers = await cachedCompanyTickers();
    const lookupKey = resolvedTicker ?? query.trim().toUpperCase();
    const normalizedLookup = lookupKey.toUpperCase();

    // Try exact ticker match first
    let matches = tickers.get(normalizedLookup) ?? [];

    // If no exact match, try the company name
    if (matches.length === 0 && resolvedName) {
      const nameKey = resolvedName.toUpperCase();
      matches = tickers.get(nameKey) ?? [];
    }

    // If still no match, try conservative substring (min 3 chars, ticker only)
    if (matches.length === 0 && normalizedLookup.length >= 3) {
      for (const [key, entries] of tickers) {
        // Only match if the lookup key starts with or equals the ticker
        // This prevents "0700.HK" matching "H" (Hyatt Hotels)
        if (
          key.length >= 2 &&
          (key === normalizedLookup ||
            (key.startsWith(normalizedLookup) &&
              normalizedLookup.length >= key.length / 2))
        ) {
          matches.push(...entries);
        }
      }
      // Deduplicate
      const seen = new Set<number>();
      matches = matches.filter((m) => {
        if (seen.has(m.cik_str)) return false;
        seen.add(m.cik_str);
        return true;
      });
    }

    if (matches.length === 0) {
      return {
        ok: false,
        query,
        reason: "no_results",
        message: entity.ok
          ? `No SEC EDGAR filings found for ${entity.companyName} (${entity.ticker}). The company may not file with the SEC.`
          : `No SEC EDGAR company found matching "${query}". The company may not be SEC-registered (e.g., A-share or HK-listed only).`,
      };
    }

    // ── Fetch filings for matched companies ──
    const fetchTargets =
      matches.length > 1 && matches.length <= 10
        ? matches.slice(0, 5)
        : [matches[0]!];

    const allCandidates: FilingCandidate[] = [];
    for (const match of fetchTargets) {
      const filings = await fetchCompanyFilings(match.cik_str);
      allCandidates.push(...filings);
    }

    if (allCandidates.length === 0) {
      return {
        ok: false,
        query,
        reason: "no_results",
        message: `Found ${matches.length} company/companies matching "${query}" but no financial filings available in EDGAR.`,
      };
    }

    // ── Result validation: filter out filings that don't match the resolved entity ──
    let validated = allCandidates;
    if (resolvedName) {
      const normalizedResolvedName = resolvedName.toUpperCase();
      validated = allCandidates.filter((f) => {
        const filingCompany = f.companyName.toUpperCase();
        // Exact match or filing company contains the resolved name
        return (
          filingCompany === normalizedResolvedName ||
          filingCompany.includes(normalizedResolvedName) ||
          normalizedResolvedName.includes(filingCompany)
        );
      });

      // If validation filtered everything, the entity is likely non-SEC
      if (validated.length === 0) {
        return {
          ok: false,
          query,
          reason: "no_results",
          message: `${resolvedName} (${resolvedTicker ?? query}) does not appear to file with SEC EDGAR. The company may be listed on a non-US exchange.`,
        };
      }
    }

    // Apply date and form filters
    let filtered = validated;
    if (startYear) {
      filtered = filtered.filter(
        (f) => parseInt(f.filingDate.substring(0, 4)) >= startYear,
      );
    }
    if (endYear) {
      filtered = filtered.filter(
        (f) => parseInt(f.filingDate.substring(0, 4)) <= endYear,
      );
    }
    if (forms && forms.length > 0) {
      const formSet = new Set(forms);
      filtered = filtered.filter((f) => formSet.has(f.form));
    }

    if (filtered.length === 0) {
      return {
        ok: false,
        query,
        reason: "no_results",
        message: `Found ${validated.length} filing(s) for ${resolvedName ?? query} but none match the specified filters (forms/date range).`,
      };
    }

    return {
      ok: true,
      query,
      candidates: filtered.slice(0, limit),
      totalResults: filtered.length,
      source: "sec_edgar",
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown EDGAR API error";
    return {
      ok: false,
      query,
      reason: "api_error",
      message: `EDGAR API error: ${message}`,
    };
  }
};

// ── Cached Version ──────────────────────────────────────────────────────────

const TEN_MINUTES = 10 * 60 * 1000;

export const cachedSearchFilings = ttlMemoize(searchFilings, {
  ttlMs: TEN_MINUTES,
  key: (opts) =>
    `${opts.query}|${(opts.forms ?? []).join(",")}|${opts.startYear ?? ""}|${opts.endYear ?? ""}|${opts.fullText ? "ft" : "co"}|${opts.searchTerm ?? ""}`,
});

// ── Filing Content Fetcher ──────────────────────────────────────────────────

export interface FilingPage {
  /** 1-indexed page number */
  pageNumber: number;
  /** Text content of this page */
  text: string;
  /** Character offset from start of document */
  charOffset: number;
}

export interface FilingContent {
  ok: true;
  url: string;
  /** Full text content */
  text: string;
  /** Page-indexed content (for page number anchors) */
  pages: FilingPage[];
  /** Whether this is a scanned PDF (needs OCR) */
  isScanned: boolean;
  /** Content type detected */
  contentType: "html" | "pdf" | "unknown";
}

export interface FilingContentError {
  ok: false;
  url: string;
  reason: "fetch_error" | "scanned_pdf" | "unsupported_format";
  message: string;
}

export type FilingContentResponse = FilingContent | FilingContentError;

/**
 * Fetch and parse filing content with page indexing.
 *
 * IMPORTANT: Does NOT store full text (copyright).
 * Only returns parsed content for analysis.
 */
export const fetchFilingContent = async (
  filingUrl: string,
): Promise<FilingContentResponse> => {
  try {
    const response = await fetch(filingUrl, {
      headers: {
        "User-Agent": EDGAR_USER_AGENT,
      },
      signal: AbortSignal.timeout(60_000),
    });

    if (!response.ok) {
      return {
        ok: false,
        url: filingUrl,
        reason: "fetch_error",
        message: `Failed to fetch filing: ${response.status} ${response.statusText}`,
      };
    }

    const contentType = response.headers.get("content-type") ?? "";
    const text = await response.text();

    // Detect scanned PDF (very basic heuristic)
    if (
      contentType.includes("pdf") ||
      filingUrl.toLowerCase().endsWith(".pdf")
    ) {
      // Check if it's a scanned PDF by looking for minimal text content
      const textDensity = text.replace(/\s/g, "").length / text.length;
      if (textDensity < 0.1) {
        return {
          ok: false,
          url: filingUrl,
          reason: "scanned_pdf",
          message:
            "This filing appears to be a scanned PDF (image-based). OCR processing is required to extract text. Use an OCR service to convert before analysis.",
        };
      }

      // For non-scanned PDFs, return with page markers
      return {
        ok: true,
        url: filingUrl,
        text,
        pages: [{ pageNumber: 1, text, charOffset: 0 }],
        isScanned: false,
        contentType: "pdf",
      };
    }

    // HTML content — parse and create page index
    const pages = indexHtmlPages(text);

    return {
      ok: true,
      url: filingUrl,
      text: stripHtml(text),
      pages,
      isScanned: false,
      contentType: "html",
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown fetch error";
    return {
      ok: false,
      url: filingUrl,
      reason: "fetch_error",
      message: `Failed to fetch filing content: ${message}`,
    };
  }
};

// ── HTML Helpers ────────────────────────────────────────────────────────────

/**
 * Strip HTML tags, preserving text content.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Index HTML content into pages.
 * Looks for common page-break patterns in EDGAR filings.
 */
function indexHtmlPages(html: string): FilingPage[] {
  // EDGAR filings often use page-break-before or <hr> for page separators
  const pageBreakPattern =
    /(<hr[^>]*style[^>]*page-break[^>]*>|<div[^>]*page-break[^>]*>)/gi;

  const text = stripHtml(html);
  const breaks: number[] = [];

  // Find page break positions in the HTML
  let match: RegExpExecArray | null;
  while ((match = pageBreakPattern.exec(html)) !== null) {
    const htmlBefore = html.substring(0, match.index);
    const textBefore = stripHtml(htmlBefore);
    breaks.push(textBefore.length);
  }

  // If no page breaks found, estimate pages by character count (~3000 chars per page)
  if (breaks.length === 0) {
    const CHARS_PER_PAGE = 3000;
    const pages: FilingPage[] = [];
    for (let i = 0; i < text.length; i += CHARS_PER_PAGE) {
      pages.push({
        pageNumber: pages.length + 1,
        text: text.substring(i, i + CHARS_PER_PAGE),
        charOffset: i,
      });
    }
    return pages;
  }

  // Build pages from break positions
  const pages: FilingPage[] = [];
  const positions = [0, ...breaks, text.length];

  for (let i = 0; i < positions.length - 1; i++) {
    const start = positions[i] ?? 0;
    const end = positions[i + 1] ?? text.length;
    pages.push({
      pageNumber: i + 1,
      text: text.substring(start, end),
      charOffset: start,
    });
  }

  return pages;
}

// ── Export for MCP tool ─────────────────────────────────────────────────────

export const cachedFetchFilingContent = ttlMemoize(fetchFilingContent, {
  ttlMs: TEN_MINUTES,
  key: (url) => url,
});
