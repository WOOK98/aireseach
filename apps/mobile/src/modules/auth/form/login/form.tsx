import { useLocalSearchParams } from "expo-router";
import { Suspense, useState } from "react";
import { View } from "react-native";

import { AuthProvider } from "@workspace/auth";
import { useTranslation } from "@workspace/i18n";
import { Badge } from "@workspace/ui-mobile/badge";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@workspace/ui-mobile/tabs";
import { Text } from "@workspace/ui-mobile/text";

import { pathsConfig } from "~/config/paths";
import { authClient } from "~/lib/auth";
import { Link } from "~/modules/common/styled";

import { EmailOtpLoginForm } from "./email-otp";
import { MagicLinkLoginForm } from "./magic-link";
import { PasswordLoginForm } from "./password";

import type { LoginOption } from "./constants";
import type { Route } from "expo-router";

const LOGIN_OPTIONS_DETAILS = {
  [AuthProvider.PASSWORD]: {
    lastUsedMethodId: "email",
    component: PasswordLoginForm,
    label: "password",
  },
  [AuthProvider.MAGIC_LINK]: {
    lastUsedMethodId: AuthProvider.MAGIC_LINK,
    component: MagicLinkLoginForm,
    label: "login.magicLink.label",
  },
  [AuthProvider.EMAIL_OTP]: {
    lastUsedMethodId: AuthProvider.EMAIL_OTP,
    component: EmailOtpLoginForm,
    label: "login.emailOtp.label",
  },
} as const;

interface LoginFormProps {
  readonly options: LoginOption[];
  readonly redirectTo?: Route;
  readonly email?: string;
  readonly onTwoFactorRedirect?: () => void;
}

export const LoginForm = ({
  options,
  redirectTo,
  email,
  onTwoFactorRedirect,
}: LoginFormProps) => {
  const { t } = useTranslation(["auth", "common"]);
  const [mainOption] = options;

  const [value, setValue] = useState(mainOption);

  if (!options.length || !value) {
    return null;
  }

  if (options.length === 1) {
    const Component = LOGIN_OPTIONS_DETAILS[value].component;
    return (
      <Component
        onTwoFactorRedirect={onTwoFactorRedirect}
        redirectTo={redirectTo}
        email={email}
      />
    );
  }

  return (
    <Tabs
      value={value}
      onValueChange={(val) => setValue(val as LoginOption)}
      className="flex w-full flex-col items-center justify-center gap-6"
    >
      <TabsList className="w-full flex-row">
        {options.map((provider) => (
          <TabsTrigger
            key={provider}
            value={provider}
            className="relative w-full shrink grow"
          >
            <Text>{t(LOGIN_OPTIONS_DETAILS[provider].label)}</Text>

            {authClient.isLastUsedLoginMethod(
              LOGIN_OPTIONS_DETAILS[provider].lastUsedMethodId,
            ) && (
              <Badge className="absolute -top-3 -right-4 shadow-sm">
                <Text>{t("lastUsed")}</Text>
              </Badge>
            )}
          </TabsTrigger>
        ))}
      </TabsList>

      {options.map((provider) => {
        const Component = LOGIN_OPTIONS_DETAILS[provider].component;
        return (
          <TabsContent key={provider} value={provider} className="w-full">
            <Suspense>
              <Component
                onTwoFactorRedirect={onTwoFactorRedirect}
                redirectTo={redirectTo}
                email={email}
              />
            </Suspense>
          </TabsContent>
        );
      })}
    </Tabs>
  );
};

export const LoginCta = () => {
  const { t } = useTranslation("auth");
  const localParams = useLocalSearchParams();
  const searchParams = new URLSearchParams(
    localParams as Record<string, string>,
  );

  return (
    <View className="items-center justify-center pt-2">
      <View className="flex-row">
        <Text className="text-muted-foreground text-sm">
          {t("register.alreadyHaveAccount")}
        </Text>
        <Link
          href={`${pathsConfig.setup.auth.login}?${searchParams.toString()}`}
          className="text-muted-foreground hover:text-primary pl-2 font-sans text-sm underline"
        >
          {t("login.cta")}
        </Link>
      </View>
    </View>
  );
};
