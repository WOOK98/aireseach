"use client";

/* oxlint-disable i18next/no-literal-string */

/**
 * Workspace Home v1 — Notion-style research command center (#172)
 *
 * Sits on top of #170's three-column workspace shell.
 * When no note is selected, the center + right columns render this home
 * view instead of the empty placeholder.
 *
 * Data sources: real notes / PDFs / inbox only — no mocks, no fixtures.
 * Publish step: disabled placeholder only — never executable.
 *
 * REDLINES:
 * - All dynamic text (ticker/date/period/source/value) wrapped in
 *   notranslate <span> to survive Chrome auto-translate.
 * - Missing data renders as "—" or honest empty state, never 0/假进度.
 * - No export / public sharing / X write path introduced here.
 */
import {
  BarChart3,
  CheckCircle2,
  Circle,
  Clock,
  FileText,
  Home,
  Inbox,
  Loader2,
  NotebookPen,
  Pencil,
  Search,
  Send,
  Upload,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Badge } from "@workspace/ui-web/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui-web/card";
import { Input } from "@workspace/ui-web/input";
import { Skeleton } from "@workspace/ui-web/skeleton";

import { pathsConfig } from "~/config/paths";
import { useInbox } from "~/modules/inbox/use-inbox";
import { useNotes } from "~/modules/notes/use-notes";
import {
  buildRecents,
  filterRecents,
  greetingForHour,
  homeNavHref,
  homeSummary,
  recentItemHref,
  researchLoopState,
} from "~/modules/notes/workspace-home-view";
import { usePdfs } from "~/modules/pdfs/use-pdfs";

import type {
  HomeNavKey,
  RecentItem,
} from "~/modules/notes/workspace-home-view";

// ── Nav items (left rail on desktop, horizontal chips on mobile) ────────────

interface HomeNavItem {
  key: HomeNavKey;
  label: string;
  icon: typeof Home;
  enabled: boolean;
  href?: string;
}

const NAV_ITEMS: HomeNavItem[] = [
  { key: "home", label: "首页", icon: Home, enabled: true },
  { key: "workspace", label: "工作台", icon: NotebookPen, enabled: true },
  {
    key: "write",
    label: "写作",
    icon: Pencil,
    enabled: true,
    href: homeNavHref("write", pathsConfig.dashboard.user) ?? undefined,
  },
  {
    key: "reader",
    label: "研报",
    icon: FileText,
    enabled: true,
    href: homeNavHref("reader", pathsConfig.dashboard.user) ?? undefined,
  },
  {
    key: "inbox",
    label: "收件箱",
    icon: Inbox,
    enabled: true,
    href: homeNavHref("inbox", pathsConfig.dashboard.user) ?? undefined,
  },
  { key: "publish", label: "发布", icon: Send, enabled: false },
  { key: "search", label: "搜索", icon: Search, enabled: true },
];

// ── Loop step icon ──────────────────────────────────────────────────────────

function LoopStepIcon({ status }: { status: string }) {
  if (status === "active")
    return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  if (status === "empty")
    return <Circle className="text-muted-foreground h-4 w-4" />;
  if (status === "disabled")
    return <XCircle className="text-muted-foreground h-4 w-4 opacity-50" />;
  return <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />;
}

// ── Recent item row ─────────────────────────────────────────────────────────

function RecentItemRow({
  item,
  onOpenNote,
}: {
  item: RecentItem;
  onOpenNote: (id: string) => void;
}) {
  const icon =
    item.kind === "note" ? (
      <NotebookPen className="h-4 w-4 shrink-0" />
    ) : item.kind === "pdf" ? (
      <FileText className="h-4 w-4 shrink-0" />
    ) : (
      <Inbox className="h-4 w-4 shrink-0" />
    );
  const href = recentItemHref(item, pathsConfig.dashboard.user);
  const className =
    "hover:bg-muted/50 flex w-full items-center gap-3 rounded-lg px-3 py-1.5 text-left transition-colors";

  const inner = (
    <>
      {icon}
      <div className="min-w-0 flex-1">
        <p
          className="notranslate line-clamp-1 text-sm font-medium"
          translate="no"
        >
          {item.title}
        </p>
        {item.meta && (
          <span
            className="notranslate text-muted-foreground text-xs"
            translate="no"
          >
            {item.meta}
          </span>
        )}
      </div>
      <span
        className="notranslate text-muted-foreground shrink-0 text-[10px]"
        translate="no"
      >
        {item.timestamp
          ? new Date(item.timestamp).toLocaleDateString("zh-CN")
          : "—"}
      </span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {inner}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onOpenNote(item.id)}
      className={className}
    >
      {inner}
    </button>
  );
}

