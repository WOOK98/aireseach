import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useMutation } from "@tanstack/react-query";
import { router } from "expo-router";
import { memo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { View } from "react-native";

import { emailOtpLoginSchema, magicLinkLoginSchema } from "@workspace/auth";
import { useTranslation } from "@workspace/i18n";
import { Button } from "@workspace/ui-mobile/button";
import { Field, FieldError, FieldLabel } from "@workspace/ui-mobile/field";
import { Icons } from "@workspace/ui-mobile/icons";
import { Input } from "@workspace/ui-mobile/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@workspace/ui-mobile/input-otp";
import { Spin } from "@workspace/ui-mobile/spin";
import { Text } from "@workspace/ui-mobile/text";

import { pathsConfig } from "~/config/paths";

import { auth } from "../../lib/api";

import type { Route } from "expo-router";

const STEP = {
  REQUEST: "request",
  VERIFY: "verify",
} as const;

type Step = (typeof STEP)[keyof typeof STEP];

interface EmailOtpLoginFormProps {
  readonly redirectTo?: Route;
  readonly email?: string;
}

export const EmailOtpLoginForm = memo<EmailOtpLoginFormProps>(
  ({ redirectTo = pathsConfig.index, email: initialEmail }) => {
    const { t } = useTranslation(["common", "auth"]);
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
    const signIn = useMutation({
      ...auth.mutations.signIn.emailOtp,
      onSuccess: () => {
        router.replace(redirectTo);
      },
    });

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
      signIn.mutate({
        email: sentEmail,
        otp: data.otp,
      });
    });

    const isRequestSubmitting =
      requestForm.formState.isSubmitting || sendOtp.isPending;
    const isVerifySubmitting =
      verifyForm.formState.isSubmitting || signIn.isPending;

    if (step === STEP.REQUEST) {
      return (
        <View className="gap-6">
          <Controller
            name="email"
            control={requestForm.control}
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
                  editable={!isRequestSubmitting}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Button
            className="w-full"
            size="lg"
            onPress={handleRequestSubmit}
            disabled={isRequestSubmitting}
          >
            {isRequestSubmitting ? (
              <Spin>
                <Icons.Loader2 className="text-primary-foreground size-5" />
              </Spin>
            ) : (
              <Text>{t("login.emailOtp.cta")}</Text>
            )}
          </Button>
        </View>
      );
    }

    return (
      <View className="gap-6">
        <Text className="text-muted-foreground text-sm">
          {t("login.emailOtp.sentTo")}{" "}
          <Text className="text-foreground text-sm font-medium">
            {sentEmail}
          </Text>
        </Text>

        <Controller
          name="otp"
          control={verifyForm.control}
          render={({ field, fieldState }) => (
            <Field invalid={fieldState.invalid} className="items-start">
              <InputOTP
                maxLength={6}
                autoFocus
                value={field.value}
                onChange={field.onChange}
                onComplete={() => handleVerifySubmit()}
                editable={!isVerifySubmitting}
                render={({ slots }) => (
                  <InputOTPGroup>
                    {slots.map((slot, index) => (
                      <InputOTPSlot
                        key={index}
                        index={index}
                        max={6}
                        {...slot}
                      />
                    ))}
                  </InputOTPGroup>
                )}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Button
          className="w-full"
          size="lg"
          onPress={handleVerifySubmit}
          disabled={isVerifySubmitting}
        >
          {isVerifySubmitting ? (
            <Spin>
              <Icons.Loader2 className="text-primary-foreground size-5" />
            </Spin>
          ) : (
            <Text>{t("login.cta")}</Text>
          )}
        </Button>
      </View>
    );
  },
);

EmailOtpLoginForm.displayName = "EmailOtpLoginForm";
