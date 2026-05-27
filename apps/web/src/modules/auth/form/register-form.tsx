"use client";

import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useMutation } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { useSearchParams } from "next/navigation";
import { memo } from "react";
import { Controller, useForm } from "react-hook-form";

import { generateName, registerSchema } from "@workspace/auth";
import { useTranslation } from "@workspace/i18n";
import { Button } from "@workspace/ui-web/button";
import { Field, FieldError, FieldLabel } from "@workspace/ui-web/field";
import { Icons } from "@workspace/ui-web/icons";
import { Input, PasswordInput } from "@workspace/ui-web/input";

import { pathsConfig } from "~/config/paths";
import { TurboLink } from "~/modules/common/turbo-link";
import { onPromise } from "~/utils";

import { auth } from "../lib/api";

interface RegisterFormProps {
  readonly redirectTo?: string;
  readonly email?: string;
}

export const RegisterForm = memo<RegisterFormProps>(
  ({ redirectTo = pathsConfig.dashboard.user.index, email }) => {
    const { t } = useTranslation(["common", "auth"]);

    const form = useForm({
      resolver: standardSchemaResolver(registerSchema),
      defaultValues: {
        email: email ?? "",
        password: "",
      },
    });

    const signUp = useMutation(auth.mutations.signUp.email);

    return (
      <AnimatePresence mode="wait">
        {form.formState.isSubmitSuccessful ? (
          <motion.div
            className="my-6 flex flex-col items-center justify-center gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            key="success"
          >
            <Icons.CheckCircle2
              className="text-success h-20 w-20"
              strokeWidth={1.2}
            />
            <h2 className="text-center text-2xl font-semibold tracking-tight">
              {t("register.success.title")}
            </h2>
            <p className="text-center">{t("register.success.description")}</p>
          </motion.div>
        ) : (
          <motion.form
            id="register-form"
            onSubmit={onPromise(
              form.handleSubmit((data) =>
                signUp.mutateAsync({
                  ...data,
                  name: generateName(data.email),
                  callbackURL: redirectTo,
                }),
              ),
            )}
            className="space-y-6"
            exit={{ opacity: 0 }}
            key="idle"
          >
            <Controller
              name="email"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="register-email">{t("email")}</FieldLabel>
                  <Input
                    {...field}
                    id="register-email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    spellCheck={false}
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
              name="password"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="register-password">
                    {t("password")}
                  </FieldLabel>
                  <PasswordInput
                    {...field}
                    id="register-password"
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

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? (
                <Icons.Loader2 className="animate-spin" />
              ) : (
                t("register.cta")
              )}
            </Button>
          </motion.form>
        )}
      </AnimatePresence>
    );
  },
);

RegisterForm.displayName = "RegisterForm";

export const RegisterCta = () => {
  const { t } = useTranslation("auth");
  const searchParams = useSearchParams();

  return (
    <div className="flex items-center justify-center pt-2">
      <div className="text-muted-foreground text-sm">
        {t("login.noAccount")}
        <TurboLink
          href={
            searchParams.size > 0
              ? `${pathsConfig.auth.register}?${searchParams.toString()}`
              : pathsConfig.auth.register
          }
          className="hover:text-primary pl-2 font-medium underline underline-offset-4"
        >
          {t("register.cta")}!
        </TurboLink>
      </div>
    </div>
  );
};
