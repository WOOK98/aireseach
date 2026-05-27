import { useFocusEffect } from "@react-navigation/native";
import React from "react";

export function useRefetchOnFocus<T>(refetch: () => Promise<T>) {
  const firstTimeRef = React.useRef(true);

  useFocusEffect(
    React.useCallback(() => {
      if (firstTimeRef.current) {
        firstTimeRef.current = false;
        return;
      }

      void refetch();
    }, [refetch]),
  );
}
