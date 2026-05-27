import { useEffect } from "react";

import { identify, initialize } from "@workspace/monitoring-extension";

import { authClient } from "~/lib/auth";

initialize();

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
