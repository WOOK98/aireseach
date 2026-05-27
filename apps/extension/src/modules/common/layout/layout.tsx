import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";

import { ThemeMode, cn } from "@workspace/ui";

import "~/assets/styles/globals.css";
import { Providers } from "~/lib/providers/providers";
import { StorageKey, useStorage } from "~/lib/storage";
import { ErrorBoundary } from "~/modules/common/error-boundary";
import { Footer } from "~/modules/common/layout/footer";
import { Header } from "~/modules/common/layout/header";
import { Suspense } from "~/modules/common/suspense";
import { Toaster } from "~/modules/common/toast";

interface LayoutProps {
  readonly children: React.ReactNode;
  readonly loadingFallback?: React.ReactNode;
  readonly errorFallback?: React.ReactNode;
  readonly className?: string;
}

export const Layout = ({
  children,
  className,
  loadingFallback,
  errorFallback,
}: LayoutProps) => {
  const { data: theme } = useStorage(StorageKey.THEME);

  const isDark =
    theme.mode === ThemeMode.DARK ||
    (theme.mode === ThemeMode.SYSTEM &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  return (
    <Providers>
      <div
        className={cn({
          dark: isDark,
        })}
      >
        <div
          id="main"
          className="bg-background text-foreground flex min-h-screen w-full min-w-92 flex-col font-sans text-base"
          data-theme={theme.color}
        >
          <ErrorBoundary fallback={errorFallback}>
            <Suspense fallback={loadingFallback}>
              <Toaster />
              <div
                className={cn(
                  "mx-auto flex w-full max-w-7xl grow flex-col items-center justify-between gap-16 p-4",
                  className,
                )}
              >
                <Header />
                {children}
                <Footer />
              </div>
            </Suspense>
          </ErrorBoundary>
        </div>
      </div>
    </Providers>
  );
};

const REACT_ROOT = Symbol.for("@turbostarter/extension.reactRoot");

type RootContainer = HTMLElement & { [REACT_ROOT]?: Root };

export const render = (id: string, element: React.ReactElement) => {
  const container = document.getElementById(id) as RootContainer | null;
  if (!container) {
    return;
  }

  let root = container[REACT_ROOT];
  if (!root) {
    root = createRoot(container);
    container[REACT_ROOT] = root;
  }

  root.render(<StrictMode>{element}</StrictMode>);
};
