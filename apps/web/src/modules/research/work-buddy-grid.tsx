/* oxlint-disable i18next/no-literal-string */

import { Activity, Users } from "lucide-react";
import { memo } from "react";

import { Section } from "./section";

export const WorkBuddyGrid = memo(function WorkBuddyGrid({
  report,
}: {
  report: import("@workspace/shared/types/report").ReportData;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {report.roleBriefs && report.roleBriefs.length > 0 && (
        <Section label="Role Briefs" icon={Users}>
          <div className="space-y-2">
            {report.roleBriefs.slice(0, 4).map((item) => (
              <div key={item.role} className="rounded-lg border px-3 py-3">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{item.role}</p>
                  <span className="text-muted-foreground text-[10px] uppercase">
                    Concern
                  </span>
                </div>
                <p className="text-foreground/90 text-xs leading-relaxed">
                  {item.takeaway}
                </p>
                <p className="text-muted-foreground mt-1.5 text-xs leading-relaxed">
                  {item.concern}
                </p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {report.watchlist && report.watchlist.length > 0 && (
        <Section label="Watchlist" icon={Activity}>
          <div className="space-y-2">
            {report.watchlist.slice(0, 5).map((item) => (
              <div
                key={item.metric}
                className="bg-muted/20 rounded-lg border p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{item.metric}</p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {item.whyItMatters}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-xs font-semibold">
                      {item.current}
                    </p>
                    <p className="text-muted-foreground text-[10px]">
                      {item.threshold}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
});
