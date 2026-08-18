/* oxlint-disable i18next/no-literal-string */

import { FileSearch, Loader2 } from "lucide-react";
import { memo } from "react";

import { Button } from "@workspace/ui-web/button";

import { officialHost } from "./research-utils";
import { Section } from "./section";

import type { FilingCandidate } from "./research-utils";

export const FilingCandidates = memo(function FilingCandidates({
  candidates,
  selectedUrl,
  onSelect,
  onAnalyze,
  isAnalyzing,
}: {
  candidates: FilingCandidate[];
  selectedUrl: string | null;
  onSelect: (candidate: FilingCandidate) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
}) {
  return (
    <Section label="Official Filing Candidates" icon={FileSearch}>
      <div
        className="notranslate overflow-hidden rounded-xl border"
        translate="no"
      >
        <div className="bg-muted/30 text-muted-foreground hidden grid-cols-[0.7fr_1fr_1fr_1fr_2fr] gap-3 border-b px-4 py-2 font-mono text-[10px] tracking-widest uppercase md:grid">
          <span>Form</span>
          <span>Filed</span>
          <span>Period</span>
          <span>Source</span>
          <span>Title</span>
        </div>
        <div className="divide-y">
          {candidates.map((candidate, index) => {
            const selected = selectedUrl === candidate.url;
            return (
              <button
                key={candidate.accessionNumber}
                type="button"
                onClick={() => onSelect(candidate)}
                className={`grid w-full gap-2 px-4 py-3 text-left transition md:grid-cols-[0.7fr_1fr_1fr_1fr_2fr] md:items-center md:gap-3 ${
                  selected ? "bg-primary/5" : "hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="notranslate rounded-full border px-2 py-0.5 font-mono text-xs font-semibold"
                    translate="no"
                  >
                    {candidate.form}
                  </span>
                  {index === 0 && (
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] text-emerald-800">
                      Latest
                    </span>
                  )}
                </div>
                <span
                  className="notranslate text-muted-foreground font-mono text-xs"
                  translate="no"
                >
                  {candidate.filingDate || "N/A"}
                </span>
                <span
                  className="notranslate text-muted-foreground font-mono text-xs"
                  translate="no"
                >
                  {candidate.periodEnding || "N/A"}
                </span>
                <span
                  className="notranslate text-muted-foreground font-mono text-xs"
                  translate="no"
                >
                  {officialHost(candidate.url)}
                </span>
                <span
                  className="notranslate text-sm leading-snug"
                  translate="no"
                >
                  {candidate.description}
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex flex-col gap-3 border-t px-4 py-3 md:flex-row md:items-center md:justify-between">
          <p className="text-muted-foreground text-xs leading-relaxed">
            Latest filing is highlighted, but analysis starts only after you
            select a filing and confirm.
          </p>
          <Button
            onClick={onAnalyze}
            disabled={!selectedUrl || isAnalyzing}
            size="sm"
            className="gap-1.5"
          >
            {isAnalyzing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileSearch className="h-3.5 w-3.5" />
            )}
            Analyze selected filing
          </Button>
        </div>
      </div>
    </Section>
  );
});
