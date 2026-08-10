"use client";

/* oxlint-disable i18next/no-literal-string */

/**
 * Article Visual Components (#116)
 *
 * Renders Mermaid diagrams, matrix tables, charts, and empty states.
 * Visual priority: Mermaid → matrix → chart → honest empty.
 */
import { AlertCircle } from "lucide-react";
import { useEffect, useRef } from "react";

import type {
  ArticleVisual as ArticleVisualType,
  MermaidVisual,
  MatrixVisual,
  ChartVisual,
  EmptyVisual,
} from "@workspace/shared/types/article";

// ── Mermaid Renderer ─────────────────────────────────────────────────────────

function MermaidDiagram({ visual }: { visual: MermaidVisual }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function renderMermaid() {
      if (!containerRef.current) return;

      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "neutral",
          securityLevel: "loose",
          flowchart: { curve: "basis", padding: 16 },
        });

        if (cancelled) return;

        const id = `mermaid-${Math.random().toString(36).slice(2, 10)}`;
        const { svg } = await mermaid.render(id, visual.diagram);

        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      } catch {
        if (!cancelled && containerRef.current) {
          containerRef.current.innerHTML = `<p class="text-xs text-red-500">Mermaid 渲染失败</p>`;
        }
      }
    }

    void renderMermaid();
    return () => {
      cancelled = true;
    };
  }, [visual.diagram]);

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className="overflow-x-auto rounded-lg border bg-white p-4 [&>svg]:mx-auto [&>svg]:max-w-full"
      />
      {(visual.source || visual.date) && (
        <p className="text-muted-foreground text-[10px]">
          {visual.source && <span>来源: {visual.source}</span>}
          {visual.source && visual.date && <span> · </span>}
          {visual.date && <span>{visual.date}</span>}
        </p>
      )}
    </div>
  );
}

// ── Matrix Table Renderer ────────────────────────────────────────────────────

