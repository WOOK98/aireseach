import type { MonitoringProviderStrategy } from "@workspace/monitoring";

export interface MonitoringProviderClientStrategy extends MonitoringProviderStrategy {
  onRouterTransitionStart: (
    href: string,
    navigationType: string,
  ) => void | Promise<void>;
}

export interface MonitoringProviderServerStrategy extends Omit<
  MonitoringProviderStrategy,
  "identify"
> {
  onRequestError: (
    error: unknown,
    errorRequest: Readonly<{
      path: string;
      method: string;
      headers: NodeJS.Dict<string | string[]>;
    }>,
    errorContext: Readonly<{
      routerKind: string;
      routePath: string;
      routeType: string;
    }>,
  ) => void | Promise<void>;
}
