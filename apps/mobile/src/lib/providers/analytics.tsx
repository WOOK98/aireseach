import { useEffect } from "react";

import { identify, Provider, reset } from "@workspace/analytics-mobile";

import { authClient } from "~/lib/auth";

export const AnalyticsProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const session = authClient.useSession();

  useEffect(() => {
    if (session.isPending) {
      return;
    }

    if (session.data?.user) {
      const { id, email, name } = session.data.user;
      identify(id, { email, name });
    } else {
      reset();
    }
  }, [session]);

  return <Provider>{children}</Provider>;
};
