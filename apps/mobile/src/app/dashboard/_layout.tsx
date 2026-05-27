import { Redirect, Stack } from "expo-router";

import { pathsConfig } from "~/config/paths";
import { authClient } from "~/lib/auth";
import { Spinner } from "~/modules/common/spinner";

export default function DashboardLayout() {
  const session = authClient.useSession();

  if (session.isPending) {
    return <Spinner modal={false} />;
  }

  if (!session.data) {
    return <Redirect href={pathsConfig.index} />;
  }

  return (
    <Stack
      screenOptions={{
        animation: "fade",
        animationDuration: 200,
        headerShown: false,
      }}
    />
  );
}
