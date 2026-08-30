import { Suspense } from "react";

import { Skeleton } from "@workspace/ui-web/skeleton";

import { WorkspaceCanvas } from "~/modules/workspace/workspace-canvas";

/**
 * `/workspace` — object-first research workspace (#186).
 *
 * Selection lives in the `?object=` URL param so it survives refresh and
 * is shareable. Suspense boundary required for useSearchParams.
 */
export default function WorkspacePage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4 p-6">
          <Skeleton className="h-9 w-full rounded-lg" />
          <Skeleton className="h-12 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      }
    >
      <WorkspaceCanvas />
    </Suspense>
  );
}
