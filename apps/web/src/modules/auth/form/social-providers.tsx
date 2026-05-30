"use client";

import { useMutation } from "@tanstack/react-query";
import { memo, useEffect } from "react";

import { SocialProvider as SocialProviderType } from "@workspace/auth";
import { useTranslation } from "@workspace/i18n";
import { Badge } from "@workspace/ui-web/badge";
import { Button } from "@workspace/ui-web/button";
import { Icons } from "@workspace/ui-web/icons";

import { pathsConfig } from "~/config/paths";
import { authClient } from "~/lib/auth/client";

import envConfig from "../../../../env.config";
import { auth } from "../lib/api";

import type { Icon } from "@workspace/ui-web/icons";

interface SocialProvidersProps {
  readonly providers: SocialProviderType[];
  readonly redirectTo?: string;
  readonly context?: "signin" | "signup";
}

export const SocialIcons: Record<SocialProviderType, Icon> = {
  [SocialProviderType.GITHUB]: Icons.Github,
  [SocialProviderType.GOOGLE]: Icons.Google,
  [SocialProviderType.APPLE]: Icons.Apple,
};

const SocialProvider = ({
  provider,
  redirectTo,
  context,
  isSubmitting,
  onClick,
}: {
  provider: SocialProviderType;
  isSubmitting: boolean;
  onClick: () => void;
  context?: "signin" | "signup";
  redirectTo?: string;
}) => {
  const { t } = useTranslation("common");
  const Icon = SocialIcons[provider];

  useEffect(() => {
    if (
      provider === SocialProviderType.GOOGLE &&
      envConfig.NEXT_PUBLIC_GOOGLE_ONE_TAP_CLIENT_ID
    ) {
      void authClient
        .oneTap({
          context,
          callbackURL: redirectTo,
        })
        .catch(() => {
          // One Tap not available — silently ignore
        });
    }
  }, [provider, context, redirectTo]);

  return (
    <Button
      key={provider}
      variant="outline"
      type="button"
      size="lg"
      className="relative flex-1 gap-2"
      disabled={isSubmitting}
      onClick={onClick}
    >
      {isSubmitting ? (
        <Icons.Loader2 className="animate-spin" />
      ) : (
        <>
          <Icon className="size-5 dark:brightness-125" />
          <span className="leading-none capitalize">{provider}</span>
        </>
      )}

      {authClient.isLastUsedLoginMethod(provider) && (
        <Badge className="absolute top-0 -right-4 z-10 -translate-y-1/2 shadow-sm">
          {t("lastUsed")}
        </Badge>
      )}
    </Button>
  );
};

export const SocialProviders = memo<SocialProvidersProps>(
  ({ providers, redirectTo = pathsConfig.dashboard.user.index, context }) => {
    const signIn = useMutation(auth.mutations.signIn.social);

    return (
      <div className="flex flex-wrap gap-2">
        {Object.values(providers).map((provider) => (
          <SocialProvider
            key={provider}
            provider={provider}
            redirectTo={redirectTo}
            context={context}
            isSubmitting={
              signIn.isPending && signIn.variables.provider === provider
            }
            onClick={() =>
              signIn.mutate({
                provider,
                callbackURL: redirectTo,
                errorCallbackURL: pathsConfig.auth.error,
              })
            }
          />
        ))}
      </div>
    );
  },
);

SocialProviders.displayName = "SocialProviders";
