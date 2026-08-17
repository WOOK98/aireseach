/* oxlint-disable i18next/no-literal-string */

import { CheckCircle2 } from "lucide-react";
import { memo } from "react";

export const ScenarioMatrix = memo(function ScenarioMatrix({
  scenarios,
}: {
  scenarios: NonNullable<
    import("@workspace/shared/types/report").ReportData["scenarioMatrix"]
  >;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {scenarios.map((scenario) => (
        <div
          key={`${scenario.scenario}-${scenario.keyMetric}`}
          className="bg-muted/30 rounded-xl border p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">{scenario.scenario}</p>
              <p className="text-muted-foreground text-xs">
                Probability {scenario.probability}%
              </p>
            </div>
            <p className="max-w-[9rem] text-right font-mono text-xs leading-snug font-semibold">
              {scenario.keyMetric}
            </p>
          </div>
          <div className="bg-background mt-3 h-1.5 overflow-hidden rounded-full">
            <div
              className="bg-primary h-full rounded-full"
              style={{ width: `${Math.max(4, scenario.probability)}%` }}
            />
          </div>
          <ul className="mt-3 space-y-1.5">
            {scenario.drivers.slice(0, 3).map((driver) => (
              <li
                key={driver}
                className="text-muted-foreground flex gap-2 text-xs leading-relaxed"
              >
                <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
                {driver}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
});
