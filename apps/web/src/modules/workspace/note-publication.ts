/**
 * Note Publication — workspace-level export/publish preview (#190)
 *
 * Composes a note's full document into Markdown + HTML for manual
 * copy/download/preview. Zero publishing side effects.
 *
 * Structure:
 *   1. 标题 + 审阅提醒 + 元数据
 *   2. 正文（用户 doc_blocks，排除占位块）
 *   3. 附录 A · 研究快照（不可变 as-of artifact）
 *   4. 附录 B · 证据清单
 *   5. 附录 C · Live 证据块（实时快照，标注 live 状态与日期）
 *   6. 导出信息 + disclaimer（article kind）
 *
 * REDLINES:
 * - 缺失元数据渲染 N/A，绝不编 0 或伪造。
 * - placeholder blocks (evidence_placeholder / live_placeholder) 不导出。
 * - 合规扫描：PROHIBITED_ARTICLE_PATTERN 拦截整体导出。
 * - 不暴露 provider 名称、env vars、内部路径。
 * - 不引入目标价/评级语言。
 */

import { PROHIBITED_ARTICLE_PATTERN } from "@workspace/shared/schema/article";

import {
  blockDateLabel,
  confidenceLabel,
  staleStateLabel,
} from "../notes/live-block-view";

import type { DraftNoteArtifact } from "@workspace/shared/schema/article";
import type { LiveBlock } from "@workspace/shared/schema/live-block";
import type { NoteBlock } from "@workspace/shared/schema/note-block";
import type {
  ArticleVisual,
  EvidenceRef,
  ResearchArticle,
} from "@workspace/shared/types/article";

// ── Input ───────────────────────────────────────────────────────────────────

export interface NotePublicationInput {
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
  /** User-authored doc blocks from the workspace document canvas. */
  blocks: NoteBlock[];
}

export type NotePublicationResult =
  | { ok: true; markdown: string; html: string; fileStem: string }
  | { ok: false; reason: string };

// ── Helpers ─────────────────────────────────────────────────────────────────

const NA = "N/A";

function orNA(value: string | null | undefined): string {
  const v = value?.trim();
  return v && v.length > 0 ? v : NA;
}

