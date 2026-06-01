"use client";

/* oxlint-disable i18next/no-literal-string */

import {
  Sparkles,
  Square,
  Download,
  Loader2,
  Microscope,
  Network,
  Search,
  BarChart3,
  GitBranch,
  Grid3X3,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useState, useRef, useCallback } from "react";

import { Badge } from "@workspace/ui-web/badge";
import { Button } from "@workspace/ui-web/button";
import { Card, CardContent } from "@workspace/ui-web/card";
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
import { CalibrationChart } from "./serenity-tabs/calibration-chart";
import { ConvictionMatrix } from "./serenity-tabs/conviction-matrix";
import { SupplyChainMap } from "./serenity-tabs/supply-chain-map";

import type { FormEvent } from "react";

const ANALYSIS_MODES = [
  {
    value: "single",
    label: "Single Ticker",
    icon: Search,
    description: "Analyze one stock through Serenity's lens",
  },
  {
    value: "portfolio",
    label: "Portfolio Review",
    icon: BarChart3,
    description: "Review a watchlist against Serenity's views",
  },
  {
    value: "sector",
    label: "Sector View",
    icon: Network,
    description: "Form a forward sector outlook",
  },
] as const;

const MODEL_PROVIDERS = [
  {
    value: "deepseek",
    label: "DeepSeek V4",
    baseUrl: "https://api.deepseek.com",
    model: "deepseek-v4-flash",
  },
  {
    value: "openai",
    label: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
  },
  {
    value: "openrouter",
    label: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    model: "openai/gpt-4o-mini",
  },
  {
    value: "custom",
    label: "Custom",
    baseUrl: "",
    model: "",
  },
] as const;

const REPORT_LANGUAGES = [
  { value: "en", label: "English" },
  { value: "zh-TW", label: "繁體中文" },
];

const TICKER_UNIVERSE = [
  "NBIS",
  "AXTI",
  "LITE",
  "SIVE",
  "COHR",
  "AAOI",
  "IREN",
  "CRWV",
  "MU",
  "SNDK",
  "NVDA",
  "TSM",
  "MRVL",
  "AVGO",
  "INTC",
  "SOI",
  "IQE",
  "TSEM",
  "CIFR",
  "XLU",
  "VST",
  "CEG",
  "EWY",
];

interface AnalysisState {
  status: "idle" | "loading" | "done" | "error";
  content: string;
  error: string;
}

type ModeValue = (typeof ANALYSIS_MODES)[number]["value"];
type TabId = "quick" | "chain" | "matrix" | "calibration";

const TABS: { id: TabId; label: string; icon: typeof Zap }[] = [
  { id: "quick", label: "Quick Start", icon: Zap },
  { id: "chain", label: "Supply Chain", icon: GitBranch },
  { id: "matrix", label: "Conviction", icon: Grid3X3 },
  { id: "calibration", label: "Win Rate", icon: TrendingUp },
];

