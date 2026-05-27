"use client";

import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useMutation } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { memo } from "react";
import { Controller, useForm } from "react-hook-form";

import { generateName, magicLinkLoginSchema } from "@workspace/auth";
import { useTranslation } from "@workspace/i18n";
import { Button } from "@workspace/ui-web/button";
import { Field, FieldLabel, FieldError } from "@workspace/ui-web/field";
import { Icons } from "@workspace/ui-web/icons";
import { Input } from "@workspace/ui-web/input";

import { pathsConfig } from "~/config/paths";
import { onPromise } from "~/utils";

import { auth } from "../../lib/api";

interface MagicLinkLoginFormProps {
  readonly redirectTo?: string;
  readonly email?: string;
}

export const MagicLinkLoginForm = memo<MagicLinkLoginFormProps>(
  ({ redirectTo = pathsConfig.dashboard.user.index, email }) => {
    const { t } = useTranslation(["common", "auth"]);

    const form = useForm({
      resolver: standardSchemaResolver(magicLinkLoginSchema),
      defaultValues: {
        email: email ?? "",
      },
    });

    const signIn = useMutation(auth.mutations.signIn.magicLink);

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
              {t("login.magicLink.success.title")}
            </h2>
            <p className="max-w-sm text-center text-balance">
              {t("login.magicLink.success.description")}
            </p>
          </motion.div>
        ) : (
          <form
            id="magic-link-login-form"
            onSubmit={onPromise(
              form.handleSubmit((data) =>
                signIn.mutateAsync({
                  email: data.email,
                  name: generateName(data.email),
                  callbackURL: redirectTo,
                  errorCallbackURL: pathsConfig.auth.error,
                }),
              ),
            )}
            className="space-y-6"
          >
            <Controller
              name="email"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="magic-link-login-email">
                    {t("email")}
                  </FieldLabel>
                  <Input
                    {...field}
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    spellCheck={false}
                    required
                    id="magic-link-login-email"
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
                t("login.magicLink.cta")
              )}
            </Button>
          </form>
        )}
      </AnimatePresence>
    );
  },
);

MagicLinkLoginForm.displayName = "MagicLinkLoginForm";
