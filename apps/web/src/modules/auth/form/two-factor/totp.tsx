"use client";

import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { memo } from "react";
import { Controller, useForm } from "react-hook-form";

import { otpVerificationSchema, SecondFactor } from "@workspace/auth";
import { useTranslation } from "@workspace/i18n";
import { Button } from "@workspace/ui-web/button";
import { Checkbox } from "@workspace/ui-web/checkbox";
import { Field, FieldError, FieldLabel } from "@workspace/ui-web/field";
import { Icons } from "@workspace/ui-web/icons";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@workspace/ui-web/input-otp";

import { pathsConfig } from "~/config/paths";

import { auth } from "../../lib/api";

import type { CtaProps, FormProps } from ".";

const TotpForm = memo<FormProps>(
  ({ redirectTo = pathsConfig.dashboard.user.index }) => {
    const router = useRouter();
    const { t } = useTranslation(["common", "auth"]);

    const form = useForm({
      resolver: standardSchemaResolver(otpVerificationSchema),
      defaultValues: {
        code: "",
        trustDevice: false,
      },
    });

    const verifyTotp = useMutation({
      ...auth.mutations.twoFactor.totp.verify,
      onSuccess: () => {
        router.replace(redirectTo);
      },
    });

    return (
      <form
        id="two-factor-totp-form"
        onSubmit={form.handleSubmit((data) => verifyTotp.mutateAsync(data))}
        className="space-y-6"
      >
        <Controller
          name="code"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="two-factor-totp-code" className="sr-only">
                {t("code")}
              </FieldLabel>
              <InputOTP
                {...field}
                maxLength={6}
                autoFocus
                disabled={form.formState.isSubmitting}
                aria-invalid={fieldState.invalid}
                onComplete={form.handleSubmit((data) =>
                  verifyTotp.mutateAsync(data),
                )}
              >
                <InputOTPGroup id="two-factor-totp-code">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <InputOTPSlot key={index} index={index} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
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
                id="two-factor-totp-trust-device"
                name={field.name}
                checked={field.value}
                onCheckedChange={field.onChange}
                disabled={form.formState.isSubmitting}
                aria-invalid={fieldState.invalid}
              />
              <FieldLabel htmlFor="two-factor-totp-trust-device">
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

const TotpCta = memo<CtaProps>(({ onFactorChange }) => {
  const { t } = useTranslation(["auth"]);
  return (
    <div className="flex items-center justify-center pt-2">
      <button
        type="button"
        onClick={() => onFactorChange(SecondFactor.TOTP)}
        className="text-muted-foreground hover:text-primary cursor-pointer pl-2 text-sm font-medium underline underline-offset-4"
      >
        {t("login.twoFactor.totp.cta")}
      </button>
    </div>
  );
});

export { TotpForm, TotpCta };
