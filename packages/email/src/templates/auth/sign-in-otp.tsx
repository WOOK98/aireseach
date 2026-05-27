import * as React from "react";
import { Heading, Preview, Text } from "react-email";

import { getTranslation } from "@workspace/i18n/server";
import { getOrigin } from "@workspace/shared/utils";

import { Layout } from "../_components/layout/layout";

import type {
  EmailVariables,
  EmailTemplate,
  CommonEmailProps,
} from "../../types";

type Props = EmailVariables[typeof EmailTemplate.SIGN_IN_OTP] &
  CommonEmailProps;

export const SignInOtp = async ({ url, otp, locale }: Props) => {
  const { t } = await getTranslation({ locale, ns: "auth" });
  const origin = getOrigin(url);

  return (
    <Layout locale={locale} origin={origin}>
      <Preview>{t("login.emailOtp.email.preview")}</Preview>
      <Heading className="leading-tight tracking-tight">
        {t("login.emailOtp.email.subject")}
      </Heading>

      <Text>{t("login.emailOtp.email.body")}</Text>

      <code className="border-border bg-muted my-6 block rounded-md border border-solid px-5 py-10 text-center font-mono text-3xl font-bold tracking-widest">
        {otp}
      </code>

      <Text className="text-muted-foreground">
        {t("login.emailOtp.email.disclaimer")}
      </Text>
    </Layout>
  );
};

SignInOtp.subject = async ({ locale }: CommonEmailProps) => {
  const { t } = await getTranslation({ locale, ns: "auth" });
  return t("login.emailOtp.email.subject");
};

SignInOtp.PreviewProps = {
  otp: "123456",
  locale: "en",
  url: "http://localhost:3000",
};

export default SignInOtp;
