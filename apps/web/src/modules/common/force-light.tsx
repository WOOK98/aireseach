"use client";

import { ThemeProvider } from "next-themes";

/**
 * Force light mode for (app) route group WITHOUT persisting to user storage.
 * Uses next-themes forcedTheme — overrides rendering but preserves user preference.
 */
export function ForceLight({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider forcedTheme="light" attribute="class">
      {children}
    </ThemeProvider>
  );
}
