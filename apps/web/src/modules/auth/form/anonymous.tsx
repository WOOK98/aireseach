"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { useTranslation } from "@workspace/i18n";
import { Button } from "@workspace/ui-web/button";
import { Icons } from "@workspace/ui-web/icons";

import { pathsConfig } from "~/config/paths";

import { auth } from "../lib/api";

interface AnonymousLoginProps {
  readonly redirectTo?: string;
}

export const AnonymousLogin = ({
  redirectTo = pathsConfig.dashboard.user.index,
}: AnonymousLoginProps) => {
  const router = useRouter();
  const { t } = useTranslation("auth");

  const signIn = useMutation({
    ...auth.mutations.signIn.anonymous,
    onSuccess: () => {
      router.replace(redirectTo);
    },
  });

  return (
    <Button
      variant="outline"
      className="gap-2"
      size="lg"
      type="button"
      disabled={signIn.isPending}
      onClick={() => signIn.mutate(undefined)}
    >
      {signIn.isPending ? (
        <Icons.Loader2 className="animate-spin" />
      ) : (
        <>
          <Icons.UserRound className="size-4" />
          {t("login.anonymous.cta")}
        </>
      )}
    </Button>
  );
};
