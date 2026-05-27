import { useMutation } from "@tanstack/react-query";
import * as Linking from "expo-linking";
import { useMemo } from "react";
import { Alert } from "react-native";

import { toMemberRole } from "@workspace/auth";
import { BillingReference } from "@workspace/billing";
import { useTranslation } from "@workspace/i18n";
import { Button, buttonTextVariants } from "@workspace/ui-mobile/button";
import { Icons } from "@workspace/ui-mobile/icons";
import { Spin } from "@workspace/ui-mobile/spin";

import { appConfig } from "~/config/app";
import { pathsConfig } from "~/config/paths";
import { authClient } from "~/lib/auth";
import { billing } from "~/modules/billing/lib/api";

export const WebPortalLink = ({
  children,
  redirectUrl,
  referenceId,
  referenceType,
  ...props
}: React.ComponentProps<typeof Button> & {
  redirectUrl?: string;
  referenceId: string;
  referenceType: BillingReference;
}) => {
  const { t } = useTranslation("billing");
  const activeMember = authClient.useActiveMember();
  const getPortal = useMutation({
    ...billing.mutations.portal,
    onSuccess: (data) => {
      if (!data.url) {
        return Alert.alert(t("error.portal"));
      }
      return Linking.openURL(data.url);
    },
  });
  const canOpenPortal = useMemo(
    () =>
      referenceType === BillingReference.USER ||
      authClient.organization.checkRolePermission({
        permissions: {
          billing: ["update", "delete"],
        },
        role: toMemberRole(activeMember.data?.role),
      }),
    [activeMember.data?.role, referenceType],
  );
  const url =
    redirectUrl ??
    (referenceType === BillingReference.USER
      ? pathsConfig.dashboard.user.settings.billing
      : pathsConfig.dashboard.organization.settings.organization.billing);

  return (
    <Button
      {...props}
      onPress={() =>
        getPortal.mutate({
          query: {
            redirectUrl: new URL(url, appConfig.url).toString(),
            referenceId,
          },
        })
      }
      disabled={getPortal.isPending || !canOpenPortal || props.disabled}
    >
      {getPortal.isPending ? (
        <Spin>
          <Icons.Loader2
            size={20}
            className={buttonTextVariants({ variant: props.variant })}
          />
        </Spin>
      ) : (
        children
      )}
    </Button>
  );
};
