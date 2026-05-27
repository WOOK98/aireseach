"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useTranslation } from "@workspace/i18n";
import { Badge } from "@workspace/ui-web/badge";
import { Button } from "@workspace/ui-web/button";
import { Icons } from "@workspace/ui-web/icons";
import { Skeleton } from "@workspace/ui-web/skeleton";

import { pathsConfig } from "~/config/paths";
import { authClient } from "~/lib/auth/client";
import { auth } from "~/modules/auth/lib/api";
import {
  SettingsCard,
  SettingsCardHeader,
  SettingsCardTitle,
  SettingsCardDescription,
  SettingsCardFooter,
  SettingsCardContent,
} from "~/modules/common/layout/dashboard/settings-card";

export const Sessions = () => {
  const { t } = useTranslation(["common", "auth"]);
  const currentSession = authClient.useSession();
  const router = useRouter();

  const signOut = useMutation({
    ...auth.mutations.signOut,
    onSuccess: () => {
      router.replace(pathsConfig.index);
    },
  });

  const {
    data: sessions,
    isLoading,
    refetch,
  } = useQuery({
    ...auth.queries.sessions.getAll,
    enabled: !!currentSession.data?.user.id,
  });

  const revoke = useMutation({
    ...auth.mutations.sessions.revoke,
    onSuccess: async (_, token) => {
      toast.success(t("account.sessions.revoke.success"));
      await refetch();
      if (token === currentSession.data?.session.token) {
        await signOut.mutateAsync(undefined);
      }
    },
  });

  return (
    <SettingsCard>
      <SettingsCardHeader>
        <SettingsCardTitle>{t("account.sessions.title")}</SettingsCardTitle>
        <SettingsCardDescription className="text-foreground flex flex-col gap-1 pb-1.5">
          {t("account.sessions.description")}
        </SettingsCardDescription>
      </SettingsCardHeader>

      <SettingsCardContent>
        {isLoading ? (
          <Skeleton className="h-24" />
        ) : sessions && sessions.length > 0 ? (
          <ul className="overflow-hidden rounded-md border">
            {sessions.map((session) => {
              return (
                <li
                  key={session.id}
                  className="flex min-w-0 items-center gap-3 border-b px-4 py-3 last:border-b-0"
                >
                  <Icons.MonitorSmartphone className="size-6 shrink-0" />

                  <div className="mr-auto grid grid-cols-1">
                    <div className="flex items-center gap-1">
                      <span className="truncate text-sm font-medium capitalize">
                        {session.ipAddress}
                      </span>
                      {session.token === currentSession.data?.session.token && (
                        <Badge variant="outline" className="mb-0.5">
                          {t("current")}
                        </Badge>
                      )}
                    </div>
                    <span className="text-muted-foreground truncate text-xs">
                      {session.userAgent}
                    </span>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={
                      revoke.isPending && revoke.variables === session.token
                    }
                    onClick={() => revoke.mutate(session.token)}
                  >
                    <span className="sr-only">
                      {t("account.sessions.revoke.cta")}
                    </span>
                    {revoke.isPending && revoke.variables === session.token ? (
                      <Icons.Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Icons.Trash className="size-4" />
                    )}
                  </Button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="flex items-center justify-center rounded-md border border-dashed p-6">
            <p className="text-center">{t("account.sessions.noSessions")}</p>
          </div>
        )}
      </SettingsCardContent>

      <SettingsCardFooter>
        <span>{t("account.sessions.info")}</span>
      </SettingsCardFooter>
    </SettingsCard>
  );
};
