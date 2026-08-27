/**
 * Note Export — Markdown serializer (#180, #152 knife-5)
 *
 * Pure function: NoteDetail → Markdown. No React, no fetch, no clock
 * dependency beyond the optional exportedAt override (testable).
 *
 * REDLINES:
 * - 缺失的元数据渲染为 N/A，绝不编 0 或伪造新鲜度。
 * - Live 块导出时显式标注 stale/核实状态（unverified ≠ no change）。
 * - 合规扫描作用于最终文档：命中受限表述则整体拦截，绝不静默产出
 *   「看似完整」的半成品。
 * - 导出器自身绝不引入目标价/评级类语言。
 */
import { PROHIBITED_ARTICLE_PATTERN } from "@workspace/shared/schema/article";

import {
  blockDateLabel,
  blockRefreshErrorLabel,
  confidenceLabel,
  staleStateLabel,
} from "./live-block-view";

import type { DraftNoteArtifact } from "@workspace/shared/schema/article";
import type { LiveBlock } from "@workspace/shared/schema/live-block";
import type {
  ArticleVisual,
  EvidenceRef,
  ResearchArticle,
} from "@workspace/shared/types/article";

/** Structural subset of NoteDetail — keeps this module free of client deps. */
export interface NoteExportInput {
  title: string;
  summary: string | null;
  note: string | null;
  tags: string[];
  kind: string;
  entityTicker: string | null;
  entityName: string | null;
  evidenceCount: number;
  asOf: string;
  artifact: ResearchArticle | DraftNoteArtifact;
  liveBlocks: LiveBlock[];
}

export type NoteExportResult =
  | { ok: true; markdown: string; fileName: string }
  | { ok: false; reason: string };

const NA = "N/A";

function orNA(value: string | null | undefined): string {
  const v = value?.trim();
  return v && v.length > 0 ? v : NA;
}

/** Blockquote every line of a possibly multi-line user/source text. */
function quote(text: string): string {
  return text
    .split("\n")
    .map((line) => (line.length > 0 ? `> ${line}` : ">"))
    .join("\n");
}

