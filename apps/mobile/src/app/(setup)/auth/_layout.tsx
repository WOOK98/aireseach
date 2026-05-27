import { router, Stack } from "expo-router";

import { pathsConfig } from "~/config/paths";
import { BaseHeader } from "~/modules/common/layout/header";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        header: () => (
          <BaseHeader
            onBack={() =>
              router.canGoBack()
                ? router.back()
                : router.replace(pathsConfig.index)
            }
          />
        ),
        animation: "fade",
        animationDuration: 200,
      }}
    />
  );
}
