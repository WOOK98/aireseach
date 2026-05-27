import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useMutation } from "@tanstack/react-query";
import * as Linking from "expo-linking";
import { Controller, useForm } from "react-hook-form";
import { Alert, View } from "react-native";

import { forgotPasswordSchema } from "@workspace/auth";
import { useTranslation } from "@workspace/i18n";
import { Button } from "@workspace/ui-mobile/button";
import { Field, FieldError, FieldLabel } from "@workspace/ui-mobile/field";
import { Icons } from "@workspace/ui-mobile/icons";
import { Input } from "@workspace/ui-mobile/input";
import { Spin } from "@workspace/ui-mobile/spin";
import { Text } from "@workspace/ui-mobile/text";

import { pathsConfig } from "~/config/paths";
import { Link } from "~/modules/common/styled";

import { auth } from "../../lib/api";

export const ForgotPasswordForm = () => {
  const { t } = useTranslation(["common", "auth"]);

  const form = useForm({
    resolver: standardSchemaResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const forgetPassword = useMutation({
    ...auth.mutations.password.forget,
    onSuccess: () => {
      Alert.alert(
        t("account.password.forgot.success.title"),
        t("account.password.forgot.success.description"),
      );
      form.reset();
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

      <Button
        className="w-full"
        size="lg"
        onPress={form.handleSubmit((data) =>
          forgetPassword.mutateAsync({
            ...data,
            redirectTo: Linking.createURL(
              pathsConfig.setup.auth.updatePassword,
            ),
          }),
        )}
        disabled={form.formState.isSubmitting}
      >
        {form.formState.isSubmitting ? (
          <Spin>
            <Icons.Loader2 className="text-primary-foreground size-5" />
          </Spin>
        ) : (
          <Text>{t("account.password.forgot.cta")}</Text>
        )}
      </Button>

      <View className="items-center justify-center pt-2">
        <Link
          replace
          href={pathsConfig.setup.auth.login}
          className="text-muted-foreground active:text-primary pl-2 font-sans text-sm underline"
        >
          {t("account.password.forgot.back")}
        </Link>
      </View>
    </View>
  );
};
