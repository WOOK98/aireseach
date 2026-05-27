import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useMutation } from "@tanstack/react-query";
import { router } from "expo-router";
import { memo } from "react";
import { Controller, useForm } from "react-hook-form";
import { View } from "react-native";

import { passwordLoginSchema } from "@workspace/auth";
import { useTranslation } from "@workspace/i18n";
import { Button } from "@workspace/ui-mobile/button";
import { Checkbox } from "@workspace/ui-mobile/checkbox";
import { Field, FieldLabel, FieldError } from "@workspace/ui-mobile/field";
import { Icons } from "@workspace/ui-mobile/icons";
import { Input } from "@workspace/ui-mobile/input";
import { Spin } from "@workspace/ui-mobile/spin";
import { Text } from "@workspace/ui-mobile/text";

import { pathsConfig } from "~/config/paths";
import { Link } from "~/modules/common/styled";

import { auth } from "../../lib/api";

import type { Route } from "expo-router";

interface PasswordLoginFormProps {
  readonly redirectTo?: Route;
  readonly email?: string;
  readonly onTwoFactorRedirect?: () => void;
}

export const PasswordLoginForm = memo<PasswordLoginFormProps>(
  ({ redirectTo = pathsConfig.index, email, onTwoFactorRedirect }) => {
    const { t } = useTranslation(["common", "auth"]);

    const form = useForm({
      resolver: standardSchemaResolver(passwordLoginSchema),
      defaultValues: {
        rememberMe: true,
        email,
      },
    });

    const signIn = useMutation({
      ...auth.mutations.signIn.email,
      onSuccess: (ctx) => {
        if ("twoFactorRedirect" in ctx) {
          return onTwoFactorRedirect?.();
        }

        router.navigate(redirectTo);
      },
    });

    return (
      <View className="gap-6">
        <Controller
          name="email"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field invalid={fieldState.invalid}>
              <FieldLabel>{t("common:email")}</FieldLabel>
              <Input
                {...field}
                onChangeText={field.onChange}
                autoCapitalize="none"
                autoComplete="email"
                inputMode="email"
                keyboardType="email-address"
                spellCheck={false}
                maxLength={254}
                editable={!form.formState.isSubmitting}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="password"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field invalid={fieldState.invalid}>
              <View className="flex-row items-center justify-between">
                <FieldLabel>{t("password")}</FieldLabel>
                <Link
                  href={pathsConfig.setup.auth.forgotPassword}
                  className="text-muted-foreground self-end font-sans text-sm underline underline-offset-4"
                >
                  {t("account.password.forgot.label")}
                </Link>
              </View>
              <Input
                {...field}
                secureTextEntry
                autoComplete="password"
                onChangeText={field.onChange}
                editable={!form.formState.isSubmitting}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="rememberMe"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field invalid={fieldState.invalid} orientation="horizontal">
              <Checkbox
                {...field}
                checked={!!field.value}
                onCheckedChange={field.onChange}
                disabled={form.formState.isSubmitting}
              />
              <FieldLabel onPress={() => field.onChange(!field.value)}>
                {t("rememberMe")}
              </FieldLabel>
            </Field>
          )}
        />

        <Button
          className="w-full"
          size="lg"
          onPress={form.handleSubmit((data) => signIn.mutateAsync(data))}
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? (
            <Spin>
              <Icons.Loader2 className="text-primary-foreground" />
            </Spin>
          ) : (
            <Text>{t("login.cta")}</Text>
          )}
        </Button>
      </View>
    );
  },
);

PasswordLoginForm.displayName = "PasswordLoginForm";
