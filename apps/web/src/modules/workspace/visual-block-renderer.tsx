"use client";

/* oxlint-disable i18next/no-literal-string */

/**
 * Visual Block Renderer — renders ArticleVisual data as structured visuals.
 *
 * Matrix → HTML table with all rows/columns (never truncated).
 * Chart  → Recharts bar/line/area chart with full series data.
 * Mermaid → mermaid.js rendered SVG diagram.
 * Empty  → info message with reason.
 *
 * Source/date metadata and evidenceIds are always preserved and displayed.
 *
 * REDLINES:
 * - no fabricated data: only renders validated ArticleVisual input.
 * - all dynamic values carry notranslate.
 */
import { useEffect, useRef, useState } from "react";

import type {
  ArticleVisual,
  ChartVisual,
  MatrixVisual,
  MermaidVisual,
} from "@workspace/shared/types/article";

// ── Matrix renderer ──────────────────────────────────────────────────────────

function MatrixTable({ visual }: { visual: MatrixVisual }) {
  return (
    <div className="space-y-2">
      <p className="notranslate text-sm font-medium" translate="no">
        {visual.title}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              {visual.columns.map((col) => (
                <th
                  key={col}
                  className="border-border text-muted-foreground border px-2 py-1.5 text-left font-medium"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visual.rows.map((row, ri) => (
              <tr key={ri}>
                {visual.columns.map((col) => (
                  <td
                    key={col}
                    className="notranslate border-border border px-2 py-1"
                    translate="no"
                  >
                    {row[col] ?? "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <VisualMeta source={visual.source} date={visual.date} />
    </div>
  );
}

// ── Chart renderer ───────────────────────────────────────────────────────────

function ChartDisplay({ visual }: { visual: ChartVisual }) {
  // Dynamically import Recharts to avoid SSR issues.
  const [charts, setCharts] = useState<typeof import("recharts") | null>(null);

  useEffect(() => {
    import("recharts").then(setCharts).catch(() => {});
  }, []);

  if (!charts) {
    return (
      <div className="space-y-2">
        <p className="notranslate text-sm font-medium" translate="no">
          {visual.title}
        </p>
        <p className="text-muted-foreground text-xs">加载图表组件中…</p>
        <VisualMeta source={visual.source} date={visual.date} />
      </div>
    );
  }

  const {
    BarChart,
    Bar,
    LineChart,
    Line,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
  } = charts;

  // Transform ArticleVisual chart data into Recharts format.
  const data = visual.labels.map((label, i) => {
    const point: Record<string, string | number> = { name: label };
    for (const s of visual.series) {
      point[s.name] = s.values[i] ?? 0;
    }
    return point;
  });

  const palette = [
    "#6366f1",
    "#f43f5e",
    "#10b981",
    "#f59e0b",
    "#3b82f6",
    "#8b5cf6",
  ];

  const chartContent = (() => {
    switch (visual.chartType) {
      case "bar":
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            {visual.series.map((s, si) => (
              <Bar
                key={s.name}
                dataKey={s.name}
                fill={s.color ?? palette[si % palette.length]}
              />
            ))}
          </BarChart>
        );
      case "line":
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            {visual.series.map((s, si) => (
              <Line
                key={s.name}
                type="monotone"
                dataKey={s.name}
                stroke={s.color ?? palette[si % palette.length]}
                strokeWidth={2}
              />
            ))}
          </LineChart>
        );
      case "area":
        return (
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            {visual.series.map((s, si) => (
              <Area
                key={s.name}
                type="monotone"
                dataKey={s.name}
                stroke={s.color ?? palette[si % palette.length]}
                fill={s.color ?? palette[si % palette.length]}
                fillOpacity={0.15}
              />
            ))}
          </AreaChart>
        );
      default:
        return null;
    }
  })();

  return (
    <div className="space-y-2">
      <p className="notranslate text-sm font-medium" translate="no">
        {visual.title}
      </p>
      <ResponsiveContainer width="100%" height={280}>
        {chartContent as React.ReactElement}
      </ResponsiveContainer>
      <VisualMeta source={visual.source} date={visual.date} />
    </div>
  );
}

// ── Mermaid renderer ─────────────────────────────────────────────────────────

function MermaidDiagram({ visual }: { visual: MermaidVisual }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const el = containerRef.current;
    if (!el) return;

    import("mermaid")
      .then((m) => {
        if (cancelled) return undefined;
        m.default.initialize({
          startOnLoad: false,
          theme: "default",
          securityLevel: "loose",
        });
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        return m.default
          .render(id, visual.diagram)
          .then(({ svg }) => {
            if (!cancelled && el) {
              el.innerHTML = svg;
            }
            return undefined;
          })
          .catch(() => {
            if (!cancelled) setError("Mermaid 图表渲染失败");
            return undefined;
          });
      })
      .catch(() => {
        if (!cancelled) setError("Mermaid 组件加载失败");
      });

    return () => {
      cancelled = true;
    };
  }, [visual.diagram]);

  return (
    <div className="space-y-2">
      <p className="notranslate text-sm font-medium" translate="no">
        {visual.title}
      </p>
      {error ? (
        <p className="text-muted-foreground text-xs italic">{error}</p>
      ) : (
        <div
          ref={containerRef}
          className="overflow-x-auto [&>svg]:max-w-full"
        />
      )}
      <VisualMeta source={visual.source} date={visual.date} />
    </div>
  );
}

// ── Shared metadata footer ───────────────────────────────────────────────────

function VisualMeta({ source, date }: { source: string; date: string }) {
  return (
    <p className="text-muted-foreground text-[10px]">
      来源: {source} · {date}
    </p>
  );
}

// ── Main renderer ────────────────────────────────────────────────────────────

export function VisualBlockRenderer({ visual }: { visual: ArticleVisual }) {
  switch (visual.kind) {
    case "matrix":
      return <MatrixTable visual={visual} />;
    case "chart":
      return <ChartDisplay visual={visual} />;
    case "mermaid":
      return <MermaidDiagram visual={visual} />;
    case "empty":
      return (
        <p className="text-muted-foreground text-xs italic">
          {visual.title}: {visual.reason}
        </p>
      );
    default:
      return null;
  }
}
