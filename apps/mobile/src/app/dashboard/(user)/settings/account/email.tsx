import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useMutation } from "@tanstack/react-query";
import * as Linking from "expo-linking";
import { useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { Controller, useForm } from "react-hook-form";
import { Alert, View } from "react-native";

import { emailSchema } from "@workspace/auth";
import { useTranslation } from "@workspace/i18n";
import { Badge } from "@workspace/ui-mobile/badge";
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
import { ScrollView } from "~/modules/common/styled";

const EditEmail = () => {
  const { t } = useTranslation(["common", "auth"]);
  const { data, refetch } = authClient.useSession();

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  const form = useForm({
    resolver: standardSchemaResolver(emailSchema),
    defaultValues: {
      email: data?.user.email ?? "",
    },
  });

  const sendVerification = useMutation({
    ...auth.mutations.email.sendVerification,
    onSuccess: () => {
      Alert.alert(t("message"), t("account.email.confirm.email.sent"));
    },
  });

  const changeEmail = useMutation({
    ...auth.mutations.email.change,
    onSuccess: () => {
      Alert.alert(t("message"), t("account.email.change.success"));
    },
  });

  return (
    <ScrollView
      bounces={false}
      contentContainerClassName="bg-background flex-1 p-6"
    >
      <View className="flex-1 gap-6">
        <View className="gap-2">
          <View className="flex-row items-center gap-3">
            <Badge
              variant={data?.user.emailVerified ? "success" : "destructive"}
            >
              <Text
                className={
                  data?.user.emailVerified ? "text-success" : "text-destructive"
                }
              >
                {data?.user.emailVerified ? t("verified") : t("unverified")}
              </Text>
            </Badge>
            {!data?.user.emailVerified && (
              <Button
                variant="outline"
                size="sm"
                onPress={() =>
                  sendVerification.mutateAsync({
                    email: data?.user.email ?? "",
                    callbackURL:
                      pathsConfig.dashboard.user.settings.account.email,
                    fetchOptions: {
                      headers: {
                        "x-url": Linking.createURL(
                          pathsConfig.dashboard.user.settings.account.email,
                        ),
                      },
                    },
                  })
                }
                disabled={sendVerification.isPending}
              >
                <Text>
                  {sendVerification.isPending
                    ? t("account.email.confirm.loading")
                    : t("account.email.confirm.cta")}
                </Text>
              </Button>
            )}
          </View>
          <Text className="text-muted-foreground font-sans-medium text-base">
            {t("account.email.change.description")}
          </Text>
        </View>

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
              <FieldDescription>
                {t("account.email.change.info")}
              </FieldDescription>
            </Field>
          )}
        />

        <Button
          className="w-full"
          size="lg"
          onPress={form.handleSubmit((data) =>
            changeEmail.mutateAsync({
              newEmail: data.email,
              callbackURL: pathsConfig.dashboard.user.settings.account.email,
              fetchOptions: {
                headers: {
                  "x-url": Linking.createURL(
                    pathsConfig.dashboard.user.settings.account.email,
                  ),
                },
              },
            }),
          )}
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? (
            <Spin>
              <Icons.Loader2 className="text-primary-foreground" />
            </Spin>
          ) : (
            <Text>{t("save")}</Text>
          )}
        </Button>
      </View>
    </ScrollView>
  );
};

export default EditEmail;
