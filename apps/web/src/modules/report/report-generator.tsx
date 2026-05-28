"use client";

import { Sparkles, Square } from "lucide-react";
import { useState, useRef } from "react";

import { Button } from "@workspace/ui-web/button";
import { Icons } from "@workspace/ui-web/icons";
import { Input } from "@workspace/ui-web/input";
import { Label } from "@workspace/ui-web/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui-web/select";
import { Textarea } from "@workspace/ui-web/textarea";

import type { FormEvent } from "react";

const ANALYSIS_LENSES = [
  "Comprehensive",
  "Valuation and financial quality",
  "Market share and competitive landscape",
  "Cash flow and asset quality",
  "Antifragility and risk",
  "Growth and business model",
];

const REPORT_MODES = [
  { value: "jina_llm", label: "Aireseach Search + your model" },
  { value: "deep_research", label: "Perplexity Deep Research" },
];

const TEXT = {
  targetLabel: "Research target",
  targetPlaceholder: "Tesla / NVIDIA / North American battery storage",
  yearsLabel: "Lookback window",
  yearsOption: (years: number) => `Last ${years} years`,
  lensLabel: "Analysis lens",
  providerLabel: "AI provider",
  modeLabel: "Generation mode",
  apiKeyLabel: "Model API key",
  apiKeyPlaceholder: "Only used for this request, never stored",
  apiKeyHelp: "{TEXT.apiKeyHelp}",
  modelLabel: "Model",
  modelPlaceholder: "gpt-4o-mini / deepseek-chat / openai/gpt-4o-mini",
  baseUrlLabel: "Base URL",
  baseUrlPlaceholder: "https://api.openai.com/v1",
  stop: "Stop",
  generate: "Generate report",
  metricDashboard: "Metric dashboard",
  download: "Download Markdown",
  emptyState: "Enter a research target and generate a search-grounded report.",
  loading: "{TEXT.loading}",
};

const DEFAULT_PROVIDER = {
  value: "openai",
  label: "OpenAI",
  mode: "jina_llm",
  baseUrl: "https://api.openai.com/v1",
  model: "gpt-4o-mini",
} as const;

const MODEL_PROVIDERS = [
  DEFAULT_PROVIDER,
  {
    value: "deepseek",
    label: "DeepSeek",
    mode: "jina_llm",
    baseUrl: "https://api.deepseek.com/v1",
    model: "deepseek-chat",
  },
  {
    value: "openrouter",
    label: "OpenRouter",
    mode: "jina_llm",
    baseUrl: "https://openrouter.ai/api/v1",
    model: "openai/gpt-4o-mini",
  },
  {
    value: "perplexity",
    label: "Perplexity",
    mode: "deep_research",
    baseUrl: "https://api.perplexity.ai",
    model: "sonar-deep-research",
  },
  {
    value: "custom",
    label: "Custom OpenAI-compatible",
    mode: "jina_llm",
    baseUrl: "",
    model: "",
  },
] as const;

interface ReportState {
  status: "idle" | "loading" | "done" | "error";
  content: string;
  error: string;
}

type ProviderValue = (typeof MODEL_PROVIDERS)[number]["value"];

const getProvider = (value: string) =>
  MODEL_PROVIDERS.find((provider) => provider.value === value) ??
  DEFAULT_PROVIDER;

const getErrorDetail = (data: unknown) => {
  if (typeof data === "object" && data !== null && "detail" in data) {
    const detail = (data as { detail?: unknown }).detail;
    if (typeof detail === "string") {
      return detail;
    }
  }

  return null;
};

