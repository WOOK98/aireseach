"use client";

/* oxlint-disable i18next/no-literal-string */

/**
 * Workspace right inspector — read-only context rail.
 *
 * Explains the currently selected workspace context: active object,
 * live vs disabled views, next action hints, and linked existing routes.
 * No write/publish behavior — links only navigate to existing routes.
 */
import {
  Activity,
  ArrowRight,
  Archive,
  BookOpen,
  CircleDot,
  CircleOff,
  FileText,
  Home,
  Inbox,
  Map,
  NotebookPen,
  Send,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { pathsConfig } from "~/config/paths";

const ws = pathsConfig.dashboard.user.workspace;

interface InspectorContext {
  readonly key: string;
  readonly title: string;
  readonly icon: React.ReactNode;
  readonly description: string;
  readonly nextActions: readonly string[];
  readonly links: readonly { label: string; href: string }[];
}

const CONTEXTS: readonly InspectorContext[] = [
  {
    key: "home",
    title: "Workspace Home",
    icon: <Home className="h-4 w-4" />,
    description:
      "Unified view over your research objects. Recents aggregate from existing sources — no mock data.",
    nextActions: [
      "Capture evidence in Inbox",
      "Generate a report in Research to create notes",
      "Review conviction tiers in Companies",
    ],
    links: [
      { label: "Notes", href: pathsConfig.dashboard.user.notes },
      { label: "Inbox", href: pathsConfig.dashboard.user.inbox },
      { label: "Research", href: pathsConfig.dashboard.user.research },
    ],
  },
  {
    key: "notes",
    title: "Notes",
    icon: <NotebookPen className="h-4 w-4" />,
    description:
      "Research notes with evidence counts. Live — backed by the existing notes workspace.",
    nextActions: ["Open the three-column notes workspace", "Edit a note"],
    links: [{ label: "Notes", href: pathsConfig.dashboard.user.notes }],
  },
  {
    key: "inbox",
    title: "Inbox",
    icon: <Inbox className="h-4 w-4" />,
    description:
      "Collect evidence from URLs, text, or posts. Live — backed by the existing inbox.",
    nextActions: ["Paste a URL or text snippet", "Triage captured evidence"],
    links: [{ label: "Inbox", href: pathsConfig.dashboard.user.inbox }],
  },
  {
    key: "pdfs",
    title: "PDFs",
    icon: <FileText className="h-4 w-4" />,
    description:
      "Upload and annotate research PDFs. Live — backed by the existing PDF reader.",
    nextActions: ["Upload a PDF", "Annotate a document"],
    links: [{ label: "PDFs", href: pathsConfig.dashboard.user.pdfs }],
  },
  {
    key: "watchlist",
    title: "Companies",
    icon: <Activity className="h-4 w-4" />,
    description:
      "Conviction tiers and invalidation conditions. Live — backed by the existing watchlist.",
    nextActions: ["Review tier changes", "Check invalidation conditions"],
    links: [{ label: "Watchlist", href: pathsConfig.dashboard.user.watchlist }],
  },
  {
    key: "atlas",
    title: "Industries",
    icon: <Map className="h-4 w-4" />,
    description:
      "Industry and data atlas views. Live — backed by the existing visuals surface.",
    nextActions: ["Explore industry maps", "Review data coverage"],
    links: [{ label: "Visuals", href: pathsConfig.dashboard.user.visuals }],
  },
];

const LIVE_VIEWS = [
  "Home",
  "Notes",
  "Inbox",
  "PDFs",
  "Companies",
  "Industries",
];
const DISABLED_VIEWS = ["Evidence", "Exports"];

const HOME_CONTEXT = CONTEXTS[0] as InspectorContext;

function resolveContext(pathname: string): InspectorContext {
  const match = CONTEXTS.find(
    (c) => c.key !== "home" && pathname.startsWith(`${ws}/${c.key}`),
  );
  return match ?? HOME_CONTEXT;
}

function InspectorSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <p className="text-muted-foreground/60 mb-1.5 px-1 text-[11px] font-medium tracking-wider uppercase">
        {title}
      </p>
      {children}
    </section>
  );
}

export function WorkspaceInspector() {
  const pathname = usePathname();
  const context = resolveContext(pathname);

  return (
    <aside className="bg-card hidden h-full w-64 flex-col border-l lg:flex xl:w-72">
      <div className="flex items-center gap-2 border-b px-4 py-3">
        {context.icon}
        <span className="text-sm font-semibold tracking-tight">
          {context.title}
        </span>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        <InspectorSection title="Context">
          <p className="text-muted-foreground px-1 text-xs leading-relaxed">
            {context.description}
          </p>
        </InspectorSection>

        <InspectorSection title="Status">
          <ul className="space-y-1 px-1">
            {LIVE_VIEWS.map((view) => (
              <li
                key={view}
                className="text-muted-foreground flex items-center gap-2 text-xs"
              >
                <CircleDot className="h-3 w-3 text-emerald-500" />
                <span>{view}</span>
                <span className="text-muted-foreground/50">live</span>
              </li>
            ))}
            {DISABLED_VIEWS.map((view) => (
              <li
                key={view}
                className="text-muted-foreground/50 flex items-center gap-2 text-xs"
              >
                <CircleOff className="h-3 w-3" />
                <span>{view}</span>
                <span>coming in next cut</span>
              </li>
            ))}
          </ul>
        </InspectorSection>

        <InspectorSection title="Next actions">
          <ul className="space-y-1.5 px-1">
            {context.nextActions.map((action) => (
              <li
                key={action}
                className="text-muted-foreground flex items-start gap-2 text-xs leading-relaxed"
              >
                <ArrowRight className="mt-0.5 h-3 w-3 shrink-0" />
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </InspectorSection>

        <InspectorSection title="Linked views">
          <div className="space-y-0.5 px-1">
            {context.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-muted-foreground hover:bg-accent/50 hover:text-foreground flex items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors"
              >
                <BookOpen className="h-3 w-3" />
                <span>{link.label}</span>
              </Link>
            ))}
          </div>
        </InspectorSection>

        <InspectorSection title="Placeholders">
          <div className="space-y-1 px-1">
            <div className="text-muted-foreground/50 flex cursor-not-allowed items-center gap-2 px-2 py-1.5 text-xs">
              <Archive className="h-3 w-3" />
              <span>Evidence explorer — disabled</span>
            </div>
            <div className="text-muted-foreground/50 flex cursor-not-allowed items-center gap-2 px-2 py-1.5 text-xs">
              <Send className="h-3 w-3" />
              <span>Exports — disabled</span>
            </div>
            <p className="text-muted-foreground/40 px-2 text-[11px] leading-relaxed">
              Placeholders are read-only and non-executable.
            </p>
          </div>
        </InspectorSection>
      </div>

      <div className="border-t px-4 py-2">
        <p className="text-muted-foreground/50 text-[11px]">
          Read-only inspector — no write or publish actions.
        </p>
      </div>
    </aside>
  );
}
