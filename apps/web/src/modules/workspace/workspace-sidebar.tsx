"use client";

/* oxlint-disable i18next/no-literal-string */

/**
 * Workspace sidebar — Notion-style object space navigation.
 *
 * Research objects (Notes / Inbox / PDFs), market objects
 * (Watchlist / Atlas), and disabled placeholders for future capabilities.
 */
import {
  Activity,
  Archive,
  BookOpen,
  FileText,
  Home,
  Inbox,
  Map,
  NotebookPen,
  Send,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@workspace/ui";

import { pathsConfig } from "~/config/paths";

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

const ws = pathsConfig.dashboard.user.workspace;

const SIDEBAR_GROUPS: readonly SidebarGroup[] = [
  {
    label: "research",
    items: [
      {
        label: "Home",
        href: ws,
        icon: <Home className="h-4 w-4" />,
        exact: true,
      },
      {
        label: "Notes",
        href: `${ws}/notes`,
        icon: <NotebookPen className="h-4 w-4" />,
      },
      {
        label: "Inbox",
        href: `${ws}/inbox`,
        icon: <Inbox className="h-4 w-4" />,
      },
      {
        label: "PDFs",
        href: `${ws}/pdfs`,
        icon: <FileText className="h-4 w-4" />,
      },
      {
        label: "Evidence",
        href: "#evidence",
        icon: <Archive className="h-4 w-4" />,
        disabled: true,
      },
    ],
  },
  {
    label: "market",
    items: [
      {
        label: "Companies",
        href: `${ws}/watchlist`,
        icon: <Activity className="h-4 w-4" />,
      },
      {
        label: "Industries",
        href: `${ws}/atlas`,
        icon: <Map className="h-4 w-4" />,
      },
    ],
  },
  {
    label: "publish",
    items: [
      {
        label: "Exports",
        href: "#exports",
        icon: <Send className="h-4 w-4" />,
        disabled: true,
      },
    ],
  },
];

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

export function WorkspaceSidebar() {
  const pathname = usePathname();

  const isActive = (item: SidebarItem) => {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  };

  return (
    <aside className="bg-card flex h-full w-56 flex-col border-r">
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
      </nav>

      <div className="border-t px-4 py-2">
        <Link
          href={pathsConfig.dashboard.user.index}
          className="text-muted-foreground hover:text-foreground text-xs transition-colors"
        >
          ← Dashboard
        </Link>
      </div>
    </aside>
  );
}
