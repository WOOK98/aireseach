import { useMutation } from "@tanstack/react-query";
import { router } from "expo-router";
import { Alert } from "react-native";

import { useTranslation } from "@workspace/i18n";
import { Icons } from "@workspace/ui-mobile/icons";
import { Text } from "@workspace/ui-mobile/text";

import { useSetupSteps } from "~/app/(setup)/steps/_layout";
import { pathsConfig } from "~/config/paths";
import { authClient } from "~/lib/auth";
import { auth } from "~/modules/auth/lib/api";
import { SettingsTile } from "~/modules/common/settings-tile";
import { Spinner } from "~/modules/common/spinner";

export const Logout = () => {
  const { t } = useTranslation(["common", "auth"]);
  const { reset } = useSetupSteps();
  const { refetch } = authClient.useListOrganizations();

  const signOut = useMutation({
    ...auth.mutations.signOut,
    onSuccess: async () => {
      reset();
      await refetch();
      router.replace(pathsConfig.index);
    },
  });

  return (
    <>
      <SettingsTile
        icon={Icons.LogOut}
        onPress={() => {
          Alert.alert(t("logout.cta"), t("logout.confirm"), [
            {
              text: t("cancel"),
              style: "cancel",
            },
            {
              text: t("logout.cta"),
              style: "destructive",
              onPress: () => signOut.mutate(undefined),
            },
          ]);
        }}
      >
        <Text>{t("logout.cta")}</Text>
      </SettingsTile>
      {signOut.isPending && <Spinner />}
    </>
  );
};
