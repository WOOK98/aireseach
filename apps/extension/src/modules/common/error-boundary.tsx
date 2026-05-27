import { Component } from "react";

import { useTranslation } from "@workspace/i18n";
import { logger } from "@workspace/shared/logger";

import type { ReactNode } from "react";

const Error = () => {
  const { t } = useTranslation("common");

  return (
    <div className="my-auto flex w-full min-w-64 flex-col items-center justify-center gap-8 px-10 py-16">
      <div className="flex max-w-md flex-col items-center justify-center gap-4">
        <span className="text-center text-2xl font-bold md:text-3xl lg:text-4xl">
          {t("error.general")}
        </span>

        <p className="text-muted-foreground text-center text-sm leading-snug sm:text-base">
          {t("error.apologies")}
        </p>
      </div>
    </div>
  );
};

class ReactErrorBoundary extends Component<
  {
    children: ReactNode;
    fallback: ReactNode;
  },
  {
    hasError: boolean;
  }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, errorInfo: unknown) {
    logger.error("Error boundary caught an error: ", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }

    return this.props.children;
  }
}

export const ErrorBoundary = ({
  children,
  fallback = <Error />,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) => {
  return (
    <ReactErrorBoundary fallback={fallback}>{children}</ReactErrorBoundary>
  );
};
