import { router } from "expo-router";
import { View } from "react-native";

import { Trans, useTranslation } from "@workspace/i18n";
import { Button } from "@workspace/ui-mobile/button";
import { Text } from "@workspace/ui-mobile/text";

import { pathsConfig } from "~/config/paths";
import { AuthLayout } from "~/modules/auth/layout/base";
import { AuthHeader } from "~/modules/auth/layout/header";

interface InvitationEmailMismatchProps {
  readonly invitationId: string;
  readonly email: string;
}

export const InvitationEmailMismatch = ({
  invitationId,
  email,
}: InvitationEmailMismatchProps) => {
  const { t } = useTranslation("organization");

  const searchParams = new URLSearchParams();
  searchParams.set("invitationId", invitationId);
  searchParams.set("email", email);
  searchParams.set(
    "redirectTo",
    `${pathsConfig.setup.auth.join}?${searchParams.toString()}`,
  );

  return (
    <AuthLayout>
      <AuthHeader
        title={t("invitations.emailMismatch.title")}
        description={
          <Trans
            i18nKey="invitations.emailMismatch.description"
            ns="organization"
            values={{ email }}
            components={{ bold: <Text className="font-sans-medium text-sm" /> }}
          />
        }
      />

      <View className="gap-2">
        <Button
          onPress={() =>
            router.replace(
              `${pathsConfig.setup.auth.login}?${searchParams.toString()}`,
            )
          }
          size="lg"
        >
          <Text>{t("invitations.emailMismatch.cta", { email })}</Text>
        </Button>
        <Button
          onPress={() => router.replace(pathsConfig.index)}
          variant="outline"
          size="lg"
        >
          <Text>{t("invitations.emailMismatch.skip")}</Text>
        </Button>
      </View>
    </AuthLayout>
  );
};
