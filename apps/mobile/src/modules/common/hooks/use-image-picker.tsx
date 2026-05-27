import * as ExpoImagePicker from "expo-image-picker";
import { useCallback } from "react";

import { logger } from "@workspace/shared/logger";

export const useImagePicker = () => {
  const pick = useCallback(async () => {
    try {
      const result = await ExpoImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.6,
      });

      if (result.canceled) {
        return;
      }

      const pendingResult = await ExpoImagePicker.getPendingResultAsync();

      const image =
        result.assets[0] ??
        (pendingResult && "assets" in pendingResult
          ? pendingResult.assets?.[0]
          : null);

      return image;
    } catch (e) {
      logger.error("Error on image pick: ", e);
    }
  }, []);

  return {
    pick,
  };
};
