/**
 * Workspace navigation model (#197) — pure logic, unit-testable.
 *
 * Single source of truth for the consolidated information architecture:
 * - the workspace sidebar sections (object space, not a SaaS feature list)
 * - the legacy `/dashboard/*` list-route → workspace redirect map
 * - the workspace home direct actions (no guides, just actions)
 *
 * No React, no fetch — pure data + tiny helpers only.
 */

import { pathsConfig } from "../../config/paths";

// ── Sidebar sections ────────────────────────────────────────────────────────

export type WorkspaceSectionId =
  | "home"
  | "notes"
  | "inbox"
  | "pdfs"
  | "research"
  | "companies"
  | "industries";

export type WorkspaceSectionGroup = "research" | "market";

export interface WorkspaceSection {
  readonly id: WorkspaceSectionId;
  readonly label: string;
  readonly group: WorkspaceSectionGroup;
  readonly href: string;
  /** Exact path match required for active state (used by Home). */
  readonly exact?: boolean;
  /**
   * Leaves the `/workspace` shell. Only allowed for routes that are real,
   * working product surfaces (analysis tool, data atlas) — never dead ends.
   */
  readonly external?: boolean;
}

const ws = pathsConfig.workspace;

/** Workspace root path — exported for tests that validate href prefixes. */
export const WORKSPACE_ROOT = ws.index;

/**
 * Sidebar sections. Invariant: no disabled placeholder entries — a section
 * either routes into the workspace loop or to a working external surface.
 */
export const WORKSPACE_SECTIONS: readonly WorkspaceSection[] = [
  {
    id: "home",
    label: "Home",
    group: "research",
    href: ws.index,
    exact: true,
  },
  { id: "notes", label: "Notes", group: "research", href: ws.notes },
  { id: "inbox", label: "Inbox", group: "research", href: ws.inbox },
  { id: "pdfs", label: "PDFs", group: "research", href: ws.pdfs },
  {
    id: "research",
    label: "Research",
    group: "research",
    href: pathsConfig.dashboard.user.research,
    external: true,
  },
  {
    id: "companies",
    label: "Companies",
    group: "market",
    href: ws.watchlist,
  },
  {
    id: "industries",
    label: "Industries",
    group: "market",
    href: pathsConfig.dashboard.user.visuals,
    external: true,
  },
];

export const WORKSPACE_SECTION_GROUPS: readonly {
  readonly id: WorkspaceSectionGroup;
  readonly label: string;
}[] = [
  { id: "research", label: "research" },
  { id: "market", label: "market" },
];

export function sectionsForGroup(
  group: WorkspaceSectionGroup,
): readonly WorkspaceSection[] {
  return WORKSPACE_SECTIONS.filter((s) => s.group === group);
}

// ── Legacy dashboard consolidation redirects ────────────────────────────────

/**
 * Legacy `/dashboard/*` list routes that now resolve into the workspace.
 * Detail/reader routes (`/dashboard/notes/[id]`, `/dashboard/pdfs/[id]`),
 * the analysis tool (`/dashboard/research`) and settings stay put — they
 * have working primary actions.
 */
/**
 * Legacy dashboard list routes that consolidate into the workspace.
 * Explicit key union keeps indexed access type-safe under
 * `noUncheckedIndexedAccess` and lets the redirect pages reference
 * literal keys directly.
 */
export type DashboardConsolidationRoute =
  | "/dashboard"
  | "/dashboard/notes"
  | "/dashboard/inbox"
  | "/dashboard/pdfs"
  | "/dashboard/watchlist";

export const DASHBOARD_CONSOLIDATION_REDIRECTS: Readonly<
  Record<DashboardConsolidationRoute, string>
> = {
  "/dashboard": ws.index,
  "/dashboard/notes": ws.notes,
  "/dashboard/inbox": ws.inbox,
  "/dashboard/pdfs": ws.pdfs,
  "/dashboard/watchlist": ws.watchlist,
};

// ── Workspace home direct actions ───────────────────────────────────────────

export type WorkspaceHomeActionId = "ask-ai" | "paste-source" | "upload-pdf";

export interface WorkspaceHomeAction {
  readonly id: WorkspaceHomeActionId;
  readonly label: string;
  readonly href: string;
  readonly external?: boolean;
}

/**
 * First-use direct actions. Every action lands on a working surface; none
 * require reading a guide first.
 */
export const WORKSPACE_HOME_ACTIONS: readonly WorkspaceHomeAction[] = [
  {
    id: "ask-ai",
    label: "Ask AI",
    href: pathsConfig.dashboard.user.research,
    external: true,
  },
  { id: "paste-source", label: "Paste source", href: ws.inbox },
  { id: "upload-pdf", label: "Upload PDF", href: ws.pdfs },
];
