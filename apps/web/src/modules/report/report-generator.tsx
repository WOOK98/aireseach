"use client";

import {
  Sparkles,
  Square,
  FileText,
  Download,
  Loader2,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { useState, useRef, useCallback } from "react";

import { Badge } from "@workspace/ui-web/badge";
import { Button } from "@workspace/ui-web/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui-web/card";
import { Input } from "@workspace/ui-web/input";
import { Label } from "@workspace/ui-web/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui-web/select";

import { ReportViewer } from "./report-viewer";

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
  apiKeyHelp:
    "Your key is sent only with this request and is not stored by Aireseach.",
  modelLabel: "Model",
  modelPlaceholder: "gpt-4o-mini / deepseek-chat / openai/gpt-4o-mini",
  baseUrlLabel: "Base URL",
  baseUrlPlaceholder: "https://api.openai.com/v1",
  stop: "Stop",
  generate: "Generate report",
  metricDashboard: "Metric dashboard",
  download: "Download Markdown",
  emptyState: "Enter a research target and generate a search-grounded report.",
  emptyDescription:
    "Reports include market share, competitive landscape, financial metrics, and risk analysis.",
  loading: "Generating your report...",
  loadingDescription: "This may take 1-2 minutes for deep research.",
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
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const toggleSidebar = useCallback(() => setSidebarOpen((v) => !v), []);

  return (
    <div className="relative flex gap-6">
      {/* Toggle button */}
      <Button
        variant="outline"
        size="icon"
        className="absolute top-0 right-0 z-10 lg:hidden"
        onClick={toggleSidebar}
      >
        {sidebarOpen ? (
          <PanelLeftClose className="size-4" />
        ) : (
          <PanelLeft className="size-4" />
        )}
      </Button>

      {/* Left sidebar */}
      <div
        className={`${sidebarOpen ? "w-80" : "w-0 overflow-hidden opacity-0"} shrink-0 space-y-6 transition-all duration-300`}
      >
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

        {/* Metric dashboard */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">{TEXT.metricDashboard}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Market share", value: "Pending", icon: "📊" },
              { label: "Growth quality", value: "Pending", icon: "📈" },
              { label: "Competitive intensity", value: "Pending", icon: "⚔️" },
              { label: "Antifragility", value: "Pending", icon: "🛡️" },
            ].map((metric) => (
              <div
                key={metric.label}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <span className="text-xs">{metric.icon}</span>
                  {metric.label}
                </span>
                <Badge variant="outline" className="font-mono text-xs">
                  {metric.value}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Download button */}
        {report.status === "done" && report.content && (
          <Button variant="outline" className="w-full" onClick={handleDownload}>
            <Download className="mr-2 size-4" />
            {TEXT.download}
          </Button>
        )}
      </div>

      {/* Right side: report display */}
      <div className="min-w-0 flex-1">
        {report.status === "idle" && (
          <Card className="flex h-[600px] items-center justify-center">
            <CardContent className="text-center">
              <FileText className="text-muted-foreground mx-auto mb-4 size-12" />
              <p className="text-muted-foreground text-lg font-medium">
                {TEXT.emptyState}
              </p>
              <p className="text-muted-foreground/60 mt-2 text-sm">
                {TEXT.emptyDescription}
              </p>
            </CardContent>
          </Card>
        )}

        {report.status === "loading" && !report.content && (
          <Card className="flex h-[600px] items-center justify-center">
            <CardContent className="text-center">
              <Loader2 className="text-primary mx-auto mb-4 size-10 animate-spin" />
              <p className="text-muted-foreground font-medium">
                {TEXT.loading}
              </p>
              <p className="text-muted-foreground/60 mt-2 text-sm">
                {TEXT.loadingDescription}
              </p>
            </CardContent>
          </Card>
        )}

        {report.error && (
          <div className="border-destructive bg-destructive/10 rounded-lg border p-4 text-sm text-red-600">
            {report.error}
          </div>
        )}

        {report.content && (
          <>
            {/* Streaming indicator */}
            {isLoading && (
              <div className="mb-3 flex items-center gap-2">
                <Badge variant="secondary" className="animate-pulse">
                  <Loader2 className="mr-1 size-3 animate-spin" />
                  Streaming...
                </Badge>
              </div>
            )}
            <ReportViewer content={report.content} />
          </>
        )}
      </div>
    </div>
  );
};
