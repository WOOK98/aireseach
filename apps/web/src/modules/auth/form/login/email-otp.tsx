"use client";

import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useMutation } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { memo, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { emailOtpLoginSchema, magicLinkLoginSchema } from "@workspace/auth";
import { useTranslation } from "@workspace/i18n";
import { Button } from "@workspace/ui-web/button";
import { Field, FieldLabel, FieldError } from "@workspace/ui-web/field";
import { Icons } from "@workspace/ui-web/icons";
import { Input } from "@workspace/ui-web/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@workspace/ui-web/input-otp";

import { pathsConfig } from "~/config/paths";
import { onPromise } from "~/utils";

import { auth } from "../../lib/api";

interface EmailOtpLoginFormProps {
  readonly redirectTo?: string;
  readonly email?: string;
}

const STEP = {
  REQUEST: "request",
  VERIFY: "verify",
} as const;

type Step = (typeof STEP)[keyof typeof STEP];

export const EmailOtpLoginForm = memo<EmailOtpLoginFormProps>(
  ({ redirectTo = pathsConfig.dashboard.user.index, email: initialEmail }) => {
    const { t } = useTranslation(["common", "auth"]);
    const router = useRouter();
    const [step, setStep] = useState<Step>(STEP.REQUEST);
    const [sentEmail, setSentEmail] = useState("");

    const requestForm = useForm({
      resolver: standardSchemaResolver(magicLinkLoginSchema),
      defaultValues: { email: initialEmail ?? "" },
    });

    const verifyForm = useForm({
      resolver: standardSchemaResolver(emailOtpLoginSchema),
      defaultValues: { email: sentEmail, otp: "" },
    });

    const sendOtp = useMutation(auth.mutations.emailOtp.sendVerificationOtp);
    const signIn = useMutation(auth.mutations.signIn.emailOtp);

    const handleRequestSubmit = requestForm.handleSubmit((data) => {
      sendOtp.mutate(
        { email: data.email, type: "sign-in" },
        {
          onSuccess: () => {
            setSentEmail(data.email);
            setStep(STEP.VERIFY);
            verifyForm.setValue("email", data.email);
          },
        },
      );
    });

    const handleVerifySubmit = verifyForm.handleSubmit((data) => {
      signIn.mutate(
        {
          email: data.email,
          otp: data.otp,
        },
        {
          onSuccess: () => {
            router.replace(redirectTo);
          },
        },
      );
    });

    const isRequestSubmitting =
      requestForm.formState.isSubmitting || sendOtp.isPending;
    const isVerifySubmitting =
      verifyForm.formState.isSubmitting || signIn.isPending;

    return (
      <AnimatePresence mode="wait" initial={false}>
        {step === STEP.REQUEST ? (
          <motion.form
            key="request"
            id="email-otp-login-form"
            onSubmit={onPromise(handleRequestSubmit)}
            className="space-y-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Controller
              name="email"
              control={requestForm.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="email-otp-login-email">
                    {t("email")}
                  </FieldLabel>
                  <Input
                    {...field}
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    spellCheck={false}
                    required
                    id="email-otp-login-email"
                    aria-invalid={fieldState.invalid}
                    disabled={isRequestSubmitting}
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
              disabled={isRequestSubmitting}
            >
              {isRequestSubmitting ? (
                <Icons.Loader2 className="animate-spin" />
              ) : (
                t("login.emailOtp.cta")
              )}
            </Button>
          </motion.form>
        ) : (
          <motion.form
            key="verify"
            id="email-otp-verify-form"
            onSubmit={onPromise(handleVerifySubmit)}
            className="space-y-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <p className="text-muted-foreground text-sm">
              {t("login.emailOtp.sentTo")}{" "}
              <span className="text-foreground font-medium">{sentEmail}</span>
            </p>

            <Controller
              name="otp"
              control={verifyForm.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="email-otp-login-otp" className="sr-only">
                    {t("login.emailOtp.otpLabel")}
                  </FieldLabel>
                  <InputOTP
                    {...field}
                    autoFocus
                    maxLength={6}
                    autoComplete="one-time-code"
                    aria-invalid={fieldState.invalid}
                    disabled={isVerifySubmitting}
                    onComplete={handleVerifySubmit}
                  >
                    <InputOTPGroup id="email-otp-login-otp">
                      {Array.from({ length: 6 }).map((_, index) => (
                        <InputOTPSlot key={index} index={index} />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <input type="hidden" {...verifyForm.register("email")} />

            <Button
              type="submit"
              className="w-full"
              size="lg"
              disabled={isVerifySubmitting}
            >
              {isVerifySubmitting ? (
                <Icons.Loader2 className="animate-spin" />
              ) : (
                t("login.cta")
              )}
            </Button>
          </motion.form>
        )}
      </AnimatePresence>
    );
  },
);

EmailOtpLoginForm.displayName = "EmailOtpLoginForm";
