"use client";

/* oxlint-disable i18next/no-literal-string */

/**
 * Workspace sidebar — document-first navigation (Phase 1).
 *
 * Layout: search → new page → page list → settings.
 * Pages are notes — the primary research object. PDFs and inbox items
 * surface through inline commands and the right panel, not sidebar sections.
 *
 * Responsive: desktop renders a fixed aside (240px); mobile renders a Sheet.
 */
import { FileText, Menu, Plus, Search, Settings, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { cn } from "@workspace/ui";
import { Sheet, SheetContent, SheetTrigger } from "@workspace/ui-web/sheet";

import { pathsConfig } from "~/config/paths";
import { useNotes, useSaveNote } from "~/modules/notes/use-notes";
import {
  objectHref,
  parseObjectParam,
} from "~/modules/workspace/workspace-object";

import type { SaveNoteInput } from "~/modules/notes/use-notes";

const ws = pathsConfig.workspace.index;

// ── Page list item ──────────────────────────────────────────────────────────

function PageItem({
  id,
  title,
  active,
}: {
  id: string;
  title: string;
  active: boolean;
}) {
  return (
    <Link
      href={objectHref(ws, { kind: "note", id })}
      className={cn(
        "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
        active
          ? "bg-accent text-accent-foreground font-medium"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
      )}
    >
      <FileText className="size-3.5 shrink-0" />
      <span className="notranslate line-clamp-1 min-w-0 flex-1" translate="no">
        {title || "Untitled"}
      </span>
    </Link>
  );
}

// ── Sidebar content ─────────────────────────────────────────────────────────

function SidebarNav({ pathname: _pathname }: { pathname: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeParam = searchParams.get("object");
  const activeRef = parseObjectParam(activeParam);
  const [query, setQuery] = useState("");

  const notesQuery = useNotes({});
  // Filter by search query
  const filtered = useMemo(() => {
    const notes = notesQuery.data ?? [];
    if (!query.trim()) return notes;
    const q = query.toLowerCase();
    return notes.filter(
      (n) =>
        (n.title || "").toLowerCase().includes(q) ||
        (n.entityTicker || "").toLowerCase().includes(q),
    );
  }, [notesQuery.data, query]);

  const saveNote = useSaveNote();

  function handleNewPage() {
    // Create a blank note. Try server API first; fall back to local storage
    // when the API is unavailable so offline users can still create pages.
    const now = new Date().toISOString();
    const stubArticle = {
      schema_version: 1 as const,
      entity: {
        resolvedName: "Untitled",
        mode: "ticker" as const,
        dataTimestamp: now.slice(0, 10),
      },
      coreThesis: {
        thesis: "",
        keyDriver: "",
        evidenceIds: ["E1"],
      },
      industryChain: {
        narrative: "",
        visual: {
          kind: "empty" as const,
          title: "产业链图",
          reason: "新建页面",
        },
        evidenceIds: ["E1"],
      },
      evidenceMatrix: {
        narrative: "",
        visual: {
          kind: "empty" as const,
          title: "关键数据表",
          reason: "新建页面",
        },
        evidenceIds: ["E1"],
      },
      companyLayer: {
        narrative: "",
        evidenceIds: ["E1"],
      },
      conclusion: {
        summary: "",
        risks: [],
        invalidationConditions: [],
        evidenceIds: ["E1"],
      },
      evidence: [
        {
          id: "E1",
          claim: "新建空白页面",
          source: "系统",
          date: now.slice(0, 10),
          url: "",
          confidence: "unverified" as const,
        },
      ],
      generatedAt: now,
      language: "zh" as const,
      disclaimer: "本报告仅供研究参考，不构成投资建议。",
    };

    const input: SaveNoteInput = {
      title: "",
      article: stubArticle,
    };

    saveNote.mutate(input, {
      onSuccess: (note) => {
        void notesQuery.refetch();
        router.push(objectHref(ws, { kind: "note", id: note.id }));
      },
      onError: () => {
        // Server unavailable — create a local note as fallback.
        void import("~/modules/notes/local-notes").then(
          ({ createLocalNote }): null => {
            try {
              const localNote = createLocalNote({
                title: input.title,
                article: stubArticle,
              });
              void notesQuery.refetch();
              router.push(objectHref(ws, { kind: "note", id: localNote.id }));
              toast.info("已离线创建页面，联网后自动同步");
            } catch {
              toast.error("本地存储已满，请清理后重试");
            }
            return null;
          },
        );
      },
    });
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between border-b px-3 py-2.5">
        <span className="text-sm font-semibold tracking-tight">Workspace</span>
      </div>

      {/* Search */}
      <div className="px-2 pt-2 pb-1">
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-2 size-3.5 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索页面…"
            className="w-full rounded-md border bg-transparent py-1.5 pr-7 pl-7 text-sm focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* New page */}
      <div className="px-2 pb-1">
        <button
          onClick={handleNewPage}
          className="text-muted-foreground hover:bg-accent/50 hover:text-foreground flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors"
        >
          <Plus className="size-3.5" />
          <span>新建页面</span>
        </button>
      </div>

      {/* Page list */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-1">
        {notesQuery.isLoading ? (
          <div className="space-y-1 px-2 py-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-muted h-7 animate-pulse rounded-md" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground px-2 py-4 text-center text-xs">
            {query ? "没有匹配的页面" : "还没有页面 — 点击上方新建"}
          </p>
        ) : (
          filtered.map((note) => (
            <PageItem
              key={note.id}
              id={note.id}
              title={note.title}
              active={activeRef?.kind === "note" && activeRef.id === note.id}
            />
          ))
        )}
      </nav>

      {/* Settings */}
      <div className="border-t px-3 py-2">
        <Link
          href={pathsConfig.dashboard.user.settings.index}
          className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-xs transition-colors"
        >
          <Settings className="size-3.5" />
          Settings
        </Link>
      </div>
    </>
  );
}

// ── Export ───────────────────────────────────────────────────────────────────

export function WorkspaceSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar — 240px */}
      <aside className="bg-card hidden h-full w-60 flex-col border-r lg:flex">
        <SidebarNav pathname={pathname} />
      </aside>

      {/* Mobile hamburger */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger
          render={(props, state) => (
            <button
              {...props}
              className={cn(
                "hover:bg-accent fixed top-3 left-3 z-40 flex h-8 w-8 items-center justify-center rounded-md transition-colors lg:hidden",
                state.open && "bg-accent",
              )}
              aria-label="Open workspace navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}
        />
        <SheetContent side="left" className="w-72 p-0" showCloseButton>
          <div className="flex h-full flex-col">
            <SidebarNav pathname={pathname} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
