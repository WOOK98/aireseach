"use client";

import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { memo } from "react";
import { Controller, useForm } from "react-hook-form";

import { backupCodeVerificationSchema, SecondFactor } from "@workspace/auth";
import { useTranslation } from "@workspace/i18n";
import { Button } from "@workspace/ui-web/button";
import { Checkbox } from "@workspace/ui-web/checkbox";
import { Field, FieldError, FieldLabel } from "@workspace/ui-web/field";
import { Icons } from "@workspace/ui-web/icons";
import { Input } from "@workspace/ui-web/input";

import { pathsConfig } from "~/config/paths";

import { auth } from "../../lib/api";

import type { CtaProps, FormProps } from ".";

const BackupCodeForm = memo<FormProps>(
  ({ redirectTo = pathsConfig.dashboard.user.index }) => {
    const router = useRouter();
    const { t } = useTranslation(["common", "auth"]);
    const form = useForm({
      resolver: standardSchemaResolver(backupCodeVerificationSchema),
      defaultValues: {
        code: "",
        trustDevice: false,
      },
    });

    const verifyBackupCode = useMutation({
      ...auth.mutations.twoFactor.backupCodes.verify,
      onSuccess: () => {
        router.replace(redirectTo);
      },
    });

    return (
      <form
        id="two-factor-backup-code-form"
        onSubmit={form.handleSubmit((data) =>
          verifyBackupCode.mutateAsync(data),
        )}
        className="space-y-6"
      >
        <Controller
          name="code"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="two-factor-backup-code" className="sr-only">
                {t("login.twoFactor.backupCode.placeholder")}
              </FieldLabel>
              <Input
                {...field}
                id="two-factor-backup-code"
                type="text"
                autoFocus
                disabled={form.formState.isSubmitting}
                aria-invalid={fieldState.invalid}
                autoComplete="one-time-code"
                placeholder={t("login.twoFactor.backupCode.placeholder")}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="trustDevice"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field
              orientation="horizontal"
              data-invalid={fieldState.invalid}
              className="-mt-2 ml-px items-center"
            >
              <Checkbox
                id="two-factor-backup-code-trust-device"
                name={field.name}
                checked={field.value}
                onCheckedChange={field.onChange}
                disabled={form.formState.isSubmitting}
                aria-invalid={fieldState.invalid}
              />
              <FieldLabel htmlFor="two-factor-backup-code-trust-device">
                {t("login.twoFactor.trustDevice")}
              </FieldLabel>
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
            t("verify")
          )}
        </Button>
      </form>
    );
  },
);

const BackupCodeCta = memo<CtaProps>(({ onFactorChange }) => {
  const { t } = useTranslation(["auth"]);
  return (
    <div className="flex items-center justify-center pt-2">
      <button
        type="button"
        onClick={() => onFactorChange(SecondFactor.BACKUP_CODE)}
        className="text-muted-foreground hover:text-primary cursor-pointer pl-2 text-sm font-medium underline underline-offset-4"
      >
        {t("login.twoFactor.backupCode.cta")}
      </button>
    </div>
  );
});

export { BackupCodeForm, BackupCodeCta };
