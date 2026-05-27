import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import React, { useMemo } from "react";
import { toast } from "sonner";

import { toMemberRole } from "@workspace/auth";
import {
  BillingReference,
  MOBILE_STORE_LINKS,
  MobileStore,
} from "@workspace/billing";
import { useTranslation } from "@workspace/i18n";
import { cn } from "@workspace/ui";
import { Button, buttonVariants } from "@workspace/ui-web/button";
import { Icons } from "@workspace/ui-web/icons";

import { appConfig } from "~/config/app";
import { pathsConfig } from "~/config/paths";
import { authClient } from "~/lib/auth/client";
import { billing } from "~/modules/billing/lib/api";
import { TurboLink } from "~/modules/common/turbo-link";
import { organization as organizationApi } from "~/modules/organization/lib/api";

export const PortalLink = ({
  children,
  store,
  redirectUrl,
  variantId,
  referenceId,
  referenceType,
  ...props
}: React.ComponentProps<typeof Button> & {
  store?: string;
  redirectUrl?: string | URL;
  variantId?: string;
  referenceId: string;
  referenceType: BillingReference;
}) => {
  const { t } = useTranslation("billing");
  const router = useRouter();
  const session = authClient.useSession();

  const organization = useQuery({
    ...organizationApi.queries.get({ id: referenceId }),
    enabled: referenceType === BillingReference.ORGANIZATION,
  });

  const member = useQuery({
    ...organizationApi.queries.members.getByUserId({
      organizationId: referenceId,
      userId: session.data?.user.id ?? "",
    }),
    enabled: referenceType === BillingReference.ORGANIZATION,
  });

  const getPortal = useMutation({
    ...billing.mutations.portal.get,
    onSuccess: (data) => {
      if (!data.url) {
        return toast.error(t("error.portal"));
      }
      return router.push(data.url);
    },
  });
  const canOpenPortal = useMemo(
    () =>
      referenceType === BillingReference.USER ||
      authClient.organization.checkRolePermission({
        permissions: {
          billing: ["update", "delete"],
        },
        role: toMemberRole(member.data?.role),
      }),
    [member.data?.role, referenceType],
  );

  if (store && Object.values(MobileStore).includes(store)) {
    const url = new URL(
      MOBILE_STORE_LINKS[store as keyof typeof MOBILE_STORE_LINKS],
    );

    if (store === MobileStore.PLAY_STORE && variantId) {
      url.searchParams.set("sku", variantId);
    }

    return (
      <TurboLink
        {...(props as React.ComponentProps<typeof TurboLink>)}
        href={url.toString()}
        className={cn(
          buttonVariants({ variant: props.variant, size: props.size }),
          props.className,
        )}
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </TurboLink>
    );
  }

  const url =
    redirectUrl ??
    new URL(
      referenceType === BillingReference.USER || !organization.data
        ? pathsConfig.dashboard.user.settings.billing
        : pathsConfig.dashboard.organization(organization.data.slug).settings
            .billing,
      appConfig.url,
    );

  return (
    <Button
      {...props}
      onClick={() =>
        getPortal.mutate({
          query: {
            referenceId,
            redirectUrl: url.toString(),
          },
        })
      }
      disabled={getPortal.isPending || !canOpenPortal || props.disabled}
    >
      {getPortal.isPending ? (
        <Icons.Loader2 className="size-5 animate-spin" />
      ) : (
        children
      )}
    </Button>
  );
};
