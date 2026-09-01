"use client";

/* oxlint-disable i18next/no-literal-string */

/**
 * Workspace sidebar — Notion-style object space navigation (#197).
 *
 * Sections derived from the pure `WORKSPACE_SECTIONS` model in
 * `workspace-nav.ts`. Every entry is a working surface — no disabled
 * placeholders, no dead ends.
 *
 * Responsive: desktop renders a fixed aside; mobile renders a Sheet drawer
 * triggered by a hamburger button (positioned fixed, z-40).
 */
import {
  Activity,
  BarChart3,
  BookOpen,
  FileText,
  Home,
  Inbox,
  Map,
  Menu,
  NotebookPen,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { cn } from "@workspace/ui";
import { Sheet, SheetContent, SheetTrigger } from "@workspace/ui-web/sheet";

import { pathsConfig } from "~/config/paths";
import { useInbox } from "~/modules/inbox/use-inbox";
import { useNotes } from "~/modules/notes/use-notes";
import { usePdfs } from "~/modules/pdfs/use-pdfs";
import {
  sectionsForGroup,
  WORKSPACE_SECTION_GROUPS,
  type WorkspaceSectionId,
} from "~/modules/workspace/workspace-nav";
import {
  buildWorkspaceObjects,
  formatObjectParam,
  objectHref,
  parseObjectParam,
  type WorkspaceObject,
} from "~/modules/workspace/workspace-object";

interface SidebarItem {
  readonly label: string;
  readonly href: string;
  readonly icon: React.ReactNode;
  readonly disabled?: boolean;
  readonly exact?: boolean;
}

interface SidebarGroup {
  readonly label: string;
  readonly items: readonly SidebarItem[];
}

/**
 * Icon map for workspace sections. Kept outside the pure nav model
 * so the module stays React-free and unit-testable.
 */
const SECTION_ICONS: Record<WorkspaceSectionId, React.ReactNode> = {
  home: <Home className="h-4 w-4" />,
  notes: <NotebookPen className="h-4 w-4" />,
  inbox: <Inbox className="h-4 w-4" />,
  pdfs: <FileText className="h-4 w-4" />,
  research: <BarChart3 className="h-4 w-4" />,
  companies: <Activity className="h-4 w-4" />,
  industries: <Map className="h-4 w-4" />,
};

const ws = pathsConfig.workspace.index;

/**
 * Sidebar groups derived from the pure nav model (#197).
 * No disabled placeholders — every entry is a working surface.
 */
const SIDEBAR_GROUPS: readonly SidebarGroup[] = WORKSPACE_SECTION_GROUPS.map(
  (group) => ({
    label: group.label,
    items: sectionsForGroup(group.id).map((s) => ({
      label: s.label,
      href: s.href,
      icon: SECTION_ICONS[s.id],
      exact: s.exact,
    })),
  }),
);

function WorkspaceSidebarItem({
  item,
  active,
}: {
  item: SidebarItem;
  active: boolean;
}) {
  if (item.disabled) {
    return (
      <div className="text-muted-foreground/50 flex cursor-not-allowed items-center gap-2.5 rounded-md px-2 py-1.5 text-sm">
        {item.icon}
        <span>{item.label}</span>
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors",
        active
          ? "bg-accent text-accent-foreground font-medium"
          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
      )}
    >
      {item.icon}
      <span>{item.label}</span>
    </Link>
  );
}

const OBJECT_ICONS = {
  note: <NotebookPen className="h-4 w-4 shrink-0" />,
  pdf: <FileText className="h-4 w-4 shrink-0" />,
  inbox: <Inbox className="h-4 w-4 shrink-0" />,
} as const;

/**
 * Recent objects — object-first navigation (#186). Real data from the
 * notes / PDFs / inbox hooks; each row selects `?object=` in the canvas.
 */
function RecentObjects({ activeParam }: { activeParam: string | null }) {
  const notesQuery = useNotes({});
  const pdfsQuery = usePdfs({});
  const inboxQuery = useInbox();

  const objects = useMemo(
    () =>
      buildWorkspaceObjects({
        notes: notesQuery.data,
        pdfs: pdfsQuery.data,
        inbox: inboxQuery.data,
      }).slice(0, 6),
    [notesQuery.data, pdfsQuery.data, inboxQuery.data],
  );

  if (objects.length === 0) return null;

  return (
    <div>
      <p className="text-muted-foreground/60 mb-1 px-2 text-[11px] font-medium tracking-wider uppercase">
        recent objects
      </p>
      <div className="space-y-0.5">
        {objects.map((obj: WorkspaceObject) => {
          const param = formatObjectParam(obj);
          return (
            <Link
              key={param}
              href={objectHref(ws, obj)}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors",
                activeParam === param
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
              )}
            >
              {OBJECT_ICONS[obj.kind]}
              <span
                className="notranslate line-clamp-1 min-w-0 flex-1"
                translate="no"
              >
                {obj.title}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Inner sidebar content — shared between desktop aside and mobile Sheet.
 */
function SidebarNav({ pathname }: { pathname: string }) {
  const searchParams = useSearchParams();
  const activeParam = searchParams.get("object");
  // Section links stay active only when no object is selected — an
  // `?object=` selection supersedes section highlighting.
  const hasSelection = parseObjectParam(activeParam) !== null;
  const isActive = (item: SidebarItem) => {
    if (item.exact) return pathname === item.href && !hasSelection;
    return pathname.startsWith(item.href);
  };

  return (
    <>
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <BookOpen className="text-primary h-5 w-5" />
        <span className="text-sm font-semibold tracking-tight">
          Research Workspace
        </span>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto px-2 py-3">
        {SIDEBAR_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="text-muted-foreground/60 mb-1 px-2 text-[11px] font-medium tracking-wider uppercase">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <WorkspaceSidebarItem
                  key={item.label}
                  item={item}
                  active={isActive(item)}
                />
              ))}
            </div>
          </div>
        ))}
        <RecentObjects activeParam={activeParam} />
      </nav>

      <div className="border-t px-4 py-2">
        <Link
          href={pathsConfig.dashboard.user.settings.index}
          className="text-muted-foreground hover:text-foreground text-xs transition-colors"
        >
          <Settings className="mr-1 inline h-3 w-3" />
          Settings
        </Link>
      </div>
    </>
  );
}

export function WorkspaceSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar — visible at lg+ */}
      <aside className="bg-card hidden h-full w-56 flex-col border-r lg:flex">
        <SidebarNav pathname={pathname} />
      </aside>

      {/* Mobile hamburger — visible below lg */}
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
