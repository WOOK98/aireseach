/* oxlint-disable i18next/no-literal-string */

import { AlertCircle, RotateCcw } from "lucide-react";
import { motion } from "motion/react";
import { memo } from "react";

import { Button } from "@workspace/ui-web/button";

export function getFriendlyAnalysisError(rawMessage?: string | null) {
  if (!rawMessage) {
    return "AI analysis did not return a result. Please try again.";
  }

  if (
    /api key|deepseek|openai|llm|provider|invalid character|bytestring|not configured/i.test(
      rawMessage,
    )
  ) {
    return "Base financial data is loaded, but the AI narrative is temporarily unavailable.";
  }

  return rawMessage;
}

export const AnalysisNotice = memo(function AnalysisNotice({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <motion.div
      key="analysis-warning"
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-4 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="space-y-2">
        <div>
          <p className="text-sm font-medium">AI analysis unavailable</p>
          <p className="text-xs leading-relaxed opacity-80">
            <span className="notranslate" translate="no">
              {message}
            </span>
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 px-2 text-xs text-amber-950 hover:bg-amber-100 dark:text-amber-100 dark:hover:bg-amber-900/40"
          onClick={onRetry}
        >
          <RotateCcw className="h-3 w-3" /> Regenerate
        </Button>
      </div>
    </motion.div>
  );
});
