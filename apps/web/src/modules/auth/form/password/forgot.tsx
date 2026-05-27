"use client";

import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useMutation } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { Controller, useForm } from "react-hook-form";

import { forgotPasswordSchema } from "@workspace/auth";
import { useTranslation } from "@workspace/i18n";
import { Button } from "@workspace/ui-web/button";
import { Field, FieldError, FieldLabel } from "@workspace/ui-web/field";
import { Icons } from "@workspace/ui-web/icons";
import { Input } from "@workspace/ui-web/input";

import { pathsConfig } from "~/config/paths";
import { TurboLink } from "~/modules/common/turbo-link";
import { onPromise } from "~/utils";

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
      form.reset();
    },
  });

  return (
    <AnimatePresence mode="wait">
      {form.formState.isSubmitSuccessful ? (
        <motion.div
          className="mt-6 flex flex-col items-center justify-center gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          key="success"
        >
          <Icons.CheckCircle2
            className="text-success h-20 w-20"
            strokeWidth={1.2}
          />
          <h2 className="text-center text-2xl font-semibold tracking-tight">
            {t("account.password.forgot.success.title")}
          </h2>
          <p className="max-w-sm text-center text-balance">
            {t("account.password.forgot.success.description")}
          </p>
          <TurboLink
            href={pathsConfig.auth.login}
            className="text-muted-foreground hover:text-primary -mt-1 text-sm font-medium underline underline-offset-4"
          >
            {t("login.cta")}
          </TurboLink>
        </motion.div>
      ) : (
        <motion.form
          id="forgot-password-form"
          onSubmit={onPromise(
            form.handleSubmit((data) =>
              forgetPassword.mutateAsync({
                ...data,
                redirectTo: pathsConfig.auth.updatePassword,
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
                <FieldLabel htmlFor="forgot-password-email">
                  {t("email")}
                </FieldLabel>
                <Input
                  {...field}
                  id="forgot-password-email"
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

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? (
              <Icons.Loader2 className="animate-spin" />
            ) : (
              t("account.password.forgot.cta")
            )}
          </Button>

          <div className="flex items-center justify-center pt-2">
            <TurboLink
              href={pathsConfig.auth.login}
              className="text-muted-foreground hover:text-primary pl-2 text-sm font-medium underline underline-offset-4"
            >
              {t("account.password.forgot.back")}
            </TurboLink>
          </div>
        </motion.form>
      )}
    </AnimatePresence>
  );
};
