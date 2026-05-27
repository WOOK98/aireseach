"use client";

import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useMutation } from "@tanstack/react-query";
import { router } from "expo-router";
import { memo } from "react";
import { Controller, useForm } from "react-hook-form";
import { View } from "react-native";

import { updatePasswordSchema } from "@workspace/auth";
import { useTranslation } from "@workspace/i18n";
import { Button } from "@workspace/ui-mobile/button";
import { Field, FieldError, FieldLabel } from "@workspace/ui-mobile/field";
import { Icons } from "@workspace/ui-mobile/icons";
import { Input } from "@workspace/ui-mobile/input";
import { Spin } from "@workspace/ui-mobile/spin";
import { Text } from "@workspace/ui-mobile/text";

import { pathsConfig } from "~/config/paths";

import { auth } from "../../lib/api";

interface UpdatePasswordFormProps {
  readonly token?: string;
}

export const UpdatePasswordForm = memo<UpdatePasswordFormProps>(({ token }) => {
  const { t } = useTranslation(["common", "auth"]);

  const form = useForm({
    resolver: standardSchemaResolver(updatePasswordSchema),
    defaultValues: {
      password: "",
    },
  });

  const resetPassword = useMutation({
    ...auth.mutations.password.reset,
    onSuccess: () => {
      router.setParams({
        token: undefined,
      });
      router.replace(pathsConfig.setup.auth.login);
    },
  });

  return (
    <View className="gap-6">
      <Controller
        name="password"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field invalid={fieldState.invalid}>
            <FieldLabel>{t("password")}</FieldLabel>
            <Input
              {...field}
              secureTextEntry
              autoComplete="new-password"
              onChangeText={field.onChange}
              editable={!form.formState.isSubmitting}
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <Button
        className="w-full"
        size="lg"
        onPress={form.handleSubmit((data) =>
          resetPassword.mutateAsync({
            newPassword: data.password,
            token,
          }),
        )}
        disabled={form.formState.isSubmitting}
      >
        {form.formState.isSubmitting ? (
          <Spin>
            <Icons.Loader2 className="text-primary-foreground" />
          </Spin>
        ) : (
          <Text>{t("account.password.update.cta")}</Text>
        )}
      </Button>
    </View>
  );
});

UpdatePasswordForm.displayName = "UpdatePasswordForm";