export const SerenityAnalyzer = () => {
  const [ticker, setTicker] = useState("");
  const [portfolioTickers, setPortfolioTickers] = useState("");
  const [mode, setMode] = useState<ModeValue>("single");
  const [provider, setProvider] = useState("deepseek");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("https://api.deepseek.com/v1");
  const [model, setModel] = useState("deepseek-chat");
  const [language, setLanguage] = useState("en");
  const [activeTab, setActiveTab] = useState<TabId>("quick");
  const [analysis, setAnalysis] = useState<AnalysisState>({
    status: "idle",
    content: "",
    error: "",
  });
  const abortRef = useRef<AbortController | null>(null);

  const handleProviderChange = (value: string | null) => {
    if (!value) return;
    setProvider(value);
    const p = MODEL_PROVIDERS.find((pr) => pr.value === value);
    if (p && p.value !== "custom") {
      setBaseUrl(p.baseUrl);
      setModel(p.model);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const primaryTicker =
      mode === "portfolio"
        ? portfolioTickers.split(/[,\s]+/).find(Boolean) || ticker.trim()
        : ticker.trim();
    if (!primaryTicker) return;

    setAnalysis({ status: "loading", content: "", error: "" });
    setActiveTab("quick");
    abortRef.current = new AbortController();

    try {
      const body: Record<string, unknown> = {
        ticker: primaryTicker,
        mode,
        language,
        ...(apiKey && { api_key: apiKey }),
        ...(baseUrl && { base_url: baseUrl }),
        ...(model && { model }),
      };
      if (mode === "portfolio") {
        body.tickers = portfolioTickers
          .split(/[,\s]+/)
          .map((t) => t.trim().toUpperCase())
          .filter(Boolean);
      }

      const response = await fetch("/api/report/serenity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const detail =
          errorData && typeof errorData === "object" && "detail" in errorData
            ? (errorData as { detail?: string }).detail
            : null;
        throw new Error(detail || `HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Unable to read response stream");

      const decoder = new TextDecoder();
      let content = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        content += decoder.decode(value, { stream: true });
        setAnalysis({ status: "loading", content, error: "" });
      }
      setAnalysis({ status: "done", content, error: "" });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setAnalysis({
        status: "error",
        content: "",
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
    setAnalysis((prev) => ({ ...prev, status: "idle" }));
  };

  const handleDownload = () => {
    const blob = new Blob([analysis.content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `serenity_${ticker}_${mode}_analysis.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleQuickTicker = (t: string) => {
    setTicker(t);
    if (mode === "portfolio") setPortfolioTickers(t);
  };

  const handleTickerFromTab = useCallback((t: string) => {
    setTicker(t);
    setMode("single");
    setActiveTab("quick");
  }, []);

  const isLoading = analysis.status === "loading";

  return (
    <div className="flex gap-6">
      {/* Left sidebar */}
      <div className="w-80 shrink-0 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Mode selector */}
          <div className="space-y-2">
            <Label>Analysis Mode</Label>
            <div className="grid grid-cols-1 gap-2">
              {ANALYSIS_MODES.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMode(m.value)}
                  className={`flex items-center gap-3 rounded-lg border p-3 text-left text-sm transition-colors ${
                    mode === m.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <m.icon className="size-4 shrink-0" />
                  <div>
                    <div className="font-medium">{m.label}</div>
                    <div className="text-muted-foreground text-xs">
                      {m.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Ticker input */}
          {mode === "single" || mode === "sector" ? (
            <div className="space-y-2">
              <Label htmlFor="ticker">
                {mode === "sector" ? "Sector Focus" : "Ticker Symbol"}
              </Label>
              <Input
                id="ticker"
                placeholder={
                  mode === "sector" ? "photonics / memory / power" : "NVDA"
                }
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                disabled={isLoading}
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="portfolio">
                Tickers (comma or space separated)
              </Label>
              <Input
                id="portfolio"
                placeholder="NVDA, AXTI, LITE, MU"
                value={portfolioTickers}
                onChange={(e) => setPortfolioTickers(e.target.value)}
                disabled={isLoading}
              />
            </div>
          )}

          {/* Quick ticker chips */}
          {mode === "single" && (
            <div className="space-y-1.5">
              <Label className="text-xs">Serenity Universe</Label>
              <div className="flex flex-wrap gap-1.5">
                {TICKER_UNIVERSE.slice(0, 12).map((t) => (
                  <Badge
                    key={t}
                    variant={ticker === t ? "default" : "outline"}
                    className="cursor-pointer text-xs"
                    onClick={() => handleQuickTicker(t)}
                  >
                    {t}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Language */}
          <div className="space-y-2">
            <Label>Language</Label>
            <Select value={language} onValueChange={(v) => v && setLanguage(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REPORT_LANGUAGES.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Provider */}
          <div className="space-y-2">
            <Label>AI Provider</Label>
            <Select value={provider} onValueChange={handleProviderChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODEL_PROVIDERS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* API Key */}
          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="Only used for this request"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              disabled={isLoading}
            />
            <p className="text-muted-foreground text-xs">
              Sent only with this request, never stored.
            </p>
          </div>

          {/* Model */}
          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Input
              id="model"
              placeholder="deepseek-chat"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {/* Base URL */}
          <div className="space-y-2">
            <Label htmlFor="baseUrl">Base URL</Label>
            <Input
              id="baseUrl"
              placeholder="https://api.deepseek.com/v1"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {/* Submit */}
          <div className="flex gap-2">
            {isLoading ? (
              <Button
                type="button"
                variant="destructive"
                className="flex-1"
                onClick={handleStop}
              >
                <Square className="mr-2 size-4" /> Stop
              </Button>
            ) : (
              <Button
                type="submit"
                className="flex-1"
                disabled={
                  mode === "portfolio"
                    ? !portfolioTickers.trim()
                    : !ticker.trim()
                }
              >
                <Sparkles className="mr-2 size-4" /> Analyze
              </Button>
            )}
          </div>
        </form>

        {/* Disclaimer */}
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
          <CardContent className="pt-4">
            <p className="text-xs text-amber-800 dark:text-amber-300">
              <strong>Disclaimer:</strong> Decision-support analysis only. Not
              financial advice. Serenity&apos;s returns are self-reported and
              unverified.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Right side: tabs + content */}
      <div className="min-w-0 flex-1">
        {/* Tab bar */}
        <div className="bg-muted/30 mb-4 flex gap-1 rounded-lg border p-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="size-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "chain" && (
          <SupplyChainMap onTickerClick={handleTickerFromTab} />
        )}
        {activeTab === "matrix" && (
          <ConvictionMatrix onTickerClick={handleTickerFromTab} />
        )}
        {activeTab === "calibration" && <CalibrationChart />}

        {activeTab === "quick" && (
          <>
            {analysis.status === "idle" && (
              <Card className="flex h-[600px] items-center justify-center">
                <CardContent className="text-center">
                  <Microscope className="text-muted-foreground mx-auto mb-4 size-12" />
                  <p className="text-muted-foreground text-lg font-medium">
                    Enter a ticker and run Serenity&apos;s supply-chain analysis
                  </p>
                  <p className="text-muted-foreground/60 mt-2 text-sm">
                    Or explore the Supply Chain, Conviction, and Win Rate tabs.
                  </p>
                </CardContent>
              </Card>
            )}

            {analysis.status === "loading" && !analysis.content && (
              <Card className="flex h-[600px] items-center justify-center">
                <CardContent className="text-center">
                  <Loader2 className="text-primary mx-auto mb-4 size-10 animate-spin" />
                  <p className="text-muted-foreground font-medium">
                    Running supply-chain analysis...
                  </p>
                  <p className="text-muted-foreground/60 mt-2 text-sm">
                    Mapping the chain, identifying bottlenecks,
                    cross-referencing Serenity&apos;s theses.
                  </p>
                </CardContent>
              </Card>
            )}

            {analysis.error && (
              <div className="border-destructive bg-destructive/10 rounded-lg border p-4 text-sm text-red-600">
                {analysis.error}
              </div>
            )}

            {analysis.content && (
              <>
                {isLoading && (
                  <div className="mb-3 flex items-center gap-2">
                    <Badge variant="secondary" className="animate-pulse">
                      <Loader2 className="mr-1 size-3 animate-spin" />
                      Streaming...
                    </Badge>
                  </div>
                )}
                <ReportViewer content={analysis.content} />
              </>
            )}

            {analysis.status === "done" && analysis.content && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={handleDownload}
              >
                <Download className="mr-2 size-4" /> Download Markdown
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
};
