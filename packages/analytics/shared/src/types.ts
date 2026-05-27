import type { ReactNode } from "react";

export type AllowedPropertyValues = string | number | boolean;

type TrackFunction = (
  event: string,
  data?: Record<string, AllowedPropertyValues>,
) => void;

type IdentifyFunction = (
  userId: string,
  traits?: Record<string, AllowedPropertyValues>,
) => void;

export interface AnalyticsProviderClientStrategy {
  Provider: ({ children }: { children: ReactNode }) => ReactNode;
  track: TrackFunction;
  identify: IdentifyFunction;
  reset: () => void;
}

export interface AnalyticsProviderServerStrategy {
  track: TrackFunction;
}