function esc(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function cell(text: string): string {
  return text.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function fileStem(note: { title: string; asOf: string }): string {
  const base = note.title.trim() || "research-note";
  return (
    (base
      .replace(/[\\/:*?"<>|#%&{}$!'@+`=\s]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60)
      .replace(/^-+|-+$/g, "") || "research-note") +
    `-${note.asOf.trim() || "unknown-date"}`
  );
}

// ── IR ──────────────────────────────────────────────────────────────────────

export type PubNode =
  | { kind: "heading"; level: 1 | 2 | 3 | 4; text: string }
  | { kind: "paragraph"; text: string; italic?: boolean }
  | { kind: "quote"; text: string }
  | { kind: "list"; ordered: boolean; items: string[] }
  | { kind: "tasks"; items: { text: string; checked: boolean }[] }
  | { kind: "callout"; text: string }
  | { kind: "table"; columns: string[]; rows: string[][] }
  | { kind: "code"; lang: string; code: string }
  | { kind: "rule" };

// ── Markdown renderer ──────────────────────────────────────────────────────

export function renderMarkdown(nodes: PubNode[]): string {
  const out: string[] = [];
  for (const n of nodes) {
    switch (n.kind) {
      case "heading":
        out.push(`${"#".repeat(n.level)} ${n.text}`, "");
        break;
      case "paragraph":
        out.push(n.italic ? `*${n.text}*` : n.text, "");
        break;
      case "quote":
        for (const line of n.text.split("\n")) {
          out.push(`> ${line}`);
        }
        out.push("");
        break;
      case "list":
        n.items.forEach((item, i) => {
          out.push(n.ordered ? `${i + 1}. ${item}` : `- ${item}`);
        });
        out.push("");
        break;
      case "tasks":
        n.items.forEach((item) => {
          out.push(`- [${item.checked ? "x" : " "}] ${item.text}`);
        });
        out.push("");
        break;
      case "callout":
        out.push(`> **提示：** ${n.text}`, "");
        break;
      case "table":
        out.push(`| ${n.columns.map(cell).join(" | ")} |`);
        out.push(`| ${n.columns.map(() => "---").join(" | ")} |`);
        for (const row of n.rows) {
          out.push(`| ${row.map((c) => cell(c?.trim() || NA)).join(" | ")} |`);
        }
        out.push("");
        break;
      case "code":
        out.push(`\`\`\`${n.lang}`, n.code, "```", "");
        break;
      case "rule":
        out.push("---", "");
        break;
    }
  }
  return out.join("\n").trimEnd();
}

// ── HTML renderer ──────────────────────────────────────────────────────────

export function renderHtml(nodes: PubNode[]): string {
  const out: string[] = [];
  for (const n of nodes) {
    switch (n.kind) {
      case "heading":
        out.push(`<h${n.level}>${esc(n.text)}</h${n.level}>`);
        break;
      case "paragraph":
        out.push(
          n.italic ? `<p><em>${esc(n.text)}</em></p>` : `<p>${esc(n.text)}</p>`,
        );
        break;
      case "quote":
        out.push(
          `<blockquote>${n.text
            .split("\n")
            .map((l) => `<p>${esc(l)}</p>`)
            .join("")}</blockquote>`,
        );
        break;
      case "list": {
        const tag = n.ordered ? "ol" : "ul";
        out.push(
          `<${tag}>${n.items.map((i) => `<li>${esc(i)}</li>`).join("")}</${tag}>`,
        );
        break;
      }
      case "tasks":
        out.push(
          `<ul>${n.items.map((i) => `<li>${i.checked ? "☑" : "☐"} ${esc(i.text)}</li>`).join("")}</ul>`,
        );
        break;
      case "callout":
        out.push(
          `<aside><p><strong>提示：</strong> ${esc(n.text)}</p></aside>`,
        );
        break;
      case "table": {
        const head = `<tr>${n.columns.map((c) => `<th>${esc(c)}</th>`).join("")}</tr>`;
        const body = n.rows
          .map(
            (r) =>
              `<tr>${r.map((c) => `<td>${esc(c?.trim() || NA)}</td>`).join("")}</tr>`,
          )
          .join("");
        out.push(`<table><thead>${head}</thead><tbody>${body}</tbody></table>`);
        break;
      }
      case "code":
        out.push(
          `<pre><code class="language-${esc(n.lang)}">${esc(n.code)}</code></pre>`,
        );
        break;
      case "rule":
        out.push("<hr>");
        break;
    }
  }
  return out.join("\n");
}

// ── Section composers ──────────────────────────────────────────────────────

function composeHeader(note: NotePublicationInput, nodes: PubNode[]): void {
  nodes.push({
    kind: "heading",
    level: 1,
    text: note.title.trim() || "无标题笔记",
  });
  nodes.push({
    kind: "quote",
    text: "⚠️ 人工审阅后再发布 · 本文件为本地生成的发布预览，不包含任何自动发布。",
  });

  const meta: string[] = [
    `快照时间：${note.asOf.trim() || NA}`,
    `实体：${note.entityName?.trim() || NA}${note.entityTicker?.trim() ? `（${note.entityTicker.trim()}）` : ""}`,
    `证据 ${note.evidenceCount} 条`,
  ];
  if (note.tags.length > 0) meta.push(`标签：${note.tags.join("、")}`);
  nodes.push({ kind: "quote", text: meta.join(" · ") });
  nodes.push({ kind: "rule" });

  if (note.summary?.trim()) {
    nodes.push({ kind: "paragraph", text: note.summary.trim(), italic: true });
  }
  if (note.note?.trim()) {
    nodes.push({ kind: "callout", text: note.note.trim() });
  }
}

function composeDocBlocks(blocks: NoteBlock[], nodes: PubNode[]): void {
  // Exclude placeholders — they're authoring aids, not publish content.
  const publishable = blocks.filter(
    (b) =>
      b.type !== "evidence_placeholder" &&
      b.type !== "live_placeholder" &&
      (b.text.trim().length > 0 || b.type === "checklist"),
  );

  nodes.push({ kind: "heading", level: 2, text: "正文" });

  if (publishable.length === 0) {
    nodes.push({
      kind: "paragraph",
      italic: true,
      text: "正文为空 — 文档画布中还没有可发布的内容。",
    });
    return;
  }

  // Merge adjacent checklists into one tasks node.
  let checklistBuffer: { text: string; checked: boolean }[] = [];

  function flushTasks() {
    if (checklistBuffer.length > 0) {
      nodes.push({ kind: "tasks", items: checklistBuffer });
      checklistBuffer = [];
    }
  }

  for (const b of publishable) {
    if (b.type === "checklist") {
      checklistBuffer.push({ text: b.text.trim(), checked: b.checked });
      continue;
    }

    flushTasks();

    switch (b.type) {
      case "paragraph":
        nodes.push({ kind: "paragraph", text: b.text.trim() });
        break;
      case "heading":
        nodes.push({
          kind: "heading",
          level: Math.min(4, b.level + 2) as 3 | 4,
          text: b.text.trim(),
        });
        break;
      case "quote":
        nodes.push({ kind: "quote", text: b.text.trim() });
        break;
      case "callout":
        nodes.push({ kind: "callout", text: b.text.trim() });
        break;
    }
  }

  flushTasks();
}

function composeVisualToNodes(visual: ArticleVisual, nodes: PubNode[]): void {
  switch (visual.kind) {
    case "mermaid":
      nodes.push({ kind: "paragraph", text: visual.title });
      nodes.push({ kind: "code", lang: "mermaid", code: visual.diagram });
      nodes.push({
        kind: "quote",
        text: `来源：${visual.source} · 日期：${visual.date}`,
      });
      break;
    case "matrix":
      nodes.push({ kind: "paragraph", text: visual.title });
      nodes.push({
        kind: "table",
        columns: visual.columns,
        rows: visual.rows.map((r) =>
          visual.columns.map((c) => r[c]?.trim() || NA),
        ),
      });
      nodes.push({
        kind: "quote",
        text: `来源：${visual.source} · 日期：${visual.date}`,
      });
      break;
    case "chart":
      nodes.push({
        kind: "paragraph",
        text: `${visual.title}（图表 · 数据如下）`,
      });
      nodes.push({
        kind: "table",
        columns: ["指标", ...visual.series.map((s) => s.name)],
        rows: visual.labels.map((label, i) => [
          label,
          ...visual.series.map((s) => {
            const v = s.values[i];
            return typeof v === "number" && Number.isFinite(v) ? String(v) : NA;
          }),
        ]),
      });
      nodes.push({
        kind: "quote",
        text: `来源：${visual.source} · 日期：${visual.date}`,
      });
      break;
    case "empty":
      nodes.push({
        kind: "paragraph",
        italic: true,
        text: `${visual.title} — 暂无可视化：${visual.reason}`,
      });
      break;
  }
}

function composeArticleSnapshot(
  article: ResearchArticle,
  nodes: PubNode[],
): void {
  const e = article.entity;
  nodes.push({
    kind: "heading",
    level: 2,
    text: `附录 A · 研究快照（as of ${e.dataTimestamp || NA} · 不可变）`,
  });

  // 研究对象
  nodes.push({
    kind: "list",
    ordered: false,
    items: [
      `名称：${orNA(e.resolvedName)}`,
      `代码：${orNA(e.ticker)}`,
      `市场：${orNA(e.exchange)}`,
      `行业：${[e.sector, e.industry].filter((v) => v?.trim()).join(" / ") || NA}`,
      `数据时间：${orNA(e.dataTimestamp)}`,
      `研究模式：${e.mode === "ticker" ? "公司" : "行业"}`,
    ],
  });

  // 核心论点
  nodes.push({ kind: "heading", level: 3, text: "核心论点" });
  nodes.push({ kind: "paragraph", text: article.coreThesis.thesis });
  const thesisMeta = [`关键驱动：${orNA(article.coreThesis.keyDriver)}`];
  if (article.coreThesis.nonConsensus?.trim()) {
    thesisMeta.push(`非共识观点：${article.coreThesis.nonConsensus.trim()}`);
  }
  nodes.push({ kind: "list", ordered: false, items: thesisMeta });

  // 产业链
  nodes.push({ kind: "heading", level: 3, text: "产业链" });
  nodes.push({ kind: "paragraph", text: article.industryChain.narrative });
  composeVisualToNodes(article.industryChain.visual, nodes);

  // 证据矩阵
  nodes.push({ kind: "heading", level: 3, text: "证据矩阵" });
  nodes.push({ kind: "paragraph", text: article.evidenceMatrix.narrative });
  composeVisualToNodes(article.evidenceMatrix.visual, nodes);

  // 公司层面
  nodes.push({ kind: "heading", level: 3, text: "公司层面" });
  nodes.push({ kind: "paragraph", text: article.companyLayer.narrative });
  if (article.companyLayer.visual) {
    composeVisualToNodes(article.companyLayer.visual, nodes);
  }

  // 结论
  nodes.push({ kind: "heading", level: 3, text: "结论" });
  nodes.push({ kind: "paragraph", text: article.conclusion.summary });
  nodes.push({ kind: "heading", level: 4, text: "风险" });
  nodes.push({
    kind: "list",
    ordered: true,
    items: article.conclusion.risks.map((r) =>
      r.explanation?.trim() ? `${r.risk} — ${r.explanation.trim()}` : r.risk,
    ),
  });
  nodes.push({ kind: "heading", level: 4, text: "失效条件" });
  nodes.push({
    kind: "list",
    ordered: true,
    items: article.conclusion.invalidationConditions.map((c) => {
      const metric = c.metric?.trim() || NA;
      const threshold = c.threshold?.trim() || NA;
      return `${c.condition}（指标：${metric} · 阈值：${threshold}）`;
    }),
  });
}

function composeDraftSnapshot(
  draft: DraftNoteArtifact,
  nodes: PubNode[],
): void {
  const s = draft.source;
  nodes.push({
    kind: "heading",
    level: 2,
    text: "附录 A · 来源快照（不可变）",
  });
  nodes.push({
    kind: "list",
    ordered: false,
    items: [
      `类型：${orNA(s.sourceType)}`,
      `标题：${orNA(s.title)}`,
      `链接：${orNA(s.url)}`,
      `作者：${orNA(s.author)}`,
      `发布于：${orNA(s.publishedAt)}`,
      `收录于：${orNA(draft.capturedAt)}`,
    ],
  });
  if (s.rawText?.trim()) {
    nodes.push({ kind: "heading", level: 3, text: "原文摘录" });
    nodes.push({ kind: "quote", text: s.rawText.trim() });
  }
}

function composeEvidence(evidence: EvidenceRef[], nodes: PubNode[]): void {
  nodes.push({ kind: "heading", level: 2, text: "附录 B · 证据清单" });
  if (evidence.length === 0) {
    nodes.push({ kind: "paragraph", italic: true, text: "无证据记录" });
    return;
  }
  nodes.push({
    kind: "list",
    ordered: false,
    items: evidence.map((ev) => {
      const url = ev.url?.trim() ? ` · ${ev.url.trim()}` : "";
      return `[${ev.id}] ${ev.claim} — 来源：${orNA(ev.source)} · 日期：${orNA(ev.date)} · 核实：${confidenceLabel(ev.confidence)}${url}`;
    }),
  });
}

/** Neutral fallback when a stored refresh error is missing or unsafe to publish. */
const NEUTRAL_REFRESH_FAILURE =
  "Source could not be reached. Showing last saved content.";

/**
 * Patterns that mark a stored refreshError as unsafe for publication output:
 * env vars (process.env.X / UPPER_SNAKE_KEY names), absolute local paths,
 * provider/model names, credential wording, and stack-trace fragments.
 * Legacy/dirty data may carry these; publishable Markdown/HTML must not.
 */
const UNSAFE_REFRESH_ERROR_PATTERNS: RegExp[] = [
  /process\.env/i,
  /\b[A-Z][A-Z0-9_]{3,}\b/, // UPPER_SNAKE env-var style names
  /(?:^|[\s("'`])(?:~|\/(?:Users|home|var|etc|opt|tmp|private)\/|[A-Za-z]:[\\/])/, // local paths
  /\b(?:openai|anthropic|deepseek|google|gemini|claude|gpt-?[\do]+|llm|azure|aws|vercel|supabase|moonshot|kimi|qwen)\b/i, // providers/models
  /\b(?:api[\s_-]?key|token|secret|password|credential|bearer)\b/i, // credential wording
  /\.[jt]sx?:\d+|\bat\s+\S+\s+\([^)]+\)/, // stack-trace fragments
];

/**
 * Publication-safe refresh failure label. Unlike the in-app helper, this
 * never renders stored `refreshError` verbatim — anything matching an
 * unsafe pattern (env vars, paths, provider names, credentials, stack
 * details) degrades to a neutral message. The failed state itself stays
 * honest via the 状态 line and this failure row.
 */
function publicationRefreshErrorLabel(block: LiveBlock): string | null {
  if (block.staleState !== "failed") return null;
  const raw = block.refreshError?.trim();
  if (!raw) return NEUTRAL_REFRESH_FAILURE;
  if (UNSAFE_REFRESH_ERROR_PATTERNS.some((p) => p.test(raw))) {
    return NEUTRAL_REFRESH_FAILURE;
  }
  return raw;
}

function composeLiveBlocks(blocks: LiveBlock[], nodes: PubNode[]): void {
  nodes.push({
    kind: "heading",
    level: 2,
    text: "附录 C · Live 证据块（实时数据，导出时刻快照）",
  });
  if (blocks.length === 0) {
    nodes.push({ kind: "paragraph", italic: true, text: "暂无 Live 证据块" });
    return;
  }
  for (const b of blocks) {
    nodes.push({ kind: "heading", level: 3, text: b.title });

    const metaLines: string[] = [
      `状态：${staleStateLabel(b.staleState)}`,
      `来源：${orNA(b.source)} · ${blockDateLabel(b)}`,
      `上次刷新：${b.lastRefreshedAt ? b.lastRefreshedAt.slice(0, 19).replace("T", " ") : NA}`,
    ];
    if (b.sourceUrl?.trim()) metaLines.push(`链接：${b.sourceUrl.trim()}`);
    const failure = publicationRefreshErrorLabel(b);
    if (failure) metaLines.push(`刷新失败原因：${failure}`);
    nodes.push({ kind: "list", ordered: false, items: metaLines });

    if (b.type === "evidence_ref") {
      nodes.push({
        kind: "quote",
        text: `${b.content.claim}\n数据日期：${orNA(b.content.date)} · 核实：${confidenceLabel(b.content.confidence)}`,
      });
    } else {
      nodes.push({ kind: "quote", text: b.content.excerpt });
    }
  }
}

function composeFooter(
  note: NotePublicationInput,
  exportedAt: string,
  nodes: PubNode[],
): void {
  nodes.push({ kind: "rule" });
  nodes.push({
    kind: "quote",
    text: `导出于 ${exportedAt} · 正文为用户撰写内容；快照与证据保留原始来源/日期，Live 块状态以导出时刻为准。`,
  });
  if (!("kind" in note.artifact)) {
    nodes.push({ kind: "quote", text: note.artifact.disclaimer });
  }
}

// ── Entry point ─────────────────────────────────────────────────────────────

/**
 * Compose a full publication document from a note.
 *
 * Returns blocked result when:
 * - the final Markdown trips PROHIBITED_ARTICLE_PATTERN (compliance)
 *
 * Otherwise returns Markdown + HTML for copy/download/preview.
 */
export function composeNotePublication(
  note: NotePublicationInput,
  exportedAt?: string,
): NotePublicationResult {
  const exported = exportedAt ?? new Date().toISOString();
  const nodes: PubNode[] = [];

  composeHeader(note, nodes);
  composeDocBlocks(note.blocks, nodes);

  // 附录 A — artifact snapshot
  if ("kind" in note.artifact && note.artifact.kind === "draft") {
    composeDraftSnapshot(note.artifact, nodes);
  } else {
    composeArticleSnapshot(note.artifact as ResearchArticle, nodes);
  }

  composeEvidence(note.artifact.evidence, nodes);
  composeLiveBlocks(note.liveBlocks ?? [], nodes);
  composeFooter(note, exported, nodes);

  const markdown = renderMarkdown(nodes);
  const html = renderHtml(nodes);

  if (PROHIBITED_ARTICLE_PATTERN.test(markdown)) {
    return {
      ok: false,
      reason: "导出内容包含受限表述，已按合规规则拦截，未生成文件。",
    };
  }

  return { ok: true, markdown, html, fileStem: fileStem(note) };
}
