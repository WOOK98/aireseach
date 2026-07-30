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
  asOf: string;
};

type Monitor = NonNullable<ReportData["monitorPanel"]>["monitors"][number];
type TopJudgment = NonNullable<ReportData["topJudgments"]>[number];

type LedgerVerification = {
  id: string;
  judgmentId: string;
  result: "confirmed" | "invalidated" | "pending" | "insufficient_data";
  dataPoint: string | null;
  evidenceUrl: string | null;
  notes: string | null;
  verifiedAt: string;
};

type LedgerJudgment = {
  id: string;
  reportId: string;
  ticker: string;
  companyName: string;
  judgment: string;
  keyNumber: string;
  wrongIf: string;
  metric: string | null;
  trigger: string | null;
  tolerance: string | null;
  source: string | null;
  freq: string | null;
  publishedAt: string;
  checkAfter: string | null;
  verifications: LedgerVerification[];
};

type KeyNumberRow = {
  label: string;
  number: string;
  period: string;
  yoy: string;
  source: string;
};

const LENS_ITEMS = [
  { name: "Supply chain", color: "var(--l1)" },
  { name: "Fundamentals", color: "var(--l2)" },
  { name: "Macro", color: "var(--l3)" },
  { name: "Technical", color: "var(--l4)" },
  { name: "Sentiment", color: "var(--l5)" },
  { name: "Risk", color: "var(--l6)" },
] as const;

const normalizeText = (value: string) => value.replace(/\s+/g, " ").trim();

const fmtPct = (value: number | null | undefined) =>
  value == null || !Number.isFinite(value) ? null : `${value.toFixed(1)}%`;

const fmtMoney = (
  value: number | null | undefined,
  currency: string | undefined,
) => {
  if (value == null || !Number.isFinite(value)) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    notation: Math.abs(value) >= 1_000_000 ? "compact" : "standard",
    maximumFractionDigits: Math.abs(value) >= 100 ? 1 : 2,
  }).format(value);
};

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

function qualityLabel(report: ReportData) {
  return report.thesisQuality.tier
    ? `Conviction tier ${report.thesisQuality.tier}`
    : "Conviction tier unavailable";
}

function judgmentKind(judgment: string, dataPoint?: string) {
  if (/scenario|case|if\b|could|would/i.test(judgment)) return "Scenario";
  if (dataPoint && /\d/.test(dataPoint)) return "Inference";
  return "Inference";
}

function compareStatus(verification?: LedgerVerification) {
  if (!verification) return null;

  switch (verification.result) {
    case "confirmed":
      return { label: "unchanged", tone: "border-line bg-panel" };
    case "invalidated":
      return { label: "weakened", tone: "border-red-200 bg-red-50 text-down" };
    case "pending":
      return { label: "unverified", tone: "border-amber-200 bg-amber-50" };
    case "insufficient_data":
      return { label: "not enough data", tone: "border-amber-200 bg-amber-50" };
  }
}

function latestVerification(judgment: LedgerJudgment | null) {
  return judgment?.verifications[0] ?? null;
}

function matchLedgerJudgment(
  ledgerRows: LedgerJudgment[],
  judgment?: TopJudgment,
) {
  if (!judgment) return null;
  const reportJudgment = normalizeText(judgment.judgment);
  const reportWrongIf = normalizeText(judgment.wrongIf);

  return (
    ledgerRows.find(
      (row) =>
        normalizeText(row.judgment) === reportJudgment &&
        normalizeText(row.wrongIf) === reportWrongIf,
    ) ?? null
  );
}

