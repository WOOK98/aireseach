"use client";

import { FileText, Sparkles, Square } from "lucide-react";
import { useState, useRef } from "react";

import { cn } from "@workspace/ui";
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
  "综合",
  "估值与财务质量",
  "市场份额与竞争格局",
  "现金流与资产质量",
  "抗脆弱性与风险",
  "增长与商业模式",
];

const REPORT_MODES = [
  { value: "jina_llm", label: "Jina 搜索 + LLM（便宜）" },
  { value: "deep_research", label: "Perplexity 深度研究" },
];

interface ReportState {
  status: "idle" | "loading" | "done" | "error";
  content: string;
  error: string;
}

export const ReportGenerator = () => {
  const [target, setTarget] = useState("");
  const [analysisYears, setAnalysisYears] = useState("5");
  const [analysisLens, setAnalysisLens] = useState("综合");
  const [reportMode, setReportMode] = useState("jina_llm");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");
  const [report, setReport] = useState<ReportState>({
    status: "idle",
    content: "",
    error: "",
  });
  const abortRef = useRef<AbortController | null>(null);

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
          errorData?.detail ||
            `HTTP ${response.status}: ${response.statusText}`,
        );
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("无法读取响应流");

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
        error: err instanceof Error ? err.message : "未知错误",
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
    a.download = `${target}_商业分析报告.md`;
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
            <Label htmlFor="target">分析目标</Label>
            <Input
              id="target"
              placeholder="例如：瑞幸咖啡 / Tesla / 北美储能电池市场"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="years">回看年限</Label>
            <Select
              value={analysisYears}
              onValueChange={setAnalysisYears}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 10 }, (_, i) => i + 1).map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    近 {y} 年
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lens">分析视角</Label>
            <Select
              value={analysisLens}
              onValueChange={setAnalysisLens}
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
            <Label htmlFor="mode">生成模式</Label>
            <Select
              value={reportMode}
              onValueChange={setReportMode}
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
            <Label htmlFor="apiKey">API Key（可选）</Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="留空则使用后端环境变量"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="model">模型名称（可选）</Label>
            <Input
              id="model"
              placeholder="例如：deepseek-chat / sonar-deep-research"
              value={model}
              onChange={(e) => setModel(e.target.value)}
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
                停止生成
              </Button>
            ) : (
              <Button
                type="submit"
                className="flex-1"
                disabled={!target.trim()}
              >
                <Sparkles className="mr-2 size-4" />
                启动分析
              </Button>
            )}
          </div>
        </form>

        {/* 指标卡片 */}
        <div className="bg-muted/50 rounded-lg border p-4">
          <h3 className="mb-3 text-sm font-semibold">指标仪表盘</h3>
          <div className="space-y-2">
            {[
              { label: "市场份额", value: "待核验" },
              { label: "增长质量", value: "待核验" },
              { label: "竞争强度", value: "待核验" },
              { label: "抗脆弱性", value: "待判断" },
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
            下载 Markdown
          </Button>
        )}
      </div>

      {/* 右侧：报告展示 */}
      <div className="min-w-0 flex-1">
        {report.status === "idle" && (
          <div className="text-muted-foreground flex h-64 items-center justify-center rounded-lg border border-dashed">
            <p>输入分析目标，点击「启动分析」开始生成报告</p>
          </div>
        )}

        {report.status === "loading" && !report.content && (
          <div className="flex h-64 items-center justify-center rounded-lg border">
            <Icons.Loader className="text-muted-foreground mr-2 size-5 animate-spin" />
            <span className="text-muted-foreground">
              Agent 正在检索数据并生成报告…
            </span>
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