/** Escape pipes so arbitrary cell text cannot break the table layout. */
function cell(text: string): string {
  return text.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

// ── File name ────────────────────────────────────────────────────────────────

export function exportFileName(note: { title: string; asOf: string }): string {
  const base = note.title.trim() || "research-note";
  const slug =
    base
      .replace(/[\\/:*?"<>|#%&{}$!'@+`=\s]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60)
      .replace(/^-+|-+$/g, "") || "research-note";
  const date = note.asOf.trim() || "unknown-date";
  return `${slug}-${date}.md`;
}

// ── Visuals ──────────────────────────────────────────────────────────────────

function visualToMarkdown(visual: ArticleVisual, lines: string[]): void {
  switch (visual.kind) {
    case "mermaid":
      lines.push(
        `**${visual.title}**`,
        "",
        "```mermaid",
        visual.diagram,
        "```",
      );
      lines.push("", `> 来源：${visual.source} · 日期：${visual.date}`, "");
      return;
    case "matrix": {
      lines.push(`**${visual.title}**`, "");
      lines.push(`| ${visual.columns.map(cell).join(" | ")} |`);
      lines.push(`| ${visual.columns.map(() => "---").join(" | ")} |`);
      for (const row of visual.rows) {
        lines.push(
          `| ${visual.columns.map((c) => cell(row[c]?.trim() || NA)).join(" | ")} |`,
        );
      }
      lines.push("", `> 来源：${visual.source} · 日期：${visual.date}`, "");
      return;
    }
    case "chart": {
      // 图表无法内嵌，但数据必须诚实落地 — 序列化为表格，缺值是 N/A 不是 0。
      lines.push(`**${visual.title}**（图表 · 数据如下）`, "");
      lines.push(
        `| 指标 | ${visual.series.map((s) => cell(s.name)).join(" | ")} |`,
      );
      lines.push(`| --- | ${visual.series.map(() => "---").join(" | ")} |`);
      visual.labels.forEach((label, i) => {
        const values = visual.series.map((s) => {
          const v = s.values[i];
          return typeof v === "number" && Number.isFinite(v) ? String(v) : NA;
        });
        lines.push(`| ${cell(label)} | ${values.join(" | ")} |`);
      });
      lines.push("", `> 来源：${visual.source} · 日期：${visual.date}`, "");
      return;
    }
    case "empty":
      lines.push(`*${visual.title} — 暂无可视化：${visual.reason}*`, "");
      return;
  }
}

// ── Evidence ─────────────────────────────────────────────────────────────────

function evidenceToMarkdown(evidence: EvidenceRef[], lines: string[]): void {
  lines.push("## 证据清单", "");
  if (evidence.length === 0) {
    lines.push("*无证据记录*", "");
    return;
  }
  for (const ev of evidence) {
    lines.push(`- **[${ev.id}]** ${ev.claim}`);
    const url = ev.url?.trim() ? ` · ${ev.url.trim()}` : "";
    lines.push(
      `  - 来源：${orNA(ev.source)} · 日期：${orNA(ev.date)} · 核实：${confidenceLabel(ev.confidence)}${url}`,
    );
  }
  lines.push("");
}

// ── Live Blocks ──────────────────────────────────────────────────────────────

function liveBlocksToMarkdown(blocks: LiveBlock[], lines: string[]): void {
  lines.push("## Live 证据块", "");
  if (blocks.length === 0) {
    lines.push("*暂无 Live 证据块*", "");
    return;
  }
  for (const b of blocks) {
    lines.push(`### ${b.title}`, "");
    lines.push(`- 状态：${staleStateLabel(b.staleState)}`);
    lines.push(`- 来源：${orNA(b.source)} · ${blockDateLabel(b)}`);
    lines.push(
      `- 上次刷新：${b.lastRefreshedAt ? b.lastRefreshedAt.slice(0, 19).replace("T", " ") : NA}`,
    );
    if (b.sourceUrl?.trim()) lines.push(`- 链接：${b.sourceUrl.trim()}`);
    const failure = blockRefreshErrorLabel(b);
    if (failure) lines.push(`- 刷新失败原因：${failure}`);
    lines.push("");
    if (b.type === "evidence_ref") {
      lines.push(quote(b.content.claim), ">");
      lines.push(
        `> 数据日期：${orNA(b.content.date)} · 核实：${confidenceLabel(b.content.confidence)}`,
      );
    } else {
      lines.push(quote(b.content.excerpt));
    }
    lines.push("");
  }
}

// ── Artifacts ────────────────────────────────────────────────────────────────

function articleToMarkdown(article: ResearchArticle, lines: string[]): void {
  const e = article.entity;
  lines.push("## 研究对象", "");
  lines.push(`- 名称：${orNA(e.resolvedName)}`);
  lines.push(`- 代码：${orNA(e.ticker)}`);
  lines.push(`- 市场：${orNA(e.exchange)}`);
  lines.push(
    `- 行业：${[e.sector, e.industry].filter((v) => v?.trim()).join(" / ") || NA}`,
  );
  lines.push(`- 数据时间：${orNA(e.dataTimestamp)}`);
  lines.push(`- 研究模式：${e.mode === "ticker" ? "公司" : "行业"}`, "");

  lines.push("## 核心论点", "");
  lines.push(article.coreThesis.thesis, "");
  lines.push(`- 关键驱动：${orNA(article.coreThesis.keyDriver)}`);
  if (article.coreThesis.nonConsensus?.trim()) {
    lines.push(`- 非共识观点：${article.coreThesis.nonConsensus.trim()}`);
  }
  lines.push("");

  lines.push("## 产业链", "");
  lines.push(article.industryChain.narrative, "");
  visualToMarkdown(article.industryChain.visual, lines);

  lines.push("## 证据矩阵", "");
  lines.push(article.evidenceMatrix.narrative, "");
  visualToMarkdown(article.evidenceMatrix.visual, lines);

  lines.push("## 公司层面", "");
  lines.push(article.companyLayer.narrative, "");
  if (article.companyLayer.visual) {
    visualToMarkdown(article.companyLayer.visual, lines);
  }

  lines.push("## 结论", "");
  lines.push(article.conclusion.summary, "");
  lines.push("### 风险", "");
  article.conclusion.risks.forEach((risk, i) => {
    const explanation = risk.explanation?.trim();
    lines.push(
      `${i + 1}. **${risk.risk}**${explanation ? ` — ${explanation}` : ""}`,
    );
  });
  lines.push("", "### 失效条件", "");
  article.conclusion.invalidationConditions.forEach((c, i) => {
    const metric = c.metric?.trim() || NA;
    const threshold = c.threshold?.trim() || NA;
    lines.push(
      `${i + 1}. ${c.condition}（指标：${metric} · 阈值：${threshold}）`,
    );
  });
  lines.push("");
}

function draftToMarkdown(draft: DraftNoteArtifact, lines: string[]): void {
  const s = draft.source;
  lines.push("## 来源", "");
  lines.push(`- 类型：${orNA(s.sourceType)}`);
  lines.push(`- 标题：${orNA(s.title)}`);
  lines.push(`- 链接：${orNA(s.url)}`);
  lines.push(`- 作者：${orNA(s.author)}`);
  lines.push(`- 发布于：${orNA(s.publishedAt)}`);
  lines.push(`- 收录于：${orNA(draft.capturedAt)}`, "");
  if (s.rawText?.trim()) {
    lines.push("## 原文摘录", "", quote(s.rawText.trim()), "");
  }
}

// ── Entry point ──────────────────────────────────────────────────────────────

/**
 * Serialize a note to Markdown. Returns a blocked result when the final
 * document trips the compliance pattern — the UI shows the reason and
 * produces no file, rather than emitting a silently-partial export.
 */
export function noteToMarkdown(
  note: NoteExportInput,
  exportedAt?: string,
): NoteExportResult {
  const exported = exportedAt ?? new Date().toISOString();
  const asOf = note.asOf.trim() || NA;
  const lines: string[] = [];

  lines.push(`# ${note.title.trim() || "无标题笔记"}`, "");
  const meta: string[] = [
    `快照时间：${asOf}`,
    `实体：${note.entityName?.trim() || NA}${note.entityTicker?.trim() ? `（${note.entityTicker.trim()}）` : ""}`,
    `证据 ${note.evidenceCount} 条`,
  ];
  if (note.tags.length > 0) meta.push(`标签：${note.tags.join("、")}`);
  lines.push(quote(meta.join(" · ")), "");

  if (note.summary?.trim()) {
    lines.push("## 摘要", "", note.summary.trim(), "");
  }
  if (note.note?.trim()) {
    lines.push("## 我的批注", "", note.note.trim(), "");
  }

  if ("kind" in note.artifact && note.artifact.kind === "draft") {
    draftToMarkdown(note.artifact, lines);
  } else {
    articleToMarkdown(note.artifact as ResearchArticle, lines);
  }

  evidenceToMarkdown(note.artifact.evidence, lines);
  liveBlocksToMarkdown(note.liveBlocks ?? [], lines);

  if (!("kind" in note.artifact)) {
    lines.push("---", "", note.artifact.disclaimer, "");
  }
  lines.push(
    `> 导出于 ${exported} · 正文为 ${asOf} 快照，不会随后续数据自动更新；Live 块状态以导出时刻为准。`,
    "",
  );

  const markdown = lines.join("\n");
  if (PROHIBITED_ARTICLE_PATTERN.test(markdown)) {
    return {
      ok: false,
      reason: "导出内容包含受限表述，已按合规规则拦截，未生成文件。",
    };
  }
  return { ok: true, markdown, fileName: exportFileName(note) };
}
