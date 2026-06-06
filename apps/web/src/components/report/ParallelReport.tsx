"use client";

/* oxlint-disable i18next/no-literal-string */

import { useState } from "react";

import { MarkdownReport } from "./MarkdownReport";

interface ParallelCell {
  text?: string;
  error?: string;
}

interface ParallelResult {
  type: "parallel";
  skills: string[];
  query: string;
  cells: Record<string, ParallelCell>;
  ts?: string;
  year?: number;
  status?: string;
}

interface SkillMeta {
  name: string;
  sub: string;
  color: string;
  bgColor: string;
}

const SKILL_MAP: Record<string, SkillMeta> = {
  serenity: {
    name: "Serenity",
    sub: "Supply Chain",
    color: "#1a3a5c",
    bgColor: "#e8eef5",
  },
  fundamental: {
    name: "Fundamental",
    sub: "Fundamentals",
    color: "#1a5c3a",
    bgColor: "#edf7f2",
  },
  macro: { name: "Macro", sub: "Macro", color: "#7a4f00", bgColor: "#fdf5e8" },
  technical: {
    name: "Technical",
    sub: "Technicals",
    color: "#4a1e8a",
    bgColor: "#f2eefb",
  },
  sentiment: {
    name: "Sentiment",
    sub: "Sentiment",
    color: "#0a5c5c",
    bgColor: "#e8f5f5",
  },
  risk: {
    name: "Risk",
    sub: "Risk Matrix",
    color: "#9b2c2c",
    bgColor: "#fdf0f0",
  },
};

export function ParallelReport({ r }: { r: ParallelResult }) {
  const [activeTab, setActiveTab] = useState(r.skills[0] ?? "");

  const doneCount = r.skills.filter((s) => !!r.cells[s]?.text).length;
  const total = r.skills.length;
  const progress = total > 0 ? doneCount / total : 0;

  return (
    <div className="space-y-4">
      {/* Skill Tabs */}
      <div className="flex flex-wrap gap-2">
        {r.skills.map((sid) => {
          const meta = SKILL_MAP[sid] ?? {
            name: sid,
            sub: "",
            color: "#888780",
            bgColor: "#f4f4f4",
          };
          const cell = r.cells[sid];
          const done = !!cell?.text;
          const hasError = !!cell?.error;
          const isActive = sid === activeTab;

          return (
            <button
              key={sid}
              onClick={() => done && setActiveTab(sid)}
              disabled={!done}
              className={`
                flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-all
                ${
                  isActive
                    ? "border-foreground bg-foreground text-background"
                    : done
                      ? "border-border bg-muted hover:bg-muted/80 text-foreground"
                      : hasError
                        ? "border-red-200 bg-red-50 text-red-500"
                        : "border-border bg-muted/30 text-muted-foreground cursor-not-allowed"
                }
              `}
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: isActive ? "white" : meta.color }}
              />
              <span>{meta.name}</span>
              {!done && !hasError && <span className="ml-1 opacity-50">…</span>}
              {hasError && <span className="ml-1 text-red-400">✗</span>}
            </button>
          );
        })}
      </div>

      {/* Active Skill Content */}
      <div>
        {r.cells[activeTab]?.text ? (
          <MarkdownReport
            text={r.cells[activeTab].text}
            skill={activeTab}
            query={r.query}
            timestamp={r.ts}
            year={r.year}
          />
        ) : r.cells[activeTab]?.error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            {r.cells[activeTab].error}
          </div>
        ) : (
          <div className="space-y-2.5 py-4">
            {[100, 88, 95, 78].map((w, i) => (
              <div
                key={i}
                className="h-3.5 animate-pulse rounded"
                style={{
                  width: `${w}%`,
                  background:
                    "linear-gradient(90deg, #edeae3 25%, #f4f2ee 50%, #edeae3 75%)",
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <div className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full">
          <div
            className="bg-foreground h-full rounded-full transition-all duration-500"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <span className="text-muted-foreground shrink-0 text-xs">
          {doneCount}/{total} complete
        </span>
      </div>
    </div>
  );
}
