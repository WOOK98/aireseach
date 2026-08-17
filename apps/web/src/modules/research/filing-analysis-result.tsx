/* oxlint-disable i18next/no-literal-string */

import {
  AlertCircle,
  BarChart3,
  ExternalLink,
  FileText,
  ListChecks,
  Shield,
  Target,
  TrendingUp,
} from "lucide-react";
import { memo } from "react";

import { PageAnchor } from "./page-anchor";
import { canRenderNarrative, hasPageRef, officialHost } from "./research-utils";
import { Section } from "./section";

import type { FilingAnalysis } from "./research-utils";

export const FilingAnalysisResult = memo(function FilingAnalysisResult({
  analysis,
  filingUrl,
}: {
  analysis: FilingAnalysis;
  filingUrl: string;
}) {
  const keyChanges = (analysis.keyChanges ?? []).filter((item) =>
    hasPageRef(item.dataPoint),
  );
  const highlights = (analysis.financialHighlights ?? []).filter((item) =>
    hasPageRef(item.dataPoint),
  );
  const risks = (analysis.riskFactors ?? []).filter((item) =>
    hasPageRef(item.dataPoint),
  );
  const judgments = (analysis.topJudgments ?? []).filter(
    (item) =>
      item.judgment &&
      item.keyNumber &&
      item.wrongIf &&
      hasPageRef(item.dataPoint),
  );
  const monitors = (analysis.monitorPanel?.monitors ?? []).filter(
    (item) =>
      item.metric && item.current && item.trigger && hasPageRef(item.source),
  );
  const hasAnchoredAnalysis =
    keyChanges.length > 0 ||
    highlights.length > 0 ||
    risks.length > 0 ||
    judgments.length > 0 ||
    monitors.length > 0;

  return (
    <div className="notranslate space-y-6" translate="no">
      <div className="rounded-xl border border-blue-200 bg-blue-50/60 px-4 py-3 dark:border-blue-900/60 dark:bg-blue-950/30">
        <p className="mb-1 font-mono text-[10px] tracking-widest text-blue-900 uppercase dark:text-blue-100">
          Filing Source Lock
        </p>
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="text-sm font-semibold">
              {analysis.companyName ?? "Company filing"}
            </h3>
            <p
              className="notranslate text-muted-foreground mt-1 font-mono text-xs"
              translate="no"
            >
              {analysis.filingType ?? "SEC filing"} · Period{" "}
              {analysis.periodEnding ?? "N/A"} · {officialHost(filingUrl)}
            </p>
          </div>
          <a
            href={filingUrl}
            target="_blank"
            rel="noreferrer"
            className="bg-background hover:bg-muted inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs"
          >
            Open original <ExternalLink className="h-3 w-3" />
          </a>
        </div>
        {canRenderNarrative(analysis.executiveSummary) && (
          <p className="mt-3 text-sm leading-relaxed">
            {analysis.executiveSummary}
          </p>
        )}
      </div>

      {!hasAnchoredAnalysis && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
          <p className="text-sm font-medium">Anchored analysis withheld</p>
          <p className="mt-1 text-xs leading-relaxed opacity-80">
            The model did not return page-anchored numeric claims. Rerun the
            analysis or open the original filing.
          </p>
        </div>
      )}

      {judgments.length > 0 && (
        <Section label="Three Falsifiable Judgments" icon={Target}>
          <div className="grid gap-3 md:grid-cols-3">
            {judgments.slice(0, 3).map((item, index) => (
              <div
                key={`${item.judgment}-${index}`}
                className="rounded-xl border p-4"
              >
                <p className="text-muted-foreground mb-2 font-mono text-[10px] tracking-widest">
                  {["I", "II", "III"][index]}
                </p>
                <p
                  className="notranslate text-sm leading-relaxed font-medium"
                  translate="no"
                >
                  {item.judgment}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span
                    className="notranslate font-mono text-sm font-semibold"
                    translate="no"
                  >
                    {item.keyNumber}
                  </span>
                  <PageAnchor
                    filingUrl={filingUrl}
                    dataPoint={item.dataPoint}
                  />
                </div>
                <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
                  <span>Wrong if: </span>
                  <span className="notranslate" translate="no">
                    {item.wrongIf}
                  </span>
                </p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {highlights.length > 0 && (
        <Section label="Anchored Financial Highlights" icon={BarChart3}>
          <div className="grid gap-2 md:grid-cols-2">
            {highlights.map((item) => (
              <div
                key={`${item.metric}-${item.dataPoint}`}
                className="rounded-lg border p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{item.metric}</p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      <span className="notranslate" translate="no">
                        {item.period} · {item.change}
                      </span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className="notranslate font-mono text-sm font-semibold"
                      translate="no"
                    >
                      {item.value}
                    </p>
                    <PageAnchor
                      filingUrl={filingUrl}
                      dataPoint={item.dataPoint}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {keyChanges.length > 0 && (
        <Section label="Key Changes" icon={TrendingUp}>
          <div className="space-y-2">
            {keyChanges.map((item) => (
              <div
                key={`${item.area}-${item.dataPoint}`}
                className="rounded-lg border p-3"
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">{item.area}</p>
                  {item.significance && (
                    <span className="rounded-full border px-2 py-0.5 text-[10px]">
                      {item.significance}
                    </span>
                  )}
                  <PageAnchor
                    filingUrl={filingUrl}
                    dataPoint={item.dataPoint}
                  />
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  <span className="notranslate" translate="no">
                    {item.change}
                  </span>
                </p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {risks.length > 0 && (
        <Section label="Risk Factors" icon={Shield}>
          <div className="space-y-2">
            {risks.map((item) => (
              <div
                key={`${item.risk}-${item.dataPoint}`}
                className="flex gap-3 rounded-lg border p-3"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <div className="flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="text-muted-foreground text-xs">
                      {item.severity ?? "Risk"}
                    </span>
                    <PageAnchor
                      filingUrl={filingUrl}
                      dataPoint={item.dataPoint}
                    />
                  </div>
                  <p
                    className="notranslate text-sm leading-relaxed"
                    translate="no"
                  >
                    {item.risk}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {monitors.length > 0 && (
        <Section label="Monitor Panel" icon={ListChecks}>
          <div className="overflow-hidden rounded-xl border">
            <div className="bg-muted/30 text-muted-foreground grid grid-cols-[1fr_1fr_1fr] gap-3 border-b px-3 py-2 font-mono text-[10px] tracking-widest uppercase md:grid-cols-[1.2fr_1fr_1fr_0.8fr_1fr]">
              <span>Metric</span>
              <span>Current</span>
              <span>Trigger</span>
              <span className="hidden md:block">Freq</span>
              <span className="hidden md:block">Source</span>
            </div>
            {monitors.map((item) => (
              <div
                key={`${item.metric}-${item.source}`}
                className="grid grid-cols-[1fr_1fr_1fr] gap-3 border-b px-3 py-3 text-sm last:border-b-0 md:grid-cols-[1.2fr_1fr_1fr_0.8fr_1fr]"
              >
                <span>{item.metric}</span>
                <span className="notranslate font-mono" translate="no">
                  {item.current}
                </span>
                <span className="notranslate font-mono" translate="no">
                  {item.trigger}
                </span>
                <span className="text-muted-foreground hidden md:block">
                  {item.freq ?? "Quarterly"}
                </span>
                <span className="hidden md:block">
                  <PageAnchor filingUrl={filingUrl} dataPoint={item.source} />
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {canRenderNarrative(analysis.managementDiscussion) && (
        <Section label="Management Discussion" icon={FileText}>
          <p className="text-foreground/90 text-sm leading-relaxed">
            {analysis.managementDiscussion}
          </p>
        </Section>
      )}

      <p className="text-muted-foreground/70 border-t pt-2 text-[10px]">
        Numeric claims without page anchors are withheld. For research only. Not
        investment advice.
      </p>
    </div>
  );
});