function buildKeyNumbers(
  metrics: FinancialMetrics | null,
  asOf: string,
): KeyNumberRow[] {
  if (!metrics) return [];

  const source = "Market data · latest financials";
  const period = `Latest reported period · as of ${asOf}`;
  const rows: Array<KeyNumberRow | null> = [
    fmtPct(metrics.revenueGrowthYoy)
      ? {
          label: "Revenue growth YoY",
          number: fmtPct(metrics.revenueGrowthYoy)!,
          period,
          yoy: fmtPct(metrics.revenueGrowthYoy)!,
          source,
        }
      : null,
    fmtMoney(metrics.eps, metrics.currency) && fmtPct(metrics.epsGrowthYoy)
      ? {
          label: "EPS",
          number: fmtMoney(metrics.eps, metrics.currency)!,
          period,
          yoy: fmtPct(metrics.epsGrowthYoy)!,
          source,
        }
      : null,
  ];

  return rows.filter((row): row is KeyNumberRow => Boolean(row));
}

export function CompanyReportLayer({
  symbol,
  companyName,
  metrics,
  authenticated,
  asOf,
}: CompanyReportLayerProps) {
  const [mounted, setMounted] = useState(false);
  const [savingMetric, setSavingMetric] = useState<string | null>(null);
  const [ledgerRows, setLedgerRows] = useState<LedgerJudgment[]>([]);
  const [ledgerLoaded, setLedgerLoaded] = useState(false);
  const [expandedLens, setExpandedLens] = useState<
    (typeof LENS_ITEMS)[number]["name"] | null
  >(null);
  const { status, report, error, generate } = useReportStream();
  const loginHref = `/auth/login?redirectTo=${encodeURIComponent(`/t/${symbol}`)}`;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!authenticated) {
      setLedgerRows([]);
      setLedgerLoaded(false);
      return;
    }

    let cancelled = false;
    setLedgerLoaded(false);
    void (async () => {
      try {
        const response = await fetch(
          `/api/ledger/judgments/${encodeURIComponent(symbol)}/history`,
        );
        if (!response.ok) throw new Error("Ledger unavailable");
        const payload = (await response.json()) as {
          history?: LedgerJudgment[];
        };
        if (!cancelled) setLedgerRows(payload.history ?? []);
      } catch {
        if (!cancelled) setLedgerRows([]);
      } finally {
        if (!cancelled) setLedgerLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authenticated, symbol, report?.generatedAt]);

  const monitors = useMemo(
    () => report?.monitorPanel?.monitors ?? [],
    [report],
  );
  const keyNumbers = useMemo(
    () => buildKeyNumbers(metrics, asOf),
    [metrics, asOf],
  );
  const primaryJudgment = report?.topJudgments?.[0];
  const primaryLedger = matchLedgerJudgment(ledgerRows, primaryJudgment);
  const primaryVerification = latestVerification(primaryLedger);
  const comparison = compareStatus(primaryVerification ?? undefined);

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

  const isBusy = status === "loading" || status === "streaming";

  return (
    <section className="space-y-8 py-8">
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

      <DecisionBlock number="1" title="Current judgment">
        {report ? (
          <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
            <div>
              <p className="text-ink-2 font-mono text-[10px] font-semibold tracking-[0.2em] uppercase">
                One-page decision brief
              </p>
              <h2
                className="notranslate mt-3 font-serif text-3xl font-semibold"
                translate="no"
              >
                {primaryJudgment?.judgment || report.investmentThesis}
              </h2>
              <div className="mt-4 flex flex-wrap gap-2">
                <StatusPill
                  label={judgmentKind(primaryJudgment?.judgment ?? "")}
                />
                <StatusPill label={qualityLabel(report)} />
                {report.tqs ? (
                  <StatusPill label={`TQS ${report.tqs.score}/100`} />
                ) : null}
                <StatusPill
                  label={`Updated ${new Date(report.generatedAt).toISOString().slice(0, 10)}`}
                />
                {comparison ? (
                  <span
                    className={`notranslate rounded-full border px-2.5 py-1 font-mono text-xs ${comparison.tone}`}
                    translate="no"
                  >
                    vs last: {comparison.label}
                  </span>
                ) : null}
              </div>
            </div>
            <div className="border-line rounded-xl border p-4">
              <p className="text-ink-2 font-mono text-[10px] uppercase">
                Quality slot
              </p>
              <p className="notranslate mt-3 text-sm leading-6" translate="no">
                {report.thesisQuality.rationale}
              </p>
              <p className="text-ink-2 mt-3 text-xs leading-5">
                {report.tqs?.disclaimer ??
                  report.thesisQuality.disclaimer ??
                  "TQS evaluates thesis quality, not stock quality."}
              </p>
            </div>
          </div>
        ) : (
          <EmptyReportState
            authenticated={authenticated}
            busy={isBusy}
            canGenerate={Boolean(metrics)}
            companyName={companyName}
            loginHref={loginHref}
            onGenerate={runReport}
          />
        )}
      </DecisionBlock>

      <DecisionBlock number="2" title="What changed today">
        <ChangeList
          ledgerRows={ledgerRows}
          ledgerLoaded={ledgerLoaded}
          authenticated={authenticated}
          loginHref={loginHref}
        />
      </DecisionBlock>

      <DecisionBlock number="3" title="Key numbers">
        {keyNumbers.length > 0 ? (
          <div className="bg-line grid gap-px overflow-hidden rounded-xl border sm:grid-cols-2">
            {keyNumbers.map((row) => (
              <div key={row.label} className="bg-panel p-4">
                <p className="text-ink-2 text-[11px] font-medium tracking-wide uppercase">
                  {row.label}
                </p>
                <p
                  className="notranslate mt-2 font-serif text-2xl font-semibold"
                  translate="no"
                >
                  {row.number}
                </p>
                <dl className="mt-3 grid gap-2 text-xs">
                  <KeyMeta label="Period" value={row.period} />
                  <KeyMeta label="YoY" value={row.yoy} />
                  <KeyMeta label="Source" value={row.source} />
                </dl>
              </div>
            ))}
          </div>
        ) : (
          <HonestEmpty>
            No number has all four required fields: number, period, YoY, and
            source.
          </HonestEmpty>
        )}
      </DecisionBlock>

      <DecisionBlock number="4" title="Why it matters">
        <div className="grid gap-4 md:grid-cols-3">
          <EvidenceCard
            label="Confirmed"
            body={
              keyNumbers[0]
                ? `${keyNumbers[0].label} is ${keyNumbers[0].number} with ${keyNumbers[0].yoy} YoY, sourced from ${keyNumbers[0].source}.`
                : "No complete confirmed number is available for this page state."
            }
          />
          <EvidenceCard
            label="Reasonable inference"
            body={
              report?.decisionBrief?.keyQuestion ||
              report?.investmentThesis ||
              "Generate a report before the page converts data into a thesis."
            }
          />
          <EvidenceCard
            label="Not yet confirmed"
            body={
              report?.evidenceNeeds?.[0] ||
              "A fresh filing or verified update is still needed before treating this as confirmed."
            }
          />
        </div>
      </DecisionBlock>

      <DecisionBlock number="5" title="What would make it wrong">
        <InvalidationPanel
          authenticated={authenticated}
          ledgerLoaded={ledgerLoaded}
          ledgerRows={ledgerRows}
          loginHref={loginHref}
          report={report}
        />
      </DecisionBlock>

      <DecisionBlock number="6" title="Dive deeper">
        <div className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {LENS_ITEMS.map((lens) => (
              <button
                key={lens.name}
                type="button"
                className={`border-line bg-panel hover:border-lock rounded-xl border p-4 text-left ${
                  expandedLens === lens.name ? "border-lock" : ""
                }`}
                onClick={() =>
                  setExpandedLens(expandedLens === lens.name ? null : lens.name)
                }
              >
                <span
                  className="mb-3 block h-1 w-8 rounded-full"
                  style={{ backgroundColor: lens.color }}
                />
                <span className="font-semibold">{lens.name}</span>
                <span className="text-ink-2 mt-1 block text-xs">
                  {expandedLens === lens.name ? "Hide evidence" : "Expand"}
                </span>
              </button>
            ))}
          </div>

          {expandedLens ? (
            <div
              className="notranslate border-line bg-panel rounded-xl border p-5 text-sm leading-6"
              translate="no"
            >
              {reportLensContent(report, expandedLens)}
            </div>
          ) : (
            <HonestEmpty>
              Six-lens evidence is collapsed by default so the first screen
              stays a one-page decision brief.
            </HonestEmpty>
          )}

          <MonitorPanel
            authenticated={authenticated}
            loginHref={loginHref}
            monitors={monitors}
            savingMetric={savingMetric}
            symbol={symbol}
            onAddMonitor={addMonitor}
          />
        </div>
      </DecisionBlock>
    </section>
  );
}

