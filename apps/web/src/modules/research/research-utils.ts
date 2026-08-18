/* oxlint-disable i18next/no-literal-string */

export interface FilingCandidate {
  form: string;
  filingDate: string;
  periodEnding: string;
  description: string;
  url: string;
  accessionNumber: string;
  source: "sec_edgar";
  companyName: string;
  cik: string;
}

export type FilingSearchResponse =
  | {
      ok: true;
      query: string;
      candidates: FilingCandidate[];
      totalResults: number;
      source: "sec_edgar";
    }
  | {
      ok: false;
      query: string;
      reason: "no_results" | "api_error" | "invalid_query";
      message: string;
    };

export interface FilingKeyChange {
  area?: string;
  change?: string;
  significance?: "High" | "Medium" | "Low";
  dataPoint?: string;
}

export interface FilingHighlight {
  metric?: string;
  value?: string;
  period?: string;
  change?: string;
  dataPoint?: string;
}

export interface FilingRisk {
  risk?: string;
  severity?: "High" | "Medium" | "Low";
  dataPoint?: string;
}

export interface FilingAnalysis {
  companyName?: string;
  filingType?: string;
  periodEnding?: string;
  executiveSummary?: string;
  keyChanges?: FilingKeyChange[];
  financialHighlights?: FilingHighlight[];
  riskFactors?: FilingRisk[];
  managementDiscussion?: string;
  topJudgments?: Array<{
    judgment?: string;
    keyNumber?: string;
    wrongIf?: string;
    dataPoint?: string;
  }>;
  monitorPanel?: {
    schema_version: 1;
    monitors: Array<{
      metric?: string;
      current?: string;
      trigger?: string;
      tolerance?: string;
      freq?: "Daily" | "Weekly" | "Quarterly" | "Event-driven";
      source?: string;
    }>;
  };
  nextSteps?: string[];
}

export type FilingStatus =
  | "idle"
  | "searching"
  | "candidates"
  | "analyzing"
  | "done"
  | "error";

export const hasPageRef = (value: string | undefined) =>
  /\bp\.\s*\d+/i.test(value ?? "");

export const hasNumericText = (value: string | undefined) =>
  /\d/.test(value ?? "");

export const canRenderNarrative = (value: string | undefined) =>
  !!value && (!hasNumericText(value) || hasPageRef(value));

export const getPageNumber = (value: string | undefined) =>
  value?.match(/\bp\.\s*(\d+)/i)?.[1] ?? null;

export const withPageHash = (url: string, dataPoint?: string) => {
  const page = getPageNumber(dataPoint);
  return page ? `${url}#page=${page}` : url;
};

export const officialHost = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "sec.gov";
  }
};
