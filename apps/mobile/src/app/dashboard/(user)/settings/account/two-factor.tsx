"use client";

import { useCallback, useMemo } from "react";
import { View } from "react-native";

import { useTranslation } from "@workspace/i18n";
import { useBottomSheet } from "@workspace/ui-mobile/bottom-sheet";
import { Switch } from "@workspace/ui-mobile/switch";
import { Text } from "@workspace/ui-mobile/text";

import { BackupCodesTile } from "~/modules/user/settings/account/two-factor/backup-codes/backup-codes";
import { useBackupCodes } from "~/modules/user/settings/account/two-factor/backup-codes/use-backup-codes";
import { RequirePassword } from "~/modules/user/settings/account/two-factor/require-password";
import {
  TotpTile,
  TotpSheet,
} from "~/modules/user/settings/account/two-factor/totp/totp";
import { useTotp } from "~/modules/user/settings/account/two-factor/totp/use-totp";
import { useTwoFactor } from "~/modules/user/settings/account/two-factor/use-two-factor";

import type { PasswordPayload } from "@workspace/auth";

export default function TwoFactor() {
  const { t } = useTranslation(["common", "auth"]);
  const { ref: totpSheetRef } = useBottomSheet();

  const { setUri } = useTotp();
  const { setCodes } = useBackupCodes();

  const { enabled, enable, disable } = useTwoFactor();

  const onEnable = useCallback(
    async (data: PasswordPayload) => {
      const response = await enable.mutateAsync(data);

      setUri(response.totpURI);
      setCodes(response.backupCodes);
      totpSheetRef.current?.present();
    },
    [enable, setUri, setCodes, totpSheetRef],
  );

  const onDisable = useCallback(
    async (data: PasswordPayload) => {
      await disable.mutateAsync(data);
    },
    [disable],
  );

  return (
    <View className="bg-background flex-1 p-6">
      <View className="flex-row items-start justify-between gap-8">
        <View className="flex-1">
          <Text className="text-muted-foreground font-sans-medium text-base">
            {t("account.twoFactor.description")}
          </Text>
        </View>

        <TwoFactorSwitch onSubmit={enabled ? onDisable : onEnable} />
      </View>

      <View className="mt-6 gap-1">
        <TotpTile />
        <BackupCodesTile />
      </View>
      <TotpSheet ref={totpSheetRef} />
    </View>
  );
}

const TwoFactorSwitch = ({
  onSubmit,
}: {
  onSubmit: (data: PasswordPayload) => Promise<void>;
}) => {
  const { t } = useTranslation(["common", "auth"]);

  const { enabled } = useTwoFactor();

  const key = useMemo(() => {
    return enabled ? "disable" : "enable";
  }, [enabled]);

  return (
    <RequirePassword
      onConfirm={onSubmit}
      title={t(`account.twoFactor.${key}.title`)}
      description={t(`account.twoFactor.${key}.description`)}
      cta={t(key)}
    >
      <Switch
        checked={enabled}
        onCheckedChange={() => {
          // Switch is controlled by the RequirePassword component
          // The actual toggling happens in the onConfirm callback
        }}
      />
    </RequirePassword>
  );
};