function MatrixTable({ visual }: { visual: MatrixVisual }) {
  return (
    <div className="space-y-2">
      <div className="overflow-hidden rounded-lg border">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              {visual.columns.map((col) => (
                <th
                  key={col}
                  className="bg-muted/50 border-b px-3 py-2 text-left text-[11px] font-semibold tracking-wide uppercase"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visual.rows.map((row, i) => (
              <tr key={i} className="border-b last:border-b-0">
                {visual.columns.map((col) => (
                  <td key={col} className="px-3 py-2 text-sm">
                    <span className="notranslate" translate="no">
                      {row[col] ?? "N/A"}
                    </span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(visual.source || visual.date) && (
        <p className="text-muted-foreground text-[10px]">
          {visual.source && <span>来源: {visual.source}</span>}
          {visual.source && visual.date && <span> · </span>}
          {visual.date && <span>{visual.date}</span>}
        </p>
      )}
    </div>
  );
}

// ── Chart Renderer (simple SVG bar chart) ────────────────────────────────────

function SimpleBarChart({ visual }: { visual: ChartVisual }) {
  const allValues = visual.series.flatMap((s) => s.values);
  const maxVal = Math.max(...allValues.filter((v) => Number.isFinite(v)), 1);
  const chartHeight = 160;

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border bg-white p-4">
        <svg
          viewBox={`0 0 ${visual.labels.length * 60 + 40} ${chartHeight + 40}`}
          className="w-full"
          style={{ minWidth: `${visual.labels.length * 60 + 40}px` }}
        >
          {/* Y-axis labels */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = chartHeight - ratio * chartHeight + 10;
            const val = (ratio * maxVal).toFixed(0);
            return (
              <g key={ratio}>
                <text
                  x="0"
                  y={y + 4}
                  className="fill-muted-foreground text-[9px]"
                >
                  {val}
                </text>
                <line
                  x1="30"
                  y1={y}
                  x2={visual.labels.length * 60 + 30}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeWidth="0.5"
                />
              </g>
            );
          })}

          {/* Bars */}
          {visual.labels.map((label, li) => {
            const x = li * 60 + 35;
            const barCount = visual.series.length;
            const barWidth = Math.min(12, 40 / barCount);

            return (
              <g key={label}>
                {visual.series.map((s, si) => {
                  const val = s.values[li] ?? 0;
                  const h = Number.isFinite(val)
                    ? (val / maxVal) * chartHeight
                    : 0;
                  const bx = x + si * (barWidth + 2);
                  const by = chartHeight - h + 10;

                  return (
                    <rect
                      key={`${label}-${s.name}`}
                      x={bx}
                      y={by}
                      width={barWidth}
                      height={h}
                      rx="2"
                      fill={
                        s.color ?? ["#c5a35f", "#55775f", "#6b7280"][si % 3]
                      }
                      opacity="0.85"
                    />
                  );
                })}
                <text
                  x={x + (barCount * (barWidth + 2)) / 2}
                  y={chartHeight + 24}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[9px]"
                >
                  {label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Legend */}
        {visual.series.length > 1 && (
          <div className="mt-2 flex flex-wrap gap-3">
            {visual.series.map((s, si) => (
              <div key={s.name} className="flex items-center gap-1.5 text-xs">
                <div
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{
                    backgroundColor:
                      s.color ?? ["#c5a35f", "#55775f", "#6b7280"][si % 3],
                  }}
                />
                <span className="text-muted-foreground">{s.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {(visual.source || visual.date) && (
        <p className="text-muted-foreground text-[10px]">
          {visual.source && <span>来源: {visual.source}</span>}
          {visual.source && visual.date && <span> · </span>}
          {visual.date && <span>{visual.date}</span>}
        </p>
      )}
    </div>
  );
}

function SimpleLineChart({ visual }: { visual: ChartVisual }) {
  const allValues = visual.series.flatMap((s) => s.values);
  const maxVal = Math.max(...allValues.filter((v) => Number.isFinite(v)), 1);
  const minVal = Math.min(...allValues.filter((v) => Number.isFinite(v)), 0);
  const range = maxVal - minVal || 1;
  const chartHeight = 160;
  const chartWidth = Math.max(visual.labels.length * 60, 200);
  const padding = 40;

  const toX = (i: number) =>
    padding + (i / (visual.labels.length - 1)) * (chartWidth - padding * 2);
  const toY = (v: number) =>
    chartHeight - ((v - minVal) / range) * (chartHeight - 20) + 10;

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border bg-white p-4">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight + 40}`}
          className="w-full"
          style={{ minWidth: `${chartWidth}px` }}
        >
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = chartHeight - ratio * (chartHeight - 20) + 10;
            const val = (minVal + ratio * range).toFixed(0);
            return (
              <g key={ratio}>
                <text
                  x="0"
                  y={y + 4}
                  className="fill-muted-foreground text-[9px]"
                >
                  {val}
                </text>
                <line
                  x1={padding}
                  y1={y}
                  x2={chartWidth - padding}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeWidth="0.5"
                />
              </g>
            );
          })}

          {/* Lines */}
          {visual.series.map((s, si) => {
            const points = s.values
              .map((v, i) => `${toX(i)},${toY(v)}`)
              .join(" ");
            const color = s.color ?? ["#c5a35f", "#55775f", "#6b7280"][si % 3];

            return (
              <g key={s.name}>
                <polyline
                  points={points}
                  fill="none"
                  stroke={color}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Dots */}
                {s.values.map((v, i) => (
                  <circle key={i} cx={toX(i)} cy={toY(v)} r="3" fill={color} />
                ))}
              </g>
            );
          })}

          {/* X-axis labels */}
          {visual.labels.map((label, i) => (
            <text
              key={label}
              x={toX(i)}
              y={chartHeight + 24}
              textAnchor="middle"
              className="fill-muted-foreground text-[9px]"
            >
              {label}
            </text>
          ))}
        </svg>

        {/* Legend */}
        {visual.series.length > 1 && (
          <div className="mt-2 flex flex-wrap gap-3">
            {visual.series.map((s, si) => (
              <div key={s.name} className="flex items-center gap-1.5 text-xs">
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{
                    backgroundColor:
                      s.color ?? ["#c5a35f", "#55775f", "#6b7280"][si % 3],
                  }}
                />
                <span className="text-muted-foreground">{s.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {(visual.source || visual.date) && (
        <p className="text-muted-foreground text-[10px]">
          {visual.source && <span>来源: {visual.source}</span>}
          {visual.source && visual.date && <span> · </span>}
          {visual.date && <span>{visual.date}</span>}
        </p>
      )}
    </div>
  );
}

// ── Empty State ──────────────────────────────────────────────────────────────

function EmptyVisualState({ visual }: { visual: EmptyVisual }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
      <AlertCircle className="h-4 w-4 shrink-0" />
      <div>
        <p className="text-sm font-medium">{visual.title}</p>
        <p className="text-xs opacity-80">{visual.reason}</p>
      </div>
    </div>
  );
}

// ── Unified Visual Component ─────────────────────────────────────────────────

export function ArticleVisual({ visual }: { visual: ArticleVisualType }) {
  switch (visual.kind) {
    case "mermaid":
      return <MermaidDiagram visual={visual} />;
    case "matrix":
      return <MatrixTable visual={visual} />;
    case "chart":
      if (visual.chartType === "line" || visual.chartType === "area") {
        return <SimpleLineChart visual={visual} />;
      }
      return <SimpleBarChart visual={visual} />;
    case "empty":
      return <EmptyVisualState visual={visual} />;
    default:
      return null;
  }
}

// ── Section Wrapper ──────────────────────────────────────────────────────────

export function ArticleSection({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Icon className="text-muted-foreground h-3.5 w-3.5" />
        <span className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">
          {label}
        </span>
        <div className="bg-border h-px flex-1" />
      </div>
      {children}
    </div>
  );
}
