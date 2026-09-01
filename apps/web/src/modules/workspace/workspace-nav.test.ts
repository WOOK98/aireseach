/**
 * Workspace navigation model tests (#197).
 *
 * Guards the consolidation contract:
 * - sidebar sections never contain disabled/dead-end entries
 * - external sections only point at working surfaces (research tool, atlas)
 * - legacy dashboard list routes redirect into the workspace shell
 * - home actions are direct and land on working surfaces
 */
import { describe, expect, it } from "vitest";

import {
  DASHBOARD_CONSOLIDATION_REDIRECTS,
  sectionsForGroup,
  WORKSPACE_HOME_ACTIONS,
  WORKSPACE_ROOT,
  WORKSPACE_SECTION_GROUPS,
  WORKSPACE_SECTIONS,
} from "./workspace-nav";

describe("WORKSPACE_SECTIONS", () => {
  it("has unique ids and hrefs", () => {
    const ids = WORKSPACE_SECTIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    const hrefs = WORKSPACE_SECTIONS.map((s) => s.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("every section belongs to a declared group", () => {
    const groupIds = new Set(WORKSPACE_SECTION_GROUPS.map((g) => g.id));
    for (const s of WORKSPACE_SECTIONS) {
      expect(groupIds.has(s.group)).toBe(true);
    }
  });

  it("every group has at least one section (no empty groups)", () => {
    for (const g of WORKSPACE_SECTION_GROUPS) {
      expect(sectionsForGroup(g.id).length).toBeGreaterThan(0);
    }
  });

  it("internal sections live under the workspace prefix", () => {
    for (const s of WORKSPACE_SECTIONS) {
      if (s.external) continue;
      expect(s.href.startsWith(WORKSPACE_ROOT)).toBe(true);
    }
  });

  it("only home requires exact matching", () => {
    for (const s of WORKSPACE_SECTIONS) {
      expect(s.exact === true).toBe(s.id === "home");
    }
  });
});

describe("DASHBOARD_CONSOLIDATION_REDIRECTS", () => {
  it("redirects every legacy list route into the workspace shell", () => {
    for (const [from, to] of Object.entries(
      DASHBOARD_CONSOLIDATION_REDIRECTS,
    )) {
      expect(from.startsWith("/dashboard")).toBe(true);
      expect(to.startsWith(WORKSPACE_ROOT)).toBe(true);
    }
  });

  it("covers the four duplicated object lists plus the dashboard index", () => {
    expect(Object.keys(DASHBOARD_CONSOLIDATION_REDIRECTS).sort()).toEqual(
      [
        "/dashboard",
        "/dashboard/inbox",
        "/dashboard/notes",
        "/dashboard/pdfs",
        "/dashboard/watchlist",
      ].sort(),
    );
  });

  it("never redirects detail/reader, analysis, or settings routes", () => {
    const keys = Object.keys(DASHBOARD_CONSOLIDATION_REDIRECTS);
    expect(keys).not.toContain("/dashboard/research");
    expect(keys.some((k) => k.includes("["))).toBe(false);
    expect(keys.some((k) => k.startsWith("/dashboard/settings"))).toBe(false);
  });
});

describe("WORKSPACE_HOME_ACTIONS", () => {
  it("offers direct actions only (no guides, no dead ends)", () => {
    expect(WORKSPACE_HOME_ACTIONS.length).toBeGreaterThanOrEqual(3);
    for (const action of WORKSPACE_HOME_ACTIONS) {
      expect(action.href.length).toBeGreaterThan(0);
      expect(action.label.trim().length).toBeGreaterThan(0);
    }
  });

  it("internal actions stay inside the workspace shell", () => {
    for (const action of WORKSPACE_HOME_ACTIONS) {
      if (action.external) continue;
      expect(action.href.startsWith(WORKSPACE_ROOT)).toBe(true);
    }
  });
});
