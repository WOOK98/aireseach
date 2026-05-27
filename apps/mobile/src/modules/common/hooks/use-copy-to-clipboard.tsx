import * as Clipboard from "expo-clipboard";
import { useCallback, useState } from "react";

import { logger } from "@workspace/shared/logger";

export const useCopyToClipboard = () => {
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const copy = useCallback(async (text: string): Promise<boolean> => {
    try {
      await Clipboard.setStringAsync(text);
      setCopiedText(text);
      return true;
    } catch (error) {
      logger.error("Failed to copy to clipboard:", error);
      return false;
    }
  }, []);

  return [copiedText, copy] as const;
};
