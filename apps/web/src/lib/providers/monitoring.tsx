"use client";

import { useEffect } from "react";

import { identify } from "@workspace/monitoring-web";

import { authClient } from "~/lib/auth/client";

export const MonitoringProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const session = authClient.useSession();

  useEffect(() => {
    if (session.isPending) {
      return;
    }

    identify(session.data?.user ?? null);
  }, [session]);

  return <>{children}</>;
};
