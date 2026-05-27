import { focusManager } from "@tanstack/react-query";
import { useEffect } from "react";
import { AppState, Platform } from "react-native";

import type { AppStateStatus } from "react-native";

export function useRefetchOnAppFocus() {
  useEffect(() => {
    const onAppStateChange = (status: AppStateStatus) => {
      if (Platform.OS !== "web") {
        focusManager.setFocused(status === "active");
      }
    };

    const subscription = AppState.addEventListener("change", onAppStateChange);

    return () => subscription.remove();
  }, []);
}
