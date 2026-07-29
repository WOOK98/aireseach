"use client";

/* oxlint-disable i18next/no-literal-string */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { useReportStream } from "~/modules/report/finance/use-report";

import type {
  FinancialMetrics,
  ReportData,
} from "@workspace/shared/types/report";

type CompanyReportLayerProps = {
  symbol: string;
  companyName: string;
  metrics: FinancialMetrics | null;
  authenticated: boolean;
};

type Monitor = NonNullable<ReportData["monitorPanel"]>["monitors"][number];

const LENS_ITEMS = [
  { name: "Supply chain", color: "var(--l1)" },
  { name: "Fundamentals", color: "var(--l2)" },
  { name: "Macro", color: "var(--l3)" },
  { name: "Technical", color: "var(--l4)" },
  { name: "Sentiment", color: "var(--l5)" },
  { name: "Risk", color: "var(--l6)" },
] as const;

function safeErrorMessage(message: string | null) {
  if (!message) {
    return "Report layer is temporarily unavailable. Current metrics remain available.";
  }

  if (
    /api key|env|environment|openai|deepseek|llm|provider|secret|token/i.test(
      message,
    )
  ) {
    return "Report layer is temporarily unavailable. Current metrics remain available.";
  }

  return message;
}

function reportLensContent(
  report: ReportData | null,
  lens: (typeof LENS_ITEMS)[number]["name"],
) {
  if (!report) return "Awaiting a generated or cached report.";

  switch (lens) {
    case "Supply chain":
      return report.sections.overview || "Supply-chain lens unavailable.";
    case "Fundamentals":
      return [
        report.sections.growthDrivers,
        report.sections.profitability,
        report.sections.valuation,
      ]
        .filter(Boolean)
        .join(" ");
    case "Macro":
      return "Macro lens was not separated in this report schema.";
    case "Technical":
      return "Technical lens was not separated in this report schema.";
    case "Sentiment":
      return "Sentiment lens was not separated in this report schema.";
    case "Risk":
      return report.sections.risks.join(" ") || "Risk lens unavailable.";
  }
}

function scenarioTone(scenario: string) {
  if (/bull/i.test(scenario)) return "border-green-line bg-green-bg";
  if (/bear/i.test(scenario)) return "border-red-200 bg-red-50";
  return "border-line bg-panel";
}

function qualityLabel(report: ReportData) {
  return report.thesisQuality.tier
    ? `Conviction tier ${report.thesisQuality.tier}`
    : "Conviction tier unavailable";
}

