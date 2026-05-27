import { useGlobalSearchParams } from "expo-router";
import { View } from "react-native";

import { useTranslation } from "@workspace/i18n";
import { FieldSeparator } from "@workspace/ui-mobile/field";

import { authConfig } from "~/config/auth";
import { AnonymousLogin } from "~/modules/auth/form/anonymous";
import { LoginCta } from "~/modules/auth/form/login/form";
import { RegisterForm } from "~/modules/auth/form/register-form";
import { SocialProviders } from "~/modules/auth/form/social-providers";
import { AuthLayout } from "~/modules/auth/layout/base";
import { AuthHeader } from "~/modules/auth/layout/header";
import { InvitationDisclaimer } from "~/modules/auth/layout/invitation-disclaimer";

import type { Route } from "expo-router";

const RegisterPage = () => {
  const { t } = useTranslation("auth");

  const { redirectTo, invitationId, email } = useGlobalSearchParams<{
    redirectTo?: Route;
    invitationId?: string;
    email?: string;
  }>();

  return (
    <AuthLayout>
      <AuthHeader
        title={t("register.header.title")}
        description={t("register.header.description")}
      />
      {invitationId && <InvitationDisclaimer />}
      <SocialProviders
        providers={authConfig.providers.oAuth}
        redirectTo={redirectTo}
      />
      {authConfig.providers.oAuth.length > 0 && (
        <FieldSeparator>{t("divider")}</FieldSeparator>
      )}

      <View className="gap-2">
        <RegisterForm redirectTo={redirectTo} email={email} />
        {authConfig.providers.anonymous && <AnonymousLogin />}
      </View>
      <LoginCta />
    </AuthLayout>
  );
};

export default RegisterPage;
