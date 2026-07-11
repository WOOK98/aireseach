"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";

/** Force light mode in (app) route group. App tokens are light-only (v1). */
export function ForceLight() {
  const { setTheme } = useTheme();
  useEffect(() => {
    setTheme("light");
  }, [setTheme]);
  return null;
}
