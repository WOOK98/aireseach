import { memo, useState } from "react";
import { View } from "react-native";

import { SecondFactor } from "@workspace/auth";
import { useTranslation } from "@workspace/i18n";
import { FieldSeparator } from "@workspace/ui-mobile/field";

import { authConfig } from "~/config/auth";
import { AnonymousLogin } from "~/modules/auth/form/anonymous";
import { LOGIN_OPTIONS } from "~/modules/auth/form/login/constants";
import { LoginForm } from "~/modules/auth/form/login/form";
import { RegisterCta } from "~/modules/auth/form/register-form";
import { SocialProviders } from "~/modules/auth/form/social-providers";
import { TwoFactorForm, TwoFactorCta } from "~/modules/auth/form/two-factor";
import { AuthLayout } from "~/modules/auth/layout/base";
import { AuthHeader } from "~/modules/auth/layout/header";
import { InvitationDisclaimer } from "~/modules/auth/layout/invitation-disclaimer";

import type { Route } from "expo-router";
import type { LoginOption } from "~/modules/auth/form/login/constants";

const LoginStep = {
  FORM: "form",
  TWO_FACTOR: "twoFactor",
} as const;

type LoginStep = (typeof LoginStep)[keyof typeof LoginStep];

interface LoginFlowProps {
  readonly redirectTo?: Route;
  readonly invitationId?: string;
  readonly email?: string;
}

export const LoginFlow = ({
  redirectTo,
  invitationId,
  email,
}: LoginFlowProps) => {
  const [step, setStep] = useState<LoginStep>(LoginStep.FORM);

  return (
    <AuthLayout>
      {(() => {
        switch (step) {
          case LoginStep.FORM:
            return (
              <Login
                redirectTo={redirectTo}
                invitationId={invitationId}
                email={email}
                onTwoFactorRedirect={() => setStep(LoginStep.TWO_FACTOR)}
              />
            );
          case LoginStep.TWO_FACTOR:
            return <TwoFactor redirectTo={redirectTo} />;
        }
      })()}
    </AuthLayout>
  );
};

interface LoginProps extends LoginFlowProps {
  readonly onTwoFactorRedirect?: () => void;
}

const Login = memo<LoginProps>(
  ({ redirectTo, invitationId, email, onTwoFactorRedirect }) => {
    const { t } = useTranslation("auth");
    const options = Object.entries(authConfig.providers)
      .filter(
        ([provider, enabled]) =>
          enabled && LOGIN_OPTIONS.includes(provider as LoginOption),
      )
      .map(([provider]) => provider as LoginOption);

    return (
      <>
        <AuthHeader
          title={t("login.header.title")}
          description={t("login.header.description")}
        />
        {invitationId && <InvitationDisclaimer />}

        <SocialProviders
          providers={authConfig.providers.oAuth}
          redirectTo={redirectTo}
        />
        {authConfig.providers.oAuth.length > 0 && options.length > 0 && (
          <FieldSeparator>{t("divider")}</FieldSeparator>
        )}

        <View className="gap-2">
          <LoginForm
            options={options}
            redirectTo={redirectTo}
            email={email}
            onTwoFactorRedirect={onTwoFactorRedirect}
          />
          {authConfig.providers.anonymous && <AnonymousLogin />}
        </View>

        <RegisterCta />
      </>
    );
  },
);

const TwoFactor = ({ redirectTo }: LoginFlowProps) => {
  const [factor, setFactor] = useState<SecondFactor>(SecondFactor.TOTP);
  const { t } = useTranslation("auth");

  const Form = TwoFactorForm[factor];
  const Cta =
    factor === SecondFactor.TOTP
      ? TwoFactorCta[SecondFactor.BACKUP_CODE]
      : TwoFactorCta[SecondFactor.TOTP];

  return (
    <>
      <AuthHeader
        title={t(`login.twoFactor.${factor}.header.title`)}
        description={t(`login.twoFactor.${factor}.header.description`)}
      />

      <Form redirectTo={redirectTo} />
      <Cta onFactorChange={setFactor} />
    </>
  );
};
