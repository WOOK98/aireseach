/* oxlint-disable i18next/no-literal-string */

import { memo } from "react";

import { Skeleton } from "@workspace/ui-web/skeleton";

export const ReportSkeleton = memo(function ReportSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-7 w-48" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 9 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-44 rounded-lg" />
      <Skeleton className="h-44 rounded-lg" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-16 w-full" />
        </div>
      ))}
    </div>
  );
});
