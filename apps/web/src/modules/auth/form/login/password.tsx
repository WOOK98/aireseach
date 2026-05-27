"use client";

import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useMutation } from "@tanstack/react-query";
import { memo } from "react";
import { Controller, useForm } from "react-hook-form";

import { passwordLoginSchema } from "@workspace/auth";
import { useTranslation } from "@workspace/i18n";
import { Button } from "@workspace/ui-web/button";
import { Checkbox } from "@workspace/ui-web/checkbox";
import { Field, FieldError, FieldLabel } from "@workspace/ui-web/field";
import { Icons } from "@workspace/ui-web/icons";
import { Input, PasswordInput } from "@workspace/ui-web/input";

import { pathsConfig } from "~/config/paths";
import { TurboLink } from "~/modules/common/turbo-link";
import { onPromise } from "~/utils";

import { auth } from "../../lib/api";

interface PasswordLoginFormProps {
  readonly redirectTo?: string;
  readonly email?: string;
  readonly onTwoFactorRedirect?: () => void;
}

export const PasswordLoginForm = memo<PasswordLoginFormProps>(
  ({
    redirectTo = pathsConfig.dashboard.user.index,
    email,
    onTwoFactorRedirect,
  }) => {
    const { t } = useTranslation(["common", "auth"]);

    const form = useForm({
      resolver: standardSchemaResolver(passwordLoginSchema),
      defaultValues: {
        rememberMe: true,
        email: email ?? "",
        password: "",
      },
    });

    const signIn = useMutation({
      ...auth.mutations.signIn.email,
      onSuccess: (ctx) => {
        if ("twoFactorRedirect" in ctx) {
          return onTwoFactorRedirect?.();
        }
      },
    });

    return (
      <form
        id="password-login-form"
        onSubmit={onPromise(
          form.handleSubmit((data) =>
            signIn.mutateAsync({
              ...data,
              callbackURL: redirectTo,
            }),
          ),
        )}
        className="flex flex-col gap-6"
      >
        <Controller
          name="email"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="password-login-email">
                {t("common:email")}
              </FieldLabel>
              <Input
                {...field}
                id="password-login-email"
                type="email"
                aria-invalid={fieldState.invalid}
                autoCapitalize="none"
                autoComplete="email webauthn"
                inputMode="email"
                spellCheck={false}
                maxLength={254}
                required
                disabled={form.formState.isSubmitting}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <div className="relative">
          <Controller
            name="password"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel
                  htmlFor="password-login-password"
                  className="flex w-full items-center justify-between"
                >
                  {t("password")}
                </FieldLabel>
                <PasswordInput
                  {...field}
                  id="password-login-password"
                  aria-invalid={fieldState.invalid}
                  autoComplete="current-password webauthn"
                  required
                  disabled={form.formState.isSubmitting}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <TurboLink
            href={pathsConfig.auth.forgotPassword}
            className="text-muted-foreground hover:text-primary absolute top-0 right-0 text-sm underline underline-offset-4"
          >
            {t("account.password.forgot.label")}
          </TurboLink>
        </div>

        <Controller
          name="rememberMe"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field
              orientation="horizontal"
              data-invalid={fieldState.invalid}
              className="-mt-2 ml-px items-center"
            >
              <Checkbox
                id="password-login-remember-me"
                name={field.name}
                checked={field.value}
                onCheckedChange={field.onChange}
                disabled={form.formState.isSubmitting}
                aria-invalid={fieldState.invalid}
              />
              <FieldLabel htmlFor="password-login-remember-me">
                {t("rememberMe")}
              </FieldLabel>
            </Field>
          )}
        />

        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? (
            <Icons.Loader2 className="animate-spin" />
          ) : (
            t("login.cta")
          )}
        </Button>
      </form>
    );
  },
);

PasswordLoginForm.displayName = "PasswordLoginForm";