export function CompanyReportLayer({
  symbol,
  companyName,
  metrics,
  authenticated,
}: CompanyReportLayerProps) {
  const [mounted, setMounted] = useState(false);
  const [savingMetric, setSavingMetric] = useState<string | null>(null);
  const { status, report, error, generate } = useReportStream();
  const loginHref = `/auth/login?redirectTo=${encodeURIComponent(`/t/${symbol}`)}`;

  useEffect(() => {
    setMounted(true);
  }, []);

  const monitors = useMemo(
    () => report?.monitorPanel?.monitors ?? [],
    [report],
  );

  async function runReport() {
    if (!metrics) return;
    await generate(symbol, metrics, "en", "snapshot");
  }

  async function addMonitor(monitor: Monitor) {
    if (!authenticated) return;
    setSavingMetric(monitor.metric);

    try {
      const existingResponse = await fetch(
        `/api/watchlist/${encodeURIComponent(symbol)}`,
      );
      const existingJson = (await existingResponse.json()) as {
        item?: { monitors?: Record<string, unknown>[] };
      };
      const existingMonitors = existingJson.item?.monitors ?? [];

      const response = await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol,
          monitors: [...existingMonitors, monitor],
        }),
      });

      if (!response.ok) {
        throw new Error("Watchlist monitor update failed.");
      }

      toast.success("Monitor added to watchlist.");
    } catch {
      toast.error("Monitor update failed. Please try again.");
    } finally {
      setSavingMetric(null);
    }
  }

  if (!mounted) {
    return (
      <section className="border-line border-t py-8">
        <div className="bg-panel border-line rounded-xl border p-6">
          <p className="text-ink-2 text-sm">Preparing report layer.</p>
        </div>
      </section>
    );
  }

  const hasReport = Boolean(report);
  const isBusy = status === "loading" || status === "streaming";

  return (
    <section className="space-y-8 py-8">
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="bg-panel border-line rounded-xl border p-5">
          <p className="text-ink-2 font-mono text-[10px] font-semibold tracking-[0.2em] uppercase">
            One-page decision brief
          </p>
          {report ? (
            <>
              <h2
                className="notranslate mt-3 font-serif text-3xl font-semibold"
                translate="no"
              >
                {companyName}
              </h2>
              {report.decisionBrief ? (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <BriefCell
                    label="Action"
                    value={report.decisionBrief.action}
                  />
                  <BriefCell
                    label="Confidence"
                    value={report.decisionBrief.confidence}
                  />
                  <BriefCell
                    label="Horizon"
                    value={report.decisionBrief.timeHorizon}
                  />
                  <BriefCell
                    label="Key question"
                    value={report.decisionBrief.keyQuestion}
                  />
                </div>
              ) : (
                <p className="text-ink-2 mt-4 text-sm">
                  Cached report is missing the decision brief block.
                </p>
              )}
            </>
          ) : (
            <EmptyReportState
              authenticated={authenticated}
              busy={isBusy}
              canGenerate={Boolean(metrics)}
              loginHref={loginHref}
              onGenerate={runReport}
            />
          )}
        </div>

        <div className="border-line bg-panel rounded-xl border p-5">
          <p className="text-ink-2 font-mono text-[10px] font-semibold tracking-[0.2em] uppercase">
            Quality slot
          </p>
          {report ? (
            <>
              <p className="mt-3 font-serif text-2xl font-semibold">
                {qualityLabel(report)}
              </p>
              <p className="text-ink-2 mt-2 text-sm leading-6">
                {report.thesisQuality.rationale}
              </p>
              {report.tqs ? (
                <div className="border-line mt-4 rounded-lg border p-3">
                  <p className="text-ink-2 font-mono text-[10px] uppercase">
                    TQS
                  </p>
                  <p className="notranslate mt-1 text-2xl" translate="no">
                    {report.tqs.score}/100
                  </p>
                  <p className="text-ink-2 mt-1 text-xs">
                    {report.tqs.disclaimer ??
                      "TQS evaluates thesis quality, not stock quality."}
                  </p>
                </div>
              ) : (
                <p className="text-ink-2 mt-4 border-t pt-4 text-xs leading-5">
                  TQS evaluates thesis quality, not whether the stock is good or
                  bad. It will appear here after the L2 score is present in
                  cached reports.
                </p>
              )}
            </>
          ) : (
            <p className="text-ink-2 mt-3 text-sm leading-6">
              No rating badge, no target price, no allocation advice. This slot
              is reserved for conviction tier and TQS only.
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="border-line bg-panel rounded-xl border p-5">
          <p className="text-ink-2 text-sm">{safeErrorMessage(error)}</p>
        </div>
      )}

      {isBusy && (
        <div className="border-line bg-panel rounded-xl border p-5">
          <p className="text-ink-2 text-sm">
            Generating a structured report. Metrics remain visible while the
            report layer loads.
          </p>
        </div>
      )}

      {hasReport && report?.topJudgments && report.topJudgments.length > 0 && (
        <div>
          <SectionTitle label="Three falsifiable judgments" />
          <div className="grid gap-4 md:grid-cols-3">
            {report.topJudgments.slice(0, 3).map((item, index) => (
              <div
                key={`${item.judgment}-${index}`}
                className="border-line bg-panel rounded-xl border p-5"
              >
                <p className="text-ink-2 font-mono text-xs">
                  {["I", "II", "III"][index]}
                </p>
                <p className="mt-3 text-sm leading-6">{item.judgment}</p>
                <p
                  className="notranslate mt-4 font-serif text-2xl"
                  translate="no"
                >
                  {item.keyNumber}
                </p>
                <p className="text-ink-2 mt-3 text-xs leading-5">
                  Wrong if: {item.wrongIf}
                </p>
                {item.dataPoint && (
                  <p className="text-ink-2 mt-2 font-mono text-[10px]">
                    {item.dataPoint}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {hasReport &&
        report?.scenarioMatrix &&
        report.scenarioMatrix.length > 0 && (
          <div>
            <SectionTitle label="Scenario checks" />
            <div className="grid gap-4 md:grid-cols-3">
              {report.scenarioMatrix.slice(0, 3).map((scenario) => (
                <div
                  key={scenario.scenario}
                  className={`rounded-xl border p-5 ${scenarioTone(
                    scenario.scenario,
                  )}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold">{scenario.scenario}</p>
                    <span
                      className="notranslate rounded-full border bg-white/60 px-2 py-0.5 font-mono text-xs"
                      translate="no"
                    >
                      {scenario.probability}%
                    </span>
                  </div>
                  <p
                    className="notranslate mt-4 font-mono text-sm"
                    translate="no"
                  >
                    {scenario.keyMetric}
                  </p>
                  <ul className="mt-4 space-y-2 text-sm">
                    {scenario.drivers.slice(0, 3).map((driver) => (
                      <li key={driver}>{driver}</li>
                    ))}
                  </ul>
                  <p className="text-ink-2 mt-4 border-t pt-3 text-xs leading-5">
                    Invalid if:{" "}
                    {scenario.wrongIf ?? "not written into this report version"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

      <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <SectionTitle label="Six lens summary" />
          <div className="grid gap-3 sm:grid-cols-2">
            {LENS_ITEMS.map((lens) => (
              <div
                key={lens.name}
                className="border-line bg-panel relative overflow-hidden rounded-xl border p-5"
              >
                <div
                  className="absolute top-0 left-0 h-full w-0.5"
                  style={{ backgroundColor: lens.color }}
                />
                <p className="font-semibold">{lens.name}</p>
                <p className="text-ink-2 mt-3 text-sm leading-6">
                  {reportLensContent(report, lens.name)}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div>
          <SectionTitle label="Catalysts and risk matrix" />
          <div className="space-y-4">
            <div className="border-line bg-panel rounded-xl border p-5">
              <p className="text-ink-2 font-mono text-[10px] uppercase">
                Next 12 months
              </p>
              {report?.sections.catalysts ? (
                <p className="mt-3 text-sm leading-6">
                  {report.sections.catalysts}
                </p>
              ) : (
                <p className="text-ink-2 mt-3 text-sm">
                  Catalyst timeline unavailable until a report is generated.
                </p>
              )}
            </div>

            <div className="border-line bg-panel rounded-xl border p-5">
              <p className="text-ink-2 font-mono text-[10px] uppercase">
                Risk matrix
              </p>
              {report?.sections.risks.length ? (
                <div className="mt-4 space-y-3">
                  {report.sections.risks.slice(0, 4).map((risk, index) => (
                    <div
                      key={risk}
                      className="border-line grid gap-3 rounded-lg border p-3 text-sm md:grid-cols-[1fr_auto]"
                    >
                      <p>{risk}</p>
                      <p className="text-ink-2 font-mono text-xs">
                        R{index + 1} · unscored
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-ink-2 mt-3 text-sm">
                  Risk rows unavailable until a report is generated.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div>
        <SectionTitle label="Invalidation conditions and monitor panel" />
        <div className="border-line bg-panel overflow-hidden rounded-xl border">
          {monitors.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-tint/40 text-ink-2 font-mono text-[10px] uppercase">
                  <tr>
                    <th className="px-4 py-3">Metric</th>
                    <th className="px-4 py-3">Current</th>
                    <th className="px-4 py-3">Trigger</th>
                    <th className="px-4 py-3">Frequency</th>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {monitors.map((monitor) => (
                    <tr key={`${monitor.metric}-${monitor.trigger}`}>
                      <td className="border-line border-t px-4 py-3">
                        {monitor.metric}
                      </td>
                      <td
                        className="notranslate border-line border-t px-4 py-3 font-mono"
                        translate="no"
                      >
                        {monitor.current}
                      </td>
                      <td
                        className="notranslate border-line border-t px-4 py-3 font-mono"
                        translate="no"
                      >
                        {monitor.trigger}
                      </td>
                      <td className="border-line border-t px-4 py-3">
                        {monitor.freq}
                      </td>
                      <td className="border-line border-t px-4 py-3">
                        {monitor.source}
                      </td>
                      <td className="border-line border-t px-4 py-3 text-right">
                        {authenticated ? (
                          <button
                            type="button"
                            className="border-line hover:border-lock rounded-full border px-3 py-1.5 text-xs"
                            disabled={savingMetric === monitor.metric}
                            onClick={() => addMonitor(monitor)}
                          >
                            {savingMetric === monitor.metric
                              ? "Adding"
                              : "Add monitor"}
                          </button>
                        ) : (
                          <Link
                            href={loginHref}
                            className="border-line hover:border-lock rounded-full border px-3 py-1.5 text-xs"
                          >
                            Sign in
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-5">
              <p className="text-ink-2 text-sm leading-6">
                No monitor panel is cached for{" "}
                <span className="notranslate" translate="no">
                  {symbol}
                </span>
                . Generate a report to create schema-versioned monitor rows.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function BriefCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-line rounded-lg border p-3">
      <p className="text-ink-2 font-mono text-[10px] uppercase">{label}</p>
      <p className="mt-2 text-sm leading-6">{value}</p>
    </div>
  );
}

function EmptyReportState({
  authenticated,
  busy,
  canGenerate,
  loginHref,
  onGenerate,
}: {
  authenticated: boolean;
  busy: boolean;
  canGenerate: boolean;
  loginHref: string;
  onGenerate: () => void;
}) {
  return (
    <div className="mt-3">
      <h2 className="font-serif text-3xl font-semibold">Report layer</h2>
      <p className="text-ink-2 mt-3 max-w-2xl text-sm leading-6">
        Current metrics are available now. A generated report adds three
        falsifiable judgments, scenarios, six lens summaries, invalidation
        conditions, and a monitor panel.
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        {authenticated ? (
          <button
            type="button"
            className="bg-ink text-paper rounded-full px-5 py-2.5 text-sm font-medium disabled:opacity-50"
            disabled={busy || !canGenerate}
            onClick={onGenerate}
          >
            {busy ? "Generating" : "Generate deep dive"}
          </button>
        ) : (
          <Link
            href={loginHref}
            className="bg-ink text-paper rounded-full px-5 py-2.5 text-sm font-medium"
          >
            Sign in to generate
          </Link>
        )}
        {!canGenerate && (
          <p className="text-ink-2 self-center text-sm">
            Metrics are required before report generation.
          </p>
        )}
      </div>
    </div>
  );
}

function SectionTitle({ label }: { label: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <div className="bg-lock h-4 w-0.5 rounded-full" />
      <h2 className="font-serif text-sm font-semibold tracking-wide uppercase">
        {label}
      </h2>
      <div className="bg-line h-px flex-1" />
    </div>
  );
}
