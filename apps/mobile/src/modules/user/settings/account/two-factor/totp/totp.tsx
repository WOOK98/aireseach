import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { View } from "react-native";
import QRCode from "react-qr-code";

import { otpSchema } from "@workspace/auth";
import { useTranslation } from "@workspace/i18n";
import { ThemeMode } from "@workspace/ui";
import {
  BottomSheet,
  BottomSheetContent,
  useBottomSheet,
  BottomSheetTitle,
  BottomSheetDescription,
  BottomSheetHeader,
  BottomSheetScrollView,
} from "@workspace/ui-mobile/bottom-sheet";
import { Button } from "@workspace/ui-mobile/button";
import { Field, FieldError } from "@workspace/ui-mobile/field";
import { Icons } from "@workspace/ui-mobile/icons";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@workspace/ui-mobile/input-otp";
import { Spin } from "@workspace/ui-mobile/spin";
import { Text } from "@workspace/ui-mobile/text";

import { useCopyToClipboard } from "~/modules/common/hooks/use-copy-to-clipboard";
import { useTheme } from "~/modules/common/hooks/use-theme";

import { BackupCodesSheet } from "../backup-codes/backup-codes";
import { RequirePassword } from "../require-password";
import { useTwoFactor } from "../use-two-factor";
import { useTotp } from "./use-totp";

import type { OtpPayload, PasswordPayload } from "@workspace/auth";
import type { BottomSheetContentRef } from "@workspace/ui-mobile/bottom-sheet";

interface TotpSheetProps {
  readonly ref?: React.RefObject<BottomSheetContentRef | null>;
}

export const TotpSheet = ({ ref: passedRef }: TotpSheetProps) => {
  const { resolvedTheme } = useTheme();
  const { t } = useTranslation(["common", "auth"]);
  const { ref: totpSheetRef } = useBottomSheet();
  const { ref: backupCodesRef } = useBottomSheet();
  const ref = passedRef ?? totpSheetRef;

  const { uri, verify } = useTotp();
  const form = useForm({
    resolver: standardSchemaResolver(otpSchema),
    defaultValues: {
      code: "",
    },
  });

  const onSubmit = async (data: OtpPayload) => {
    await verify.mutateAsync(data);
    ref.current?.dismiss();
    backupCodesRef.current?.present();
  };

  return (
    <>
      <BottomSheet>
        <BottomSheetContent ref={ref} name="totp">
          <BottomSheetScrollView>
            <BottomSheetHeader>
              <BottomSheetTitle>
                {t("account.twoFactor.totp.enable.title")}
              </BottomSheetTitle>
              <BottomSheetDescription>
                {t("account.twoFactor.totp.enable.description")}
              </BottomSheetDescription>
            </BottomSheetHeader>

            <View className="w-full flex-1 items-center gap-4">
              <Secret />

              <QRCode
                value={uri}
                size={180}
                bgColor="transparent"
                fgColor={resolvedTheme === ThemeMode.DARK ? "#fff" : "#000"}
              />

              <View className="w-full flex-1 items-center gap-6">
                <Controller
                  control={form.control}
                  name="code"
                  render={({ field, fieldState }) => (
                    <Field invalid={fieldState.invalid}>
                      <InputOTP
                        maxLength={6}
                        autoFocus
                        value={field.value}
                        onChange={field.onChange}
                        onComplete={() => form.handleSubmit(onSubmit)()}
                        render={({ slots }) => (
                          <InputOTPGroup>
                            {slots.map((slot, index) => (
                              <InputOTPSlot
                                key={index}
                                index={index}
                                max={6}
                                {...slot}
                              />
                            ))}
                          </InputOTPGroup>
                        )}
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />

                <View className="mt-auto w-full gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onPress={() => ref.current?.close()}
                  >
                    <Text>{t("close")}</Text>
                  </Button>
                  <Button
                    className="flex-1"
                    disabled={form.formState.isSubmitting}
                    onPress={form.handleSubmit(onSubmit)}
                  >
                    {form.formState.isSubmitting ? (
                      <Spin>
                        <Icons.Loader2
                          className="text-primary-foreground"
                          size={16}
                        />
                      </Spin>
                    ) : (
                      <Text>{t("continue")}</Text>
                    )}
                  </Button>
                </View>
              </View>
            </View>
          </BottomSheetScrollView>
        </BottomSheetContent>
      </BottomSheet>
      <BackupCodesSheet ref={backupCodesRef} />
    </>
  );
};

const Secret = () => {
  const { uri } = useTotp();
  const [, copy] = useCopyToClipboard();
  const [showCheck, setShowCheck] = useState(false);
  const secret = useMemo(() => {
    return uri ? new URL(uri).searchParams.get("secret") : null;
  }, [uri]);

  const handleCopy = async () => {
    const success = await copy(secret ?? "");
    if (!success) {
      return;
    }

    setShowCheck(true);
    setTimeout(() => {
      setShowCheck(false);
    }, 2000);
  };

  return (
    <View className="flex-row flex-wrap items-center gap-2 px-5">
      <Text>
        <Text className="text-muted-foreground text-center">{secret}</Text>

        <Text onPress={handleCopy} className="pl-2.5">
          {showCheck ? (
            <Icons.Check className="text-foreground" size={12} />
          ) : (
            <Icons.Copy className="text-foreground" size={12} />
          )}
        </Text>
      </Text>
    </View>
  );
};

export const TotpTile = () => {
  const { ref } = useBottomSheet();
  const { t } = useTranslation(["common", "auth"]);
  const { enabled } = useTwoFactor();

  const { setUri, getUri } = useTotp();

  const onEdit = async (data: PasswordPayload) => {
    const response = await getUri.mutateAsync(data);
    setUri(response.totpURI);
    ref.current?.present();
  };

  return (
    <>
      <View className="border-border flex-row items-center justify-between gap-4 rounded-md border p-4">
        <View className="flex-1">
          <Text className="font-sans-medium text-sm">
            {t("account.twoFactor.totp.title")}
          </Text>
          <Text className="text-muted-foreground text-sm">
            {t("account.twoFactor.totp.description")}
          </Text>
        </View>

        <RequirePassword onConfirm={onEdit}>
          <Button variant="outline" disabled={!enabled}>
            <Text>{enabled ? t("edit") : t("add")}</Text>
          </Button>
        </RequirePassword>
      </View>
      <TotpSheet ref={ref} />
    </>
  );
};