export const ReportGenerator = () => {
  const [target, setTarget] = useState("");
  const [analysisYears, setAnalysisYears] = useState("5");
  const [analysisLens, setAnalysisLens] = useState("Comprehensive");
  const [provider, setProvider] = useState<ProviderValue>("openai");
  const initialProvider = getProvider("openai");
  const [reportMode, setReportMode] = useState<string>(initialProvider.mode);
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState<string>(initialProvider.baseUrl);
  const [model, setModel] = useState<string>(initialProvider.model);
  const [report, setReport] = useState<ReportState>({
    status: "idle",
    content: "",
    error: "",
  });
  const abortRef = useRef<AbortController | null>(null);

  const handleProviderChange = (value: string | null) => {
    if (!value) {
      return;
    }

    const nextProvider = getProvider(value);
    setProvider(nextProvider.value);
    setReportMode(nextProvider.mode);
    setBaseUrl(nextProvider.baseUrl);
    setModel(nextProvider.model);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!target.trim()) return;

    setReport({ status: "loading", content: "", error: "" });
    abortRef.current = new AbortController();

    try {
      const response = await fetch("/api/report/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target: target.trim(),
          analysis_years: Number.parseInt(analysisYears),
          analysis_lens: analysisLens,
          report_mode: reportMode,
          ...(apiKey && { api_key: apiKey }),
          ...(baseUrl && { base_url: baseUrl }),
          ...(model && { model: model }),
        }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          getErrorDetail(errorData) ||
            `HTTP ${response.status}: ${response.statusText}`,
        );
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Unable to read the response stream");

      const decoder = new TextDecoder();
      let content = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        content += decoder.decode(value, { stream: true });
        setReport({ status: "loading", content, error: "" });
      }

      setReport({ status: "done", content, error: "" });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setReport({
        status: "error",
        content: "",
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
    setReport((prev) => ({ ...prev, status: "idle" }));
  };

  const handleDownload = () => {
    const blob = new Blob([report.content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${target}_business_analysis_report.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isLoading = report.status === "loading";

  return (
    <div className="flex gap-6">
      {/* 左侧：参数面板 */}
      <div className="w-80 shrink-0 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="target">{TEXT.targetLabel}</Label>
            <Input
              id="target"
              placeholder={TEXT.targetPlaceholder}
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="years">{TEXT.yearsLabel}</Label>
            <Select
              value={analysisYears}
              onValueChange={(value) => value && setAnalysisYears(value)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 10 }, (_, i) => i + 1).map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {TEXT.yearsOption(y)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lens">{TEXT.lensLabel}</Label>
            <Select
              value={analysisLens}
              onValueChange={(value) => value && setAnalysisLens(value)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ANALYSIS_LENSES.map((lens) => (
                  <SelectItem key={lens} value={lens}>
                    {lens}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="provider">{TEXT.providerLabel}</Label>
            <Select
              value={provider}
              onValueChange={handleProviderChange}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODEL_PROVIDERS.map((provider) => (
                  <SelectItem key={provider.value} value={provider.value}>
                    {provider.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mode">{TEXT.modeLabel}</Label>
            <Select
              value={reportMode}
              onValueChange={(value) => value && setReportMode(value)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REPORT_MODES.map((mode) => (
                  <SelectItem key={mode.value} value={mode.value}>
                    {mode.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiKey">{TEXT.apiKeyLabel}</Label>
            <Input
              id="apiKey"
              type="password"
              placeholder={TEXT.apiKeyPlaceholder}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              disabled={isLoading}
            />
            <p className="text-muted-foreground text-xs">{TEXT.apiKeyHelp}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="model">{TEXT.modelLabel}</Label>
            <Input
              id="model"
              placeholder={TEXT.modelPlaceholder}
              value={model}
              onChange={(e) => setModel(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="baseUrl">{TEXT.baseUrlLabel}</Label>
            <Input
              id="baseUrl"
              placeholder={TEXT.baseUrlPlaceholder}
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="flex gap-2">
            {isLoading ? (
              <Button
                type="button"
                variant="destructive"
                className="flex-1"
                onClick={handleStop}
              >
                <Square className="mr-2 size-4" />
                {TEXT.stop}
              </Button>
            ) : (
              <Button
                type="submit"
                className="flex-1"
                disabled={!target.trim()}
              >
                <Sparkles className="mr-2 size-4" />
                {TEXT.generate}
              </Button>
            )}
          </div>
        </form>

        {/* 指标卡片 */}
        <div className="bg-muted/50 rounded-lg border p-4">
          <h3 className="mb-3 text-sm font-semibold">{TEXT.metricDashboard}</h3>
          <div className="space-y-2">
            {[
              { label: "Market share", value: "To verify" },
              { label: "Growth quality", value: "To verify" },
              { label: "Competitive intensity", value: "To verify" },
              { label: "Antifragility", value: "To assess" },
            ].map((metric) => (
              <div
                key={metric.label}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-muted-foreground">{metric.label}</span>
                <span className="font-medium">{metric.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 下载按钮 */}
        {report.status === "done" && report.content && (
          <Button variant="outline" className="w-full" onClick={handleDownload}>
            <Icons.Download className="mr-2 size-4" />
            {TEXT.download}
          </Button>
        )}
      </div>

      {/* 右侧：报告展示 */}
      <div className="min-w-0 flex-1">
        {report.status === "idle" && (
          <div className="text-muted-foreground flex h-64 items-center justify-center rounded-lg border border-dashed">
            <p>{TEXT.emptyState}</p>
          </div>
        )}

        {report.status === "loading" && !report.content && (
          <div className="flex h-64 items-center justify-center rounded-lg border">
            <Icons.Loader className="text-muted-foreground mr-2 size-5 animate-spin" />
            <span className="text-muted-foreground">{TEXT.loading}</span>
          </div>
        )}

        {report.error && (
          <div className="border-destructive bg-destructive/10 rounded-lg border p-4 text-sm text-red-600">
            {report.error}
          </div>
        )}

        {report.content && (
          <div className="prose dark:prose-invert max-w-none rounded-lg border p-6">
            <Textarea
              readOnly
              value={report.content}
              className="min-h-[500px] resize-none border-0 bg-transparent p-0 font-mono text-sm focus-visible:ring-0"
            />
          </div>
        )}
      </div>
    </div>
  );
};
