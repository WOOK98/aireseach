/**
 * Workspace visibility cutover (#193) — navigation path smoke tests.
 *
 * Guards the contract the UI relies on:
 * - `/workspace` is the primary research workspace entry in dashboard nav.
 * - Legacy dashboard routes (research/notes/inbox/pdfs) stay reachable.
 */
import { describe, expect, it } from "vitest";

import { pathsConfig, WORKSPACE_PREFIX } from "./paths";

describe("workspace navigation paths", () => {
  it("exposes /workspace as the dashboard workspace entry", () => {
    expect(WORKSPACE_PREFIX).toBe("/workspace");
    expect(pathsConfig.dashboard.user.workspace).toBe("/workspace");
    expect(pathsConfig.dashboard.user.workspace).toBe(WORKSPACE_PREFIX);
  });

  it("keeps legacy dashboard routes reachable", () => {
    const user = pathsConfig.dashboard.user;
    expect(user.watchlist).toBe("/dashboard/watchlist");
    expect(user.research).toBe("/dashboard/research");
    expect(user.notes).toBe("/dashboard/notes");
    expect(user.inbox).toBe("/dashboard/inbox");
    expect(user.pdfs).toBe("/dashboard/pdfs");
  });
});
