"use client";

import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { changePasswordSchema } from "@workspace/auth";
import { Trans, useTranslation } from "@workspace/i18n";
import { Button } from "@workspace/ui-web/button";
import { Field, FieldError, FieldLabel } from "@workspace/ui-web/field";
import { Icons } from "@workspace/ui-web/icons";
import { PasswordInput } from "@workspace/ui-web/input";
import { Skeleton } from "@workspace/ui-web/skeleton";

import { pathsConfig } from "~/config/paths";
import { authClient } from "~/lib/auth/client";
import { auth } from "~/modules/auth/lib/api";
import {
  SettingsCard,
  SettingsCardContent,
  SettingsCardDescription,
  SettingsCardFooter,
  SettingsCardHeader,
  SettingsCardTitle,
} from "~/modules/common/layout/dashboard/settings-card";
import { TurboLink } from "~/modules/common/turbo-link";
import { onPromise } from "~/utils";

export const EditPassword = () => {
  const { t } = useTranslation(["common", "auth"]);
  const session = authClient.useSession();
  const { data: accounts, isLoading } = useQuery({
    ...auth.queries.accounts.getAll,
    enabled: !!session.data?.user.id,
  });

  const form = useForm({
    resolver: standardSchemaResolver(changePasswordSchema),
    defaultValues: {
      password: "",
      newPassword: "",
    },
  });

  const changePassword = useMutation({
    ...auth.mutations.password.change,
    onSuccess: () => {
      toast.success(t("account.password.update.success"));
      form.reset();
    },
  });

  const hasPassword = accounts
    ?.map((account) => account.providerId)
    .includes("credential");

  return (
    <SettingsCard>
      <SettingsCardHeader>
        <SettingsCardTitle>{t("password")}</SettingsCardTitle>
        <SettingsCardDescription>
          {t("account.password.update.description")}
        </SettingsCardDescription>
      </SettingsCardHeader>

      <SettingsCardContent>
        <form
          id="user-edit-password-form"
          onSubmit={onPromise(
            form.handleSubmit((data) =>
              changePassword.mutateAsync({
                ...data,
                currentPassword: data.password,
                revokeOtherSessions: true,
              }),
            ),
          )}
        >
          {isLoading && <Skeleton className="mt-0 h-20" />}

          {!isLoading &&
            (hasPassword ? (
              <div className="flex w-full flex-wrap gap-3 lg:gap-5">
                <Controller
                  name="password"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field
                      data-invalid={fieldState.invalid}
                      className="w-full max-w-xs gap-1"
                    >
                      <FieldLabel htmlFor="user-current-password">
                        {t("currentPassword")}
                      </FieldLabel>
                      <PasswordInput
                        {...field}
                        id="user-current-password"
                        autoComplete="current-password"
                        required
                        aria-invalid={fieldState.invalid}
                        disabled={form.formState.isSubmitting}
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />

                <Controller
                  name="newPassword"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field
                      data-invalid={fieldState.invalid}
                      className="w-full max-w-xs gap-1"
                    >
                      <FieldLabel htmlFor="user-new-password">
                        {t("newPassword")}
                      </FieldLabel>
                      <PasswordInput
                        {...field}
                        id="user-new-password"
                        autoComplete="new-password"
                        required
                        aria-invalid={fieldState.invalid}
                        disabled={form.formState.isSubmitting}
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
              </div>
            ) : (
              <div className="flex w-full items-center justify-center rounded-md border border-dashed p-6">
                <p className="text-center text-sm">
                  <Trans
                    i18nKey="account.password.update.noPassword"
                    ns="auth"
                    components={{
                      bold: (
                        <TurboLink
                          href={pathsConfig.auth.forgotPassword}
                          className="hover:text-primary font-medium underline underline-offset-4"
                        />
                      ),
                    }}
                  />
                </p>
              </div>
            ))}
        </form>
      </SettingsCardContent>

      <SettingsCardFooter>
        {t("account.password.update.info")}

        {!isLoading && hasPassword && (
          <Button
            form="user-edit-password-form"
            type="submit"
            size="sm"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? (
              <Icons.Loader2 className="size-4 animate-spin" />
            ) : (
              t("save")
            )}
          </Button>
        )}
      </SettingsCardFooter>
    </SettingsCard>
  );
};