// ── Action card ─────────────────────────────────────────────────────────────

function ActionCard({
  icon: Icon,
  label,
  description,
  href,
  disabled,
}: {
  icon: typeof Upload;
  label: string;
  description: string;
  href?: string;
  disabled?: boolean;
}) {
  const inner = (
    <Card
      className={`h-full transition-colors ${
        disabled ? "opacity-50" : "hover:border-primary/60 cursor-pointer"
      }`}
    >
      <CardContent className="flex items-start gap-2.5 p-3">
        <div className="bg-primary/10 text-primary rounded-md p-1.5">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
            {description}
          </p>
        </div>
      </CardContent>
    </Card>
  );

  if (disabled || !href) return inner;
  return <Link href={href}>{inner}</Link>;
}

// ── Skeletons ───────────────────────────────────────────────────────────────

function HomeCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-16 w-full" />
      </CardContent>
    </Card>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export function WorkspaceHome({
  onOpenNote,
  onEnterWorkspace,
}: {
  onOpenNote: (id: string) => void;
  onEnterWorkspace: () => void;
}) {
  const [activeNav, setActiveNav] = useState<HomeNavKey>("home");
  const [searchQuery, setSearchQuery] = useState("");

  // Real data hooks — null when loading/errored → honest N/A.
  const notesQuery = useNotes({});
  const pdfsQuery = usePdfs();
  const inboxQuery = useInbox();

  const notes = notesQuery.data ?? null;
  const pdfs = pdfsQuery.data ?? null;
  const inbox = inboxQuery.data ?? null;

  const isLoading =
    notesQuery.isLoading || pdfsQuery.isLoading || inboxQuery.isLoading;

  const summary = useMemo(
    () => homeSummary({ notes, inbox, pdfs }),
    [notes, inbox, pdfs],
  );
  const loop = useMemo(
    () => researchLoopState({ inbox, notes }),
    [inbox, notes],
  );
  const recents = useMemo(
    () => buildRecents({ notes, pdfs, inbox }),
    [notes, pdfs, inbox],
  );
  const filteredRecents = useMemo(
    () =>
      activeNav === "search" ? filterRecents(recents, searchQuery) : recents,
    [recents, searchQuery, activeNav],
  );

  function handleNavClick(key: HomeNavKey) {
    const item = NAV_ITEMS.find((n) => n.key === key);
    if (!item?.enabled || item.href) return;
    if (key === "workspace") {
      setActiveNav("workspace");
      onEnterWorkspace();
      return;
    }
    if (key === "search") {
      setActiveNav((prev) => (prev === "search" ? "home" : "search"));
      return;
    }
    setActiveNav(key);
  }

  const today = new Date().toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return (
    <div className="flex h-full flex-col gap-5 lg:flex-row">
      {/* ── Left nav rail (desktop only) ── */}
      <nav className="hidden w-48 shrink-0 lg:block">
        <p className="text-muted-foreground mb-2 px-3 text-xs font-medium tracking-wide">
          研究空间
        </p>
        <div className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const className = `flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
              activeNav === item.key
                ? "bg-primary/10 text-primary font-medium"
                : item.enabled
                  ? "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  : "text-muted-foreground/50 cursor-not-allowed"
            }`;
            const inner = (
              <>
                <item.icon className="h-4 w-4" />
                {item.label}
                {!item.enabled && (
                  <Badge variant="outline" className="ml-auto text-[9px]">
                    后续
                  </Badge>
                )}
              </>
            );
            if (item.enabled && item.href) {
              return (
                <Link key={item.key} href={item.href} className={className}>
                  {inner}
                </Link>
              );
            }
            return (
              <button
                key={item.key}
                type="button"
                disabled={!item.enabled}
                onClick={() => handleNavClick(item.key)}
                className={className}
              >
                {inner}
              </button>
            );
          })}
        </div>
      </nav>

      {/* ── Mobile nav chips ── */}
      <div className="flex gap-2 overflow-x-auto pb-2 lg:hidden">
        {NAV_ITEMS.filter((n) => n.enabled).map((item) => {
          const className = `flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors ${
            activeNav === item.key
              ? "border-primary bg-primary/10 text-primary"
              : "text-muted-foreground hover:border-primary/40"
          }`;
          const inner = (
            <>
              <item.icon className="h-3 w-3" />
              {item.label}
            </>
          );
          if (item.href) {
            return (
              <Link key={item.key} href={item.href} className={className}>
                {inner}
              </Link>
            );
          }
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => handleNavClick(item.key)}
              className={className}
            >
              {inner}
            </button>
          );
        })}
      </div>

      {/* ── Main content ── */}
      <div className="min-w-0 flex-1 space-y-4">
        {/* ── Greeting ── */}
        <div>
          <h2 className="text-lg font-semibold">
            {greetingForHour(new Date().getHours())}
          </h2>
          <span
            className="notranslate text-muted-foreground text-sm"
            translate="no"
          >
            {today}
          </span>
          <p className="text-muted-foreground mt-1 text-sm">
            {isLoading ? (
              <Skeleton className="inline-block h-4 w-48" />
            ) : (
              <>
                共 {summary.noteCount ?? "—"} 篇笔记 ·{" "}
                {summary.inboxCount ?? "—"} 条收件 · {summary.pdfCount ?? "—"}{" "}
                份文档
              </>
            )}
          </p>
        </div>

        {/* ── Search bar (only when search nav active) ── */}
        {activeNav === "search" && (
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索笔记、PDF、收件箱..."
              className="pl-9"
              autoFocus
            />
          </div>
        )}

        {/* ── Research Loop: slim stepper strip ── */}
        {isLoading ? (
          <HomeCardSkeleton />
        ) : (
          <Card>
            <CardContent className="flex flex-wrap items-center gap-x-4 gap-y-2 p-3">
              <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                <BarChart3 className="h-3.5 w-3.5" />
                研究闭环
              </span>
              <div className="flex items-center gap-1.5">
                <LoopStepIcon status={loop.capture.status} />
                <span className="text-sm">
                  捕获{" "}
                  <span className="notranslate" translate="no">
                    {loop.capture.count ?? "—"}
                  </span>
                </span>
              </div>
              <div className="text-muted-foreground text-xs">→</div>
              <div className="flex items-center gap-1.5">
                <LoopStepIcon status={loop.create.status} />
                <span className="text-sm">
                  创作{" "}
                  <span className="notranslate" translate="no">
                    {loop.create.count ?? "—"}
                  </span>
                </span>
              </div>
              <div className="text-muted-foreground text-xs">→</div>
              <div className="flex items-center gap-1.5">
                <LoopStepIcon status={loop.publish.status} />
                <span className="text-muted-foreground text-sm">
                  发布{" "}
                  <Badge variant="outline" className="ml-1 text-[9px]">
                    占位 — 后续版本
                  </Badge>
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ── Quick actions ── */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          <ActionCard
            icon={Inbox}
            label="粘贴链接"
            description="快速捕获网页剪藏到收件箱"
            href={pathsConfig.dashboard.user.inbox}
          />
          <ActionCard
            icon={Upload}
            label="上传研报"
            description="PDF 研报自动解析与标注"
            href={pathsConfig.dashboard.user.pdfs}
          />
          <ActionCard
            icon={Pencil}
            label="开始研报"
            description="AI 辅助生成研究文章"
            href={pathsConfig.dashboard.user.research}
          />
          <ActionCard
            icon={BarChart3}
            label="问研究助手"
            description="基于已有证据进行研究问答"
            href={pathsConfig.dashboard.user.research}
          />
        </div>

        {/* ── Recents ── */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4" />
              最近工作
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : filteredRecents.length === 0 ? (
              <p className="text-muted-foreground rounded-md border border-dashed p-6 text-center text-sm">
                {searchQuery
                  ? "没有匹配的结果"
                  : "还没有任何研究内容 — 从上方的动作卡片开始吧"}
              </p>
            ) : (
              <div className="divide-border divide-y">
                {filteredRecents.map((item) => (
                  <RecentItemRow
                    key={`${item.kind}-${item.id}`}
                    item={item}
                    onOpenNote={onOpenNote}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
