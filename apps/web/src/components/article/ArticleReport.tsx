"use client";

/* oxlint-disable i18next/no-literal-string */

/**
 * Research Article Renderer (#116)
 *
 * Renders a structured ResearchArticle as a readable Chinese research report.
 * 8 sections: entity → thesis → industry chain → evidence → company → risks → invalidation → disclaimer
 */
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  FileText,
  GitBranch,
  Shield,
  Table2,
  Target,
} from "lucide-react";

import { ArticleSection, ArticleVisual } from "./ArticleVisuals";

import type { ResearchArticle } from "@workspace/shared/types/article";

interface ArticleReportProps {
  article: ResearchArticle;
  className?: string;
}

export function ArticleReport({ article, className }: ArticleReportProps) {
  const {
    entity,
    coreThesis,
    industryChain,
    evidenceMatrix,
    companyLayer,
    conclusion,
    evidence,
  } = article;

  return (
    <div className={`space-y-8 ${className ?? ""}`}>
      {/* ── 1. Entity Lock ── */}
      <div className="rounded-lg border-l-2 border-emerald-500 bg-emerald-50/50 px-4 py-3 dark:border-emerald-700 dark:bg-emerald-950/20">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-muted-foreground mb-1 font-mono text-[10px] tracking-widest uppercase">
              实体锁定
            </p>
            <h2 className="text-lg leading-tight font-semibold">
              {entity.resolvedName}
            </h2>
            <div className="text-muted-foreground mt-1.5 flex flex-wrap gap-2 text-xs">
              {entity.ticker && (
                <span
                  className="notranslate rounded-full border px-2 py-0.5 font-mono"
                  translate="no"
                >
                  {entity.ticker}
                </span>
              )}
              {entity.exchange && (
                <span className="rounded-full border px-2 py-0.5">
                  {entity.exchange}
                </span>
              )}
              {entity.sector && (
                <span className="rounded-full border px-2 py-0.5">
                  {entity.sector}
                </span>
              )}
              {entity.industry && (
                <span className="rounded-full border px-2 py-0.5">
                  {entity.industry}
                </span>
              )}
              <span className="rounded-full border px-2 py-0.5">
                {entity.mode === "ticker" ? "公司模式" : "产业模式"}
              </span>
            </div>
          </div>
          <span className="text-muted-foreground shrink-0 font-mono text-[10px]">
            {entity.dataTimestamp}
          </span>
        </div>
      </div>

      {/* ── 2. Core Thesis ── */}
      <div className="border-primary/30 bg-primary/5 rounded-lg border-l-2 px-4 py-4">
        <p className="text-primary mb-2 font-mono text-[10px] tracking-widest uppercase">
          核心判断
        </p>
        <p className="text-foreground text-base leading-relaxed font-medium">
          {coreThesis.thesis}
        </p>
        <div className="mt-3 space-y-1.5">
          <p className="text-muted-foreground text-sm">
            <span className="text-foreground font-semibold">关键驱动: </span>
            {coreThesis.keyDriver}
          </p>
          {coreThesis.nonConsensus && (
            <p className="text-muted-foreground text-sm">
              <span className="text-foreground font-semibold">非共识: </span>
              {coreThesis.nonConsensus}
            </p>
          )}
        </div>
      </div>

      {/* ── 3. Industry Chain + Mermaid ── */}
      <ArticleSection label="产业链分析" icon={GitBranch}>
        <p className="text-foreground/90 mb-4 text-sm leading-relaxed">
          {industryChain.narrative}
        </p>
        <ArticleVisual visual={industryChain.visual} />
      </ArticleSection>

      {/* ── 4. Evidence Matrix + Table ── */}
      <ArticleSection label="证据矩阵" icon={Table2}>
        <p className="text-foreground/90 mb-4 text-sm leading-relaxed">
          {evidenceMatrix.narrative}
        </p>
        <ArticleVisual visual={evidenceMatrix.visual} />
      </ArticleSection>

      {/* ── 5. Company Layer ── */}
      <ArticleSection label="公司分层" icon={Building2}>
        <p className="text-foreground/90 mb-4 text-sm leading-relaxed">
          {companyLayer.narrative}
        </p>
        {companyLayer.visual && <ArticleVisual visual={companyLayer.visual} />}
      </ArticleSection>

      {/* ── 6. Conclusion: Summary ── */}
      <ArticleSection label="结论" icon={Target}>
        <p className="text-foreground text-sm leading-relaxed font-medium">
          {conclusion.summary}
        </p>
      </ArticleSection>

      {/* ── 7. Risks ── */}
      <ArticleSection label="风险提示" icon={Shield}>
        <div className="space-y-2">
          {conclusion.risks.map((r, i) => (
            <div
              key={i}
              className="flex gap-3 rounded-lg border border-amber-200/50 bg-amber-50/30 px-3 py-2.5 dark:border-amber-900/30 dark:bg-amber-950/10"
            >
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
              <div>
                <p className="text-sm font-medium">{r.risk}</p>
                {r.explanation && (
                  <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
                    {r.explanation}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </ArticleSection>

      {/* ── 8. Invalidation Conditions ── */}
      <ArticleSection label="失效条件" icon={AlertCircle}>
        <div className="space-y-2">
          {conclusion.invalidationConditions.map((inv, i) => (
            <div key={i} className="rounded-lg border px-3 py-2.5">
              <p className="text-sm leading-relaxed">{inv.condition}</p>
              {(inv.metric || inv.threshold) && (
                <p className="text-muted-foreground mt-1 font-mono text-xs">
                  {inv.metric && <span>指标: {inv.metric}</span>}
                  {inv.metric && inv.threshold && <span> · </span>}
                  {inv.threshold && <span>阈值: {inv.threshold}</span>}
                </p>
              )}
            </div>
          ))}
        </div>
      </ArticleSection>

      {/* ── Evidence Spine ── */}
      <ArticleSection label="证据清单" icon={FileText}>
        <div className="overflow-hidden rounded-lg border">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className="bg-muted/50 border-b px-3 py-2 text-left text-[10px] font-semibold tracking-widest uppercase">
                  ID
                </th>
                <th className="bg-muted/50 border-b px-3 py-2 text-left text-[10px] font-semibold tracking-widest uppercase">
                  论点
                </th>
                <th className="bg-muted/50 border-b px-3 py-2 text-left text-[10px] font-semibold tracking-widest uppercase">
                  来源
                </th>
                <th className="bg-muted/50 border-b px-3 py-2 text-left text-[10px] font-semibold tracking-widest uppercase">
                  日期
                </th>
                <th className="bg-muted/50 border-b px-3 py-2 text-left text-[10px] font-semibold tracking-widest uppercase">
                  置信度
                </th>
              </tr>
            </thead>
            <tbody>
              {evidence.map((ev) => (
                <tr key={ev.id} className="border-b last:border-b-0">
                  <td className="px-3 py-2 font-mono text-xs font-semibold">
                    {ev.id}
                  </td>
                  <td className="px-3 py-2 text-sm">{ev.claim}</td>
                  <td className="px-3 py-2">
                    {ev.url ? (
                      <a
                        href={ev.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {ev.source}
                      </a>
                    ) : (
                      <span className="notranslate" translate="no">
                        {ev.source}
                      </span>
                    )}
                  </td>
                  <td className="text-muted-foreground px-3 py-2 font-mono text-xs">
                    {ev.date}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        ev.confidence === "verified"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                          : ev.confidence === "partial"
                            ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300"
                            : "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300"
                      }`}
                    >
                      {ev.confidence === "verified" && (
                        <CheckCircle2 className="h-2.5 w-2.5" />
                      )}
                      {ev.confidence === "verified"
                        ? "已验证"
                        : ev.confidence === "partial"
                          ? "部分验证"
                          : "未验证"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ArticleSection>

      {/* ── Footer ── */}
      <div className="space-y-2 border-t pt-4">
        <p className="text-muted-foreground text-xs leading-relaxed">
          {article.disclaimer}
        </p>
        <div className="text-muted-foreground/60 flex flex-wrap gap-3 text-[10px]">
          <span>
            生成时间: {new Date(article.generatedAt).toLocaleString("zh-CN")}
          </span>
          {article.model && <span>模型: {article.model}</span>}
          <span>Schema v{article.schema_version}</span>
        </div>
      </div>
    </div>
  );
}
