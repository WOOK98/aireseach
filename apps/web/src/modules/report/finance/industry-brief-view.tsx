"use client";

/* oxlint-disable i18next/no-literal-string */

import {
  BookOpen,
  Link2,
  TrendingUp,
  Users,
  FileText,
  AlertTriangle,
  Target,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from "lucide-react";

import { Badge } from "@workspace/ui-web/badge";
import { Separator } from "@workspace/ui-web/separator";

import type {
  IndustryBrief,
  SourceEntry,
  ValueChainNode,
} from "@workspace/shared/industry-brief";

// ─── Confidence Badge ────────────────────────────────────────────────────────

function ConfidenceBadge({
  level,
}: {
  level: "verified" | "partial" | "unverified";
}) {
  const config = {
    verified: {
      icon: CheckCircle2,
      label: "Verified",
      className: "text-green-600 bg-green-50 dark:bg-green-950/20",
    },
    partial: {
      icon: HelpCircle,
      label: "Partial",
      className: "text-amber-600 bg-amber-50 dark:bg-amber-950/20",
    },
    unverified: {
      icon: XCircle,
      label: "Unverified",
      className: "text-red-600 bg-red-50 dark:bg-red-950/20",
    },
  };
  const { icon: Icon, label, className } = config[level];

  return (
    <Badge
      variant="outline"
      className={`inline-flex items-center gap-1 text-[10px] ${className}`}
    >
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}

// ─── Section Header ──────────────────────────────────────────────────────────

function SectionHeader({
  icon: Icon,
  title,
  badge,
}: {
  icon: typeof BookOpen;
  title: string;
  badge?: string;
}) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <Icon className="text-muted-foreground h-4 w-4" />
      <span className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">
        {title}
      </span>
      {badge && (
        <Badge variant="secondary" className="text-[10px]">
          {badge}
        </Badge>
      )}
      <div className="bg-border h-px flex-1" />
    </div>
  );
}

// ─── Industry Definition ─────────────────────────────────────────────────────

function DefinitionSection({ definition }: { definition: string }) {
  return (
    <div>
      <SectionHeader icon={BookOpen} title="Industry Definition" />
      <div className="text-muted-foreground prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed">
        {definition
          .split("\n")
          .map((para, i) => (para.trim() ? <p key={i}>{para}</p> : null))}
      </div>
    </div>
  );
}

// ─── Value Chain ─────────────────────────────────────────────────────────────

function BottleneckBadge({
  strength,
}: {
  strength: ValueChainNode["bottleneckStrength"];
}) {
  const config = {
    strong: {
      label: "Strong Bottleneck",
      className: "text-red-600 bg-red-50 dark:bg-red-950/20",
    },
    moderate: {
      label: "Moderate",
      className: "text-amber-600 bg-amber-50 dark:bg-amber-950/20",
    },
    weak: {
      label: "Weak",
      className: "text-blue-600 bg-blue-50 dark:bg-blue-950/20",
    },
    none: {
      label: "No Bottleneck",
      className: "text-muted-foreground bg-muted",
    },
  };
  const { label, className } = config[strength];

  return (
    <Badge variant="outline" className={`text-[10px] ${className}`}>
      {label}
    </Badge>
  );
}

