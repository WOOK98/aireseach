"use client";

import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useMutation } from "@tanstack/react-query";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { memo } from "react";
import { Controller, useForm } from "react-hook-form";

import { updatePasswordSchema } from "@workspace/auth";
import { useTranslation } from "@workspace/i18n";
import { Button } from "@workspace/ui-web/button";
import { Field, FieldError, FieldLabel } from "@workspace/ui-web/field";
import { Icons } from "@workspace/ui-web/icons";
import { PasswordInput } from "@workspace/ui-web/input";

import { pathsConfig } from "~/config/paths";
import { onPromise } from "~/utils";

import { auth } from "../../lib/api";

interface UpdatePasswordFormProps {
  readonly token?: string;
}

export const UpdatePasswordForm = memo<UpdatePasswordFormProps>(({ token }) => {
  const { t } = useTranslation("auth");
  const router = useRouter();
  const form = useForm({
    resolver: standardSchemaResolver(updatePasswordSchema),
    defaultValues: {
      password: "",
    },
  });

  const resetPassword = useMutation({
    ...auth.mutations.password.reset,
    onSuccess: () => {
      router.replace(pathsConfig.auth.login);
    },
  });

  return (
    <motion.form
      id="update-password-form"
      onSubmit={onPromise(
        form.handleSubmit((data) =>
          resetPassword.mutateAsync({
            newPassword: data.password,
            token,
          }),
        ),
      )}
      className="space-y-6"
      exit={{ opacity: 0 }}
    >
      <Controller
        name="password"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor="update-password-password">
              {t("password")}
            </FieldLabel>
            <PasswordInput
              {...field}
              id="update-password-password"
              autoComplete="new-password"
              required
              aria-invalid={fieldState.invalid}
              disabled={form.formState.isSubmitting}
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
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
          t("account.password.update.cta")
        )}
      </Button>
    </motion.form>
  );
});

UpdatePasswordForm.displayName = "UpdatePasswordForm";
