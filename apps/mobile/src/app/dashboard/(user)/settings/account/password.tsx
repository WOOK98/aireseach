import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useMutation, useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { Alert, View } from "react-native";

import { changePasswordSchema } from "@workspace/auth";
import { Trans, useTranslation } from "@workspace/i18n";
import { Button } from "@workspace/ui-mobile/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@workspace/ui-mobile/field";
import { Icons } from "@workspace/ui-mobile/icons";
import { Input } from "@workspace/ui-mobile/input";
import { Spin } from "@workspace/ui-mobile/spin";
import { Text } from "@workspace/ui-mobile/text";

import { pathsConfig } from "~/config/paths";
import { authClient } from "~/lib/auth";
import { auth } from "~/modules/auth/lib/api";
import { Link, ScrollView } from "~/modules/common/styled";

export default function Password() {
  const { t } = useTranslation(["common", "auth"]);

  const session = authClient.useSession();
  const { data: accounts, isLoading } = useQuery({
    ...auth.queries.accounts.getAll,
    enabled: !!session.data?.user.id,
  });

  const form = useForm({
    resolver: standardSchemaResolver(changePasswordSchema),
  });

  const changePassword = useMutation({
    ...auth.mutations.password.change,
    onSuccess: () => {
      Alert.alert(
        t("account.password.update.title"),
        t("account.password.update.success"),
        [
          {
            text: t("continue"),
            onPress: () => {
              router.back();
              form.reset();
            },
          },
        ],
      );
    },
  });

  const hasPassword = accounts
    ?.map((account) => account.providerId)
    .includes("credential");

  return (
    <ScrollView
      bounces={false}
      contentContainerClassName="bg-background flex-1 p-6"
    >
      <View className="flex-1 gap-6">
        <Text className="text-muted-foreground font-sans-medium text-base">
          {t("account.password.update.description")}
        </Text>

        {isLoading ? (
          <View className="bg-muted/50 h-20 animate-pulse" key="loading" />
        ) : (
          <View className="gap-4" key="password">
            {hasPassword ? (
              <>
                <Controller
                  control={form.control}
                  name="password"
                  render={({ field, fieldState }) => (
                    <Field invalid={fieldState.invalid}>
                      <FieldLabel>{t("currentPassword")}</FieldLabel>
                      <Input
                        {...field}
                        secureTextEntry
                        autoComplete="current-password"
                        onChangeText={field.onChange}
                        editable={!form.formState.isSubmitting}
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />

                <Controller
                  control={form.control}
                  name="newPassword"
                  render={({ field, fieldState }) => (
                    <Field invalid={fieldState.invalid}>
                      <FieldLabel>{t("newPassword")}</FieldLabel>
                      <Input
                        {...field}
                        secureTextEntry
                        autoComplete="new-password"
                        onChangeText={field.onChange}
                        editable={!form.formState.isSubmitting}
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                      <FieldDescription>
                        {t("account.password.update.info")}
                      </FieldDescription>
                    </Field>
                  )}
                />
              </>
            ) : (
              <View className="border-border items-center justify-center rounded-lg border border-dashed p-6">
                <Text className="text-muted-foreground text-center">
                  <Trans
                    i18nKey="account.password.update.noPassword"
                    ns="auth"
                    components={{
                      bold: (
                        <Link
                          href={pathsConfig.setup.auth.forgotPassword}
                          className="font-sans-medium underline hover:no-underline"
                        />
                      ),
                    }}
                  />
                </Text>
              </View>
            )}
          </View>
        )}

        {!isLoading && hasPassword && (
          <Button
            variant="default"
            size="lg"
            disabled={form.formState.isSubmitting}
            onPress={form.handleSubmit((data) =>
              changePassword.mutateAsync({
                ...data,
                currentPassword: data.password,
                revokeOtherSessions: true,
              }),
            )}
          >
            {form.formState.isSubmitting ? (
              <Spin>
                <Icons.Loader2 className="text-primary-foreground" />
              </Spin>
            ) : (
              <Text className="text-primary-foreground">{t("save")}</Text>
            )}
          </Button>
        )}
      </View>
    </ScrollView>
  );
}