function ValueChainSection({ valueChain }: { valueChain: ValueChainNode[] }) {
  return (
    <div>
      <SectionHeader
        icon={Link2}
        title="Value Chain"
        badge={`${valueChain.length} layers`}
      />
      <div className="space-y-3">
        {valueChain.map((node, i) => (
          <div key={i} className="bg-muted/30 rounded-lg border p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
                  Layer {i + 1}
                </span>
                <span className="text-xs font-semibold">{node.layer}</span>
              </div>
              <BottleneckBadge strength={node.bottleneckStrength} />
            </div>
            <p className="text-muted-foreground mb-2 text-xs">
              {node.description}
            </p>
            {node.keyPlayers.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-muted-foreground border-border border-b text-[10px] tracking-wider uppercase">
                      <th className="py-1 pr-3 text-left font-medium">
                        Ticker
                      </th>
                      <th className="py-1 pr-3 text-left font-medium">
                        Company
                      </th>
                      <th className="py-1 pr-3 text-left font-medium">
                        Exchange
                      </th>
                      <th className="py-1 text-left font-medium">Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {node.keyPlayers.map((player, j) => (
                      <tr
                        key={j}
                        className="border-border/30 border-b last:border-0"
                      >
                        <td className="notranslate py-1.5 pr-3 font-mono font-semibold">
                          {player.ticker}
                        </td>
                        <td className="notranslate py-1.5 pr-3">
                          {player.name}
                        </td>
                        <td className="notranslate text-muted-foreground py-1.5 pr-3">
                          {player.exchange}
                        </td>
                        <td className="text-muted-foreground py-1.5">
                          {player.role}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Market Sizing ───────────────────────────────────────────────────────────

function MarketSizingSection({ brief }: { brief: IndustryBrief }) {
  const { marketSizing, marketSizeHistory } = brief;

  return (
    <div className="space-y-4">
      <SectionHeader
        icon={TrendingUp}
        title="Market Sizing"
        badge="TAM / SAM / SOM"
      />

      {/* TAM / SAM / SOM table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted-foreground border-border border-b text-[10px] tracking-wider uppercase">
              <th className="py-1.5 pr-3 text-left font-medium">Layer</th>
              <th className="py-1.5 pr-3 text-right font-medium">Estimate</th>
              <th className="py-1.5 pr-3 text-left font-medium">Method</th>
              <th className="py-1.5 pr-3 text-left font-medium">Source</th>
              <th className="py-1.5 text-right font-medium">Confidence</th>
            </tr>
          </thead>
          <tbody>
            {[marketSizing.tam, marketSizing.sam, marketSizing.som].map(
              (est, i) => (
                <tr key={i} className="border-border/30 border-b last:border-0">
                  <td className="py-2 pr-3 font-semibold">{est.label}</td>
                  <td className="notranslate py-2 pr-3 text-right font-mono font-semibold">
                    {est.value}
                  </td>
                  <td className="text-muted-foreground py-2 pr-3 capitalize">
                    {est.methodology}
                  </td>
                  <td className="notranslate text-muted-foreground py-2 pr-3">
                    {est.source}
                  </td>
                  <td className="py-2 text-right">
                    <ConfidenceBadge level={est.confidence} />
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>

      {marketSizing.crossValidationNote && (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs dark:border-amber-800 dark:bg-amber-950/20">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
          <p className="text-amber-800 dark:text-amber-300">
            {marketSizing.crossValidationNote}
          </p>
        </div>
      )}

      {/* Historical market size */}
      {marketSizeHistory.length > 0 && (
        <div>
          <p className="text-muted-foreground mb-2 text-[10px] font-semibold tracking-wider uppercase">
            Market Size History
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground border-border border-b text-[10px] tracking-wider uppercase">
                  <th className="py-1.5 pr-3 text-left font-medium">Year</th>
                  <th className="py-1.5 pr-3 text-right font-medium">Size</th>
                  <th className="py-1.5 pr-3 text-right font-medium">Growth</th>
                  <th className="py-1.5 text-left font-medium">Source</th>
                </tr>
              </thead>
              <tbody>
                {marketSizeHistory.map((point, i) => (
                  <tr
                    key={i}
                    className="border-border/30 border-b last:border-0"
                  >
                    <td className="notranslate py-1.5 pr-3 font-mono">
                      {point.year}
                    </td>
                    <td className="notranslate py-1.5 pr-3 text-right font-mono font-semibold">
                      {point.size}
                    </td>
                    <td className="notranslate text-muted-foreground py-1.5 pr-3 text-right font-mono">
                      {point.growthRate ?? "—"}
                    </td>
                    <td className="notranslate text-muted-foreground py-1.5">
                      {point.source}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Competition ─────────────────────────────────────────────────────────────

function CompetitionSection({ brief }: { brief: IndustryBrief }) {
  const { competition, shareBreakdown } = brief;

  return (
    <div className="space-y-4">
      <SectionHeader icon={Users} title="Competitive Landscape" />

      {/* Concentration metrics */}
      <div className="flex flex-wrap gap-3">
        {competition.cr3 && (
          <div className="bg-muted/30 rounded-md border px-3 py-2">
            <p className="text-muted-foreground text-[10px] font-medium uppercase">
              CR3
            </p>
            <p className="font-mono text-lg font-bold">{competition.cr3}</p>
          </div>
        )}
        {competition.cr5 && (
          <div className="bg-muted/30 rounded-md border px-3 py-2">
            <p className="text-muted-foreground text-[10px] font-medium uppercase">
              CR5
            </p>
            <p className="font-mono text-lg font-bold">{competition.cr5}</p>
          </div>
        )}
        {competition.hhi && (
          <div className="bg-muted/30 rounded-md border px-3 py-2">
            <p className="text-muted-foreground text-[10px] font-medium uppercase">
              HHI
            </p>
            <p className="font-mono text-lg font-bold">{competition.hhi}</p>
          </div>
        )}
        <div className="bg-muted/30 rounded-md border px-3 py-2">
          <p className="text-muted-foreground text-[10px] font-medium uppercase">
            Trend
          </p>
          <p className="text-sm font-semibold capitalize">
            {competition.trend}
          </p>
        </div>
      </div>

      {/* Share breakdown table */}
      {shareBreakdown.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-muted-foreground border-border border-b text-[10px] tracking-wider uppercase">
                <th className="py-1.5 pr-3 text-left font-medium">#</th>
                <th className="py-1.5 pr-3 text-left font-medium">Player</th>
                <th className="py-1.5 pr-3 text-left font-medium">Ticker</th>
                <th className="py-1.5 pr-3 text-right font-medium">Share</th>
                <th className="py-1.5 pr-3 text-right font-medium">
                  YoY Change
                </th>
                <th className="py-1.5 text-left font-medium">Source</th>
              </tr>
            </thead>
            <tbody>
              {shareBreakdown.map((entry, i) => (
                <tr key={i} className="border-border/30 border-b last:border-0">
                  <td className="text-muted-foreground py-1.5 pr-3">{i + 1}</td>
                  <td className="notranslate py-1.5 pr-3 font-semibold">
                    {entry.player}
                  </td>
                  <td className="notranslate py-1.5 pr-3 font-mono">
                    {entry.ticker ?? "—"}
                  </td>
                  <td className="notranslate py-1.5 pr-3 text-right font-mono font-semibold">
                    {entry.share}
                  </td>
                  <td className="notranslate py-1.5 pr-3 text-right font-mono">
                    {entry.change ?? "—"}
                  </td>
                  <td className="notranslate text-muted-foreground py-1.5">
                    {entry.source}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Sources ─────────────────────────────────────────────────────────────────

function SourceTierBadge({ tier }: { tier: SourceEntry["tier"] }) {
  const colors: Record<number, string> = {
    1: "text-green-700 bg-green-50 dark:bg-green-950/20",
    2: "text-green-700 bg-green-50 dark:bg-green-950/20",
    3: "text-blue-700 bg-blue-50 dark:bg-blue-950/20",
    4: "text-blue-700 bg-blue-50 dark:bg-blue-950/20",
    5: "text-amber-700 bg-amber-50 dark:bg-amber-950/20",
    6: "text-orange-700 bg-orange-50 dark:bg-orange-950/20",
    7: "text-red-700 bg-red-50 dark:bg-red-950/20",
  };

  return (
    <Badge variant="outline" className={`text-[10px] ${colors[tier]}`}>
      Tier {tier}
    </Badge>
  );
}

function SourcesSection({ sources }: { sources: SourceEntry[] }) {
  return (
    <div>
      <SectionHeader
        icon={FileText}
        title="Sources & Confidence"
        badge={`${sources.length} sources`}
      />
      <div className="space-y-2">
        {sources.map((src, i) => (
          <div key={i} className="flex items-start gap-2 text-xs">
            <SourceTierBadge tier={src.tier} />
            <div className="flex-1">
              <p className="notranslate font-medium">{src.name}</p>
              <p className="notranslate text-muted-foreground">{src.claim}</p>
              {src.url && (
                <a
                  href={src.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline dark:text-blue-400"
                >
                  {src.url}
                </a>
              )}
            </div>
            <ConfidenceBadge level={src.confidence} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Limitations ─────────────────────────────────────────────────────────────

function LimitationsSection({ limitations }: { limitations: string[] }) {
  if (limitations.length === 0) return null;

  return (
    <div>
      <SectionHeader icon={AlertTriangle} title="Limitations & Data Gaps" />
      <ul className="space-y-1.5">
        {limitations.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-xs">
            <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
            <span className="text-muted-foreground">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Follow-Up Candidates ────────────────────────────────────────────────────

function FollowUpSection({
  candidates,
}: {
  candidates: IndustryBrief["followUpCandidates"];
}) {
  if (candidates.length === 0) return null;

  return (
    <div>
      <SectionHeader
        icon={Target}
        title="Follow-Up Candidates"
        badge={`${candidates.length} stocks`}
      />
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted-foreground border-border border-b text-[10px] tracking-wider uppercase">
              <th className="py-1.5 pr-3 text-left font-medium">Ticker</th>
              <th className="py-1.5 pr-3 text-left font-medium">Company</th>
              <th className="py-1.5 pr-3 text-left font-medium">Exchange</th>
              <th className="py-1.5 text-left font-medium">Reason</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((c, i) => (
              <tr key={i} className="border-border/30 border-b last:border-0">
                <td className="notranslate py-1.5 pr-3 font-mono font-semibold">
                  {c.ticker}
                </td>
                <td className="notranslate py-1.5 pr-3">{c.name}</td>
                <td className="notranslate text-muted-foreground py-1.5 pr-3">
                  {c.exchange}
                </td>
                <td className="text-muted-foreground py-1.5">{c.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main Industry Brief View ────────────────────────────────────────────────

export function IndustryBriefView({ brief }: { brief: IndustryBrief }) {
  return (
    <div className="space-y-6">
      <DefinitionSection definition={brief.definition} />
      <Separator />
      <ValueChainSection valueChain={brief.valueChain} />
      <Separator />
      <MarketSizingSection brief={brief} />
      <Separator />
      <CompetitionSection brief={brief} />
      <Separator />
      <SourcesSection sources={brief.sources} />
      <Separator />
      <LimitationsSection limitations={brief.limitations} />
      <FollowUpSection candidates={brief.followUpCandidates} />

      {/* MIT License attribution */}
      <p className="text-muted-foreground/50 border-t pt-2 text-[10px]">
        Industry Research Brief methodology adapted from{" "}
        <a
          href="https://github.com/Guan-Yep/industry-research"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-muted-foreground underline"
        >
          Guan-Yep/industry-research
        </a>{" "}
        (MIT License). For research only. Not investment advice.
      </p>
    </div>
  );
}
