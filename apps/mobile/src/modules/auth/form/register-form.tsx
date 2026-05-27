import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useMutation } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { Alert, View } from "react-native";

import { generateName, registerSchema } from "@workspace/auth";
import { useTranslation } from "@workspace/i18n";
import { Button } from "@workspace/ui-mobile/button";
import { Field, FieldError, FieldLabel } from "@workspace/ui-mobile/field";
import { Icons } from "@workspace/ui-mobile/icons";
import { Input } from "@workspace/ui-mobile/input";
import { Spin } from "@workspace/ui-mobile/spin";
import { Text } from "@workspace/ui-mobile/text";

import { pathsConfig } from "~/config/paths";
import { Link } from "~/modules/common/styled";

import { auth } from "../lib/api";

import type { Route } from "expo-router";

interface RegisterFormProps {
  readonly redirectTo?: Route;
  readonly email?: string;
}

export const RegisterForm = ({
  redirectTo = pathsConfig.index,
  email,
}: RegisterFormProps) => {
  const { t } = useTranslation(["common", "auth"]);

  const form = useForm({
    resolver: standardSchemaResolver(registerSchema),
    defaultValues: {
      email,
    },
  });

  const signUp = useMutation({
    ...auth.mutations.signUp.email,
    onSuccess: () => {
      Alert.alert(
        t("register.success.title"),
        t("register.success.description"),
        [
          {
            text: t("continue"),
            onPress: () => {
              router.navigate(pathsConfig.setup.auth.login);
              form.reset();
            },
          },
        ],
      );
    },
  });

  return (
    <View className="gap-6">
      <Controller
        control={form.control}
        name="email"
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
        control={form.control}
        name="password"
        render={({ field, fieldState }) => (
          <Field invalid={fieldState.invalid}>
            <FieldLabel>{t("password")}</FieldLabel>
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

      <Button
        className="w-full"
        size="lg"
        onPress={form.handleSubmit((data) =>
          signUp.mutateAsync({
            ...data,
            name: generateName(data.email),
            callbackURL: redirectTo,
          }),
        )}
        disabled={form.formState.isSubmitting}
      >
        {form.formState.isSubmitting ? (
          <Spin>
            <Icons.Loader2 className="text-primary-foreground size-5" />
          </Spin>
        ) : (
          <Text>{t("register.cta")}</Text>
        )}
      </Button>
    </View>
  );
};

export const RegisterCta = () => {
  const { t } = useTranslation("auth");
  const localParams = useLocalSearchParams();
  const searchParams = new URLSearchParams(
    localParams as Record<string, string>,
  );

  return (
    <View className="items-center justify-center pt-2">
      <View className="flex-row">
        <Text className="text-muted-foreground text-sm">
          {t("login.noAccount")}
        </Text>
        <Link
          href={`${pathsConfig.setup.auth.register}?${searchParams.toString()}`}
          className="text-muted-foreground active:text-primary pl-2 font-sans text-sm underline"
        >
          {t("register.cta")}
        </Link>
      </View>
    </View>
  );
};
