import { useMutation, useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { useMemo } from "react";
import { Alert } from "react-native";

import { isSubscriptionActive } from "@workspace/billing";
import { useTranslation } from "@workspace/i18n";
import { Icons } from "@workspace/ui-mobile/icons";
import { Text } from "@workspace/ui-mobile/text";

import { pathsConfig } from "~/config/paths";
import { authClient } from "~/lib/auth";
import { billing } from "~/modules/billing/lib/api";
import { SettingsTile } from "~/modules/common/settings-tile";
import { Spinner } from "~/modules/common/spinner";
import { organization } from "~/modules/organization/lib/api";
import { user } from "~/modules/user/lib/api";

export const DeleteAccount = () => {
  const { t } = useTranslation(["common", "auth"]);
  const session = authClient.useSession();
  const isAnonymous = session.data?.user.isAnonymous ?? false;
  const summary = useQuery(
    billing.queries.summary.get(session.data?.user.id ?? ""),
  );
  const organizations = useQuery(
    organization.queries.getBlockingAccountDeletion,
  );

  const activeSubscriptions = useMemo(
    () =>
      summary.data?.flatMap((customer) =>
        customer.subscriptions.filter(isSubscriptionActive),
      ) ?? [],
    [summary.data],
  );

  const blockingOrganizations = organizations.data ?? [];

  const canDelete =
    !summary.isLoading &&
    !organizations.isLoading &&
    activeSubscriptions.length === 0 &&
    blockingOrganizations.length === 0;

  const deleteUser = useMutation({
    ...user.mutations.delete.user,
    onSuccess: () => {
      Alert.alert(t("account.delete.confirmation.success"), undefined, [
        {
          onPress: () => {
            router.back();
          },
        },
      ]);
    },
  });
  const deleteAnonymousAccount = useMutation({
    ...user.mutations.delete.anonymous,
    onSuccess: async () => {
      await session.refetch();
      router.replace(pathsConfig.index);
      Alert.alert(t("account.delete.anonymous.confirmation.success"));
    },
  });

  const disclaimer = isAnonymous
    ? t("account.delete.anonymous.disclaimer")
    : t("account.delete.disclaimer");

  const cta = isAnonymous
    ? t("account.delete.cta")
    : t("account.delete.confirmation.cta");

  return (
    <>
      <SettingsTile
        destructive
        icon={Icons.Trash2}
        onPress={() => {
          if (!canDelete) {
            const message = [
              activeSubscriptions.length > 0
                ? t("account.delete.blocker.subscriptions.description", {
                    count: activeSubscriptions.length,
                  })
                : null,
              blockingOrganizations.length > 0
                ? t("account.delete.blocker.organizations.description", {
                    count: blockingOrganizations.length,
                  })
                : null,
            ]
              .filter(Boolean)
              .join("\n\n");

            Alert.alert(t("account.delete.title"), message);
            return;
          }

          Alert.alert(t("account.delete.title"), disclaimer, [
            {
              text: t("cancel"),
              style: "cancel",
            },
            {
              text: cta,
              style: "destructive",
              onPress: () => {
                if (isAnonymous) {
                  deleteAnonymousAccount.mutate(undefined);
                  return;
                }

                deleteUser.mutate({
                  callbackURL: pathsConfig.index,
                });
              },
            },
          ]);
        }}
      >
        <Text>{t("account.delete.title")}</Text>
      </SettingsTile>
      {(deleteUser.isPending || deleteAnonymousAccount.isPending) && (
        <Spinner />
      )}
    </>
  );
};
