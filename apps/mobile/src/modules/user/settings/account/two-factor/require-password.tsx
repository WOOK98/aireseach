import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { memo, useCallback } from "react";
import { Controller, useForm } from "react-hook-form";
import { View } from "react-native";

import { passwordSchema } from "@workspace/auth";
import { useTranslation } from "@workspace/i18n";
import {
  BottomSheet,
  BottomSheetCloseTrigger,
  BottomSheetContent,
  BottomSheetDescription,
  BottomSheetHeader,
  BottomSheetOpenTrigger,
  BottomSheetScrollView,
  BottomSheetTitle,
  useBottomSheet,
} from "@workspace/ui-mobile/bottom-sheet";
import { Button } from "@workspace/ui-mobile/button";
import { Field, FieldError, FieldLabel } from "@workspace/ui-mobile/field";
import { Icons } from "@workspace/ui-mobile/icons";
import { Input } from "@workspace/ui-mobile/input";
import { Spin } from "@workspace/ui-mobile/spin";
import { Text } from "@workspace/ui-mobile/text";

import type { PasswordPayload } from "@workspace/auth";
import type { BottomSheetContentRef } from "@workspace/ui-mobile/bottom-sheet";

interface RequirePasswordProps {
  readonly title?: string;
  readonly description?: string;
  readonly cta?: string;
  readonly onConfirm: (data: PasswordPayload) => Promise<void>;
  readonly children: React.ReactNode;
  readonly ref?: React.RefObject<BottomSheetContentRef>;
}

export const RequirePassword = memo<RequirePasswordProps>(
  ({ title, description, onConfirm, cta, children, ref: passedRef }) => {
    const { t } = useTranslation(["common", "auth"]);
    const { ref: bottomSheetRef } = useBottomSheet();

    const ref = passedRef ?? bottomSheetRef;

    const form = useForm({
      resolver: standardSchemaResolver(passwordSchema),
      defaultValues: {
        password: "",
      },
    });

    const handleSubmit = useCallback(
      async (data: PasswordPayload) => {
        await onConfirm(data);
        form.reset();
        ref.current?.close();
      },
      [onConfirm, form, ref],
    );

    return (
      <BottomSheet>
        <BottomSheetOpenTrigger asChild>{children}</BottomSheetOpenTrigger>
        <BottomSheetContent ref={ref} name="require-password">
          <BottomSheetScrollView>
            <BottomSheetHeader>
              <BottomSheetTitle>
                {title ?? t("account.password.require.title")}
              </BottomSheetTitle>
              <BottomSheetDescription>
                {description ?? t("account.password.require.description")}
              </BottomSheetDescription>
            </BottomSheetHeader>

            <View className="flex-1 gap-6">
              <Controller
                control={form.control}
                name="password"
                render={({ field, fieldState }) => (
                  <Field invalid={fieldState.invalid}>
                    <FieldLabel>{t("password")}</FieldLabel>
                    <Input
                      {...field}
                      autoFocus
                      secureTextEntry
                      autoComplete="password"
                      onChangeText={field.onChange}
                      editable={!form.formState.isSubmitting}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <View className="mt-auto gap-2">
                <BottomSheetCloseTrigger asChild>
                  <Button variant="outline" className="flex-1">
                    <Text>{t("cancel")}</Text>
                  </Button>
                </BottomSheetCloseTrigger>
                <Button
                  className="flex-1"
                  disabled={form.formState.isSubmitting}
                  onPress={form.handleSubmit(handleSubmit)}
                >
                  {form.formState.isSubmitting ? (
                    <Spin>
                      <Icons.Loader2
                        className="text-primary-foreground"
                        size={16}
                      />
                    </Spin>
                  ) : (
                    <Text>{cta ?? t("continue")}</Text>
                  )}
                </Button>
              </View>
            </View>
          </BottomSheetScrollView>
        </BottomSheetContent>
      </BottomSheet>
    );
  },
);

RequirePassword.displayName = "RequirePassword";
