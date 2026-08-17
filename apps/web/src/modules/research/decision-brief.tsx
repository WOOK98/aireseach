/* oxlint-disable i18next/no-literal-string */

import { Target } from "lucide-react";
import { memo } from "react";

export const DecisionBrief = memo(function DecisionBrief({
  action,
  confidence,
  timeHorizon,
  keyQuestion,
}: {
  action: string;
  confidence: string;
  timeHorizon: string;
  keyQuestion: string;
}) {
  return (
    <div className="border-primary/30 bg-primary/5 grid gap-4 rounded-xl border p-4 md:grid-cols-[1fr_1.2fr]">
      <div>
        <p className="text-primary mb-2 font-mono text-[10px] tracking-widest uppercase">
          Decision Brief
        </p>
        <h3 className="text-foreground text-lg font-semibold">{action}</h3>
        <div className="text-muted-foreground mt-3 flex flex-wrap gap-2 text-xs">
          <span className="bg-background rounded-full border px-2.5 py-1">
            Confidence: {confidence}
          </span>
          <span className="bg-background rounded-full border px-2.5 py-1">
            Horizon: {timeHorizon}
          </span>
        </div>
      </div>
      <div className="bg-background/80 rounded-lg border px-3 py-3">
        <div className="mb-1 flex items-center gap-2">
          <Target className="text-primary h-3.5 w-3.5" />
          <p className="text-muted-foreground text-[10px] font-semibold tracking-widest uppercase">
            Key Question
          </p>
        </div>
        <p className="text-sm leading-relaxed">{keyQuestion}</p>
      </div>
    </div>
  );
});
