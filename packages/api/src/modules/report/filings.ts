/**
 * SEC EDGAR Filing Search
 *
 * Hard rules:
 * 1. NEVER fabricate URLs — only use URLs returned by the SEC API
 * 2. If no results, return empty + reason (never invent data)
 * 3. Always return candidates for user selection (never auto-pick)
 */

import { ttlMemoize } from "./cache";

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

    // Company filing list mode: resolve company → CIK → filings
    const tickers = await cachedCompanyTickers();
    const normalizedQuery = query.trim().toUpperCase();

    // Try exact ticker match first
    let matches = tickers.get(normalizedQuery) ?? [];

    // If no ticker match, try fuzzy name search
    if (matches.length === 0) {
      for (const [key, entries] of tickers) {
        if (key.includes(normalizedQuery) || normalizedQuery.includes(key)) {
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
        message: `No SEC EDGAR company found matching "${query}". The company may not be SEC-registered (e.g., A-share or HK-listed only).`,
      };
    }

    // If multiple companies match, fetch filings for each
    if (matches.length > 1 && matches.length <= 10) {
      const allCandidates: FilingCandidate[] = [];
      for (const match of matches.slice(0, 5)) {
        const filings = await fetchCompanyFilings(match.cik_str);
        allCandidates.push(...filings);
      }

      if (allCandidates.length === 0) {
        return {
          ok: false,
          query,
          reason: "no_results",
          message: `Found ${matches.length} company/companies matching "${query}" but no financial filings available.`,
        };
      }

      // Apply date filters
      let filtered = allCandidates;
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

      return {
        ok: true,
        query,
        candidates: filtered.slice(0, limit),
        totalResults: filtered.length,
        source: "sec_edgar",
      };
    }

    // Single match — fetch filings
    const company = matches[0];
    if (!company) {
      return {
        ok: false,
        query,
        reason: "no_results",
        message: `No SEC EDGAR company found matching "${query}".`,
      };
    }

    const filings = await fetchCompanyFilings(company.cik_str);

    if (filings.length === 0) {
      return {
        ok: false,
        query,
        reason: "no_results",
        message: `Found ${company.title} (CIK ${company.cik_str}) but no financial filings available in EDGAR.`,
      };
    }

    // Apply date filters
    let filtered = filings;
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