function ChangeList({
  ledgerRows,
  ledgerLoaded,
  authenticated,
  loginHref,
}: {
  ledgerRows: LedgerJudgment[];
  ledgerLoaded: boolean;
  authenticated: boolean;
  loginHref: string;
}) {
  if (!authenticated) {
    return (
      <HonestEmpty>
        <Link href={loginHref} className="underline underline-offset-4">
          Sign in
        </Link>{" "}
        to compare today against your saved judgment ledger.
      </HonestEmpty>
    );
  }

  if (!ledgerLoaded) {
    return <HonestEmpty>Loading ledger verification state.</HonestEmpty>;
  }

  const changed = ledgerRows
    .map((row) => ({ row, verification: latestVerification(row) }))
    .filter(({ verification }) => verification)
    .slice(0, 4);

  if (changed.length === 0) {
    return (
      <HonestEmpty>
        No verification record is attached yet. This means unverified, not
        unchanged.
      </HonestEmpty>
    );
  }

  return (
    <div className="divide-line overflow-hidden rounded-xl border">
      {changed.map(({ row, verification }) => {
        const direction =
          verification?.result === "invalidated"
            ? "↓"
            : verification?.result === "confirmed"
              ? "→"
              : "↑";
        return (
          <div
            key={`${row.id}-${verification?.id}`}
            className="grid gap-3 p-4 md:grid-cols-[32px_1fr_auto]"
          >
            <p className="notranslate font-serif text-2xl" translate="no">
              {direction}
            </p>
            <div>
              <p className="notranslate text-sm leading-6" translate="no">
                {row.judgment}
              </p>
              {verification?.dataPoint ? (
                <p
                  className="notranslate text-ink-2 mt-1 font-mono text-xs"
                  translate="no"
                >
                  {verification.dataPoint}
                </p>
              ) : null}
            </div>
            <p
              className="notranslate text-ink-2 font-mono text-xs"
              translate="no"
            >
              {verification?.verifiedAt.slice(0, 10)}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function InvalidationPanel({
  authenticated,
  ledgerLoaded,
  ledgerRows,
  loginHref,
  report,
}: {
  authenticated: boolean;
  ledgerLoaded: boolean;
  ledgerRows: LedgerJudgment[];
  loginHref: string;
  report: ReportData | null;
}) {
  if (!authenticated) {
    return (
      <HonestEmpty>
        <Link href={loginHref} className="underline underline-offset-4">
          Sign in
        </Link>{" "}
        to read the ledger-backed invalidation condition.
      </HonestEmpty>
    );
  }

  if (!ledgerLoaded) {
    return <HonestEmpty>Loading ledger-backed invalidation rows.</HonestEmpty>;
  }

  if (!report) {
    return (
      <HonestEmpty>
        No report judgment is available yet, so there is no ledger id to inherit
        an invalidation condition from.
      </HonestEmpty>
    );
  }

  const rows = (report.topJudgments ?? [])
    .map((judgment) => {
      const ledger = matchLedgerJudgment(ledgerRows, judgment);
      return ledger ? { judgment, ledger } : null;
    })
    .filter(
      (
        row,
      ): row is {
        judgment: NonNullable<typeof row>["judgment"];
        ledger: LedgerJudgment;
      } => Boolean(row),
    );

  if (rows.length === 0) {
    return (
      <HonestEmpty>
        No report judgment is linked to an L3 ledger row yet, so this page will
        not re-render generated wrong-if text as if it were ledger truth.
      </HonestEmpty>
    );
  }

  return (
    <div className="divide-line overflow-hidden rounded-xl border">
      {rows.map(({ ledger }) => (
        <div key={ledger.id} className="grid gap-3 p-4 md:grid-cols-[1fr_auto]">
          <div>
            <p className="notranslate text-sm leading-6" translate="no">
              {ledger.wrongIf}
            </p>
            <p
              className="notranslate text-ink-2 mt-2 font-mono text-xs"
              translate="no"
            >
              ledger id {ledger.id} · report {ledger.reportId}
            </p>
          </div>
          <p
            className="notranslate text-ink-2 font-mono text-xs"
            translate="no"
          >
            check after {ledger.checkAfter?.slice(0, 10) ?? "not scheduled"}
          </p>
        </div>
      ))}
    </div>
  );
}

function MonitorPanel({
  authenticated,
  loginHref,
  monitors,
  savingMetric,
  symbol,
  onAddMonitor,
}: {
  authenticated: boolean;
  loginHref: string;
  monitors: Monitor[];
  savingMetric: string | null;
  symbol: string;
  onAddMonitor: (monitor: Monitor) => void;
}) {
  if (monitors.length === 0) {
    return (
      <HonestEmpty>
        No monitor panel is cached for{" "}
        <span className="notranslate" translate="no">
          {symbol}
        </span>
        . Generate a report to create schema-versioned monitor rows.
      </HonestEmpty>
    );
  }

  return (
    <div className="border-line bg-panel overflow-hidden rounded-xl border">
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
                      onClick={() => onAddMonitor(monitor)}
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
    </div>
  );
}

function DecisionBlock({
  children,
  number,
  title,
}: {
  children: React.ReactNode;
  number: string;
  title: string;
}) {
  return (
    <section className="border-line bg-panel rounded-xl border p-5">
      <div className="mb-4 flex items-center gap-3">
        <span
          className="border-line bg-paper notranslate inline-flex h-7 w-7 items-center justify-center rounded-full border font-mono text-xs"
          translate="no"
        >
          {number}
        </span>
        <h2 className="font-serif text-sm font-semibold tracking-wide uppercase">
          {title}
        </h2>
        <div className="bg-line h-px flex-1" />
      </div>
      {children}
    </section>
  );
}

function EvidenceCard({ label, body }: { label: string; body: string }) {
  return (
    <div className="border-line rounded-xl border p-4">
      <p className="text-ink-2 font-mono text-[10px] uppercase">{label}</p>
      <p className="notranslate mt-3 text-sm leading-6" translate="no">
        {body}
      </p>
    </div>
  );
}

function KeyMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[72px_1fr] gap-2">
      <dt className="text-ink-2">{label}</dt>
      <dd className="notranslate font-mono" translate="no">
        {value}
      </dd>
    </div>
  );
}

function StatusPill({ label }: { label: string }) {
  return (
    <span
      className="notranslate border-line bg-paper rounded-full border px-2.5 py-1 font-mono text-xs"
      translate="no"
    >
      {label}
    </span>
  );
}

function HonestEmpty({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-line bg-tint/30 text-ink-2 rounded-xl border p-4 text-sm leading-6">
      {children}
    </div>
  );
}

function EmptyReportState({
  authenticated,
  busy,
  canGenerate,
  companyName,
  loginHref,
  onGenerate,
}: {
  authenticated: boolean;
  busy: boolean;
  canGenerate: boolean;
  companyName: string;
  loginHref: string;
  onGenerate: () => void;
}) {
  return (
    <div>
      <p className="text-ink-2 font-mono text-[10px] font-semibold tracking-[0.2em] uppercase">
        One-page decision brief
      </p>
      <h2 className="mt-3 font-serif text-3xl font-semibold">Report layer</h2>
      <p className="text-ink-2 mt-3 max-w-2xl text-sm leading-6">
        Current metrics for{" "}
        <span className="notranslate" translate="no">
          {companyName}
        </span>{" "}
        are available now. A generated report adds a current judgment, change
        checks, key numbers, ledger-backed invalidation, and expandable
        evidence.
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
