"use client";

/**
 * WorkspaceShell — client wrapper that manages the three-column layout.
 *
 * Phase 1: right panel (inspector) is hidden by default, giving the
 * document full width. Users can toggle it open when needed.
 */
import { PanelRightClose, PanelRightOpen } from "lucide-react";
import { Suspense, useState } from "react";

import { cn } from "@workspace/ui";

import { WorkspaceInspector } from "~/modules/workspace/workspace-inspector";
import { WorkspaceSidebar } from "~/modules/workspace/workspace-sidebar";

export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const [inspectorOpen, setInspectorOpen] = useState(false);

  return (
    <div className="flex h-[calc(100svh-var(--banner-height,0px))]">
      <Suspense fallback={null}>
        <WorkspaceSidebar />
      </Suspense>

      <main className="relative min-w-0 flex-1 overflow-hidden">
        {/* Inspector toggle — floats in the top-right of the main area */}
        <button
          onClick={() => setInspectorOpen((v) => !v)}
          className={cn(
            "hover:bg-accent absolute top-2.5 right-2.5 z-10 flex h-7 w-7 items-center justify-center rounded-md transition-colors",
            inspectorOpen && "bg-accent",
          )}
          aria-label={inspectorOpen ? "Close panel" : "Open panel"}
        >
          {inspectorOpen ? (
            <PanelRightClose className="size-4" />
          ) : (
            <PanelRightOpen className="size-4" />
          )}
        </button>
        {children}
      </main>

      {/* Right inspector — hidden by default */}
      {inspectorOpen && (
        <Suspense fallback={null}>
          <WorkspaceInspector />
        </Suspense>
      )}
    </div>
  );
}
