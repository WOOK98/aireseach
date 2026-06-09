import { useMutation, useQuery } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import { toast } from "sonner";

import { Permissions, toMemberRole, type User } from "@workspace/auth";
import {
  BillingReference,
  getHigherPlans,
  getLowerPlans,
} from "@workspace/billing";
import { useTranslation } from "@workspace/i18n";

import { appConfig } from "~/config/app";
import { pathsConfig } from "~/config/paths";
import { authClient } from "~/lib/auth/client";
import { billing } from "~/modules/billing/lib/api";
import { usePricingControls } from "~/modules/billing/pricing/controls";
import { organization } from "~/modules/organization/lib/api";

import type { BillingConfigPlan } from "@workspace/billing";

export const usePlan = ({
  plan,
  user,
}: {
  plan: BillingConfigPlan;
  user: User | null;
}) => {
  const { t } = useTranslation("billing");
  const controls = usePricingControls((c) => c.controls);

  // Client-side session as backup — props-based user can be stale
  const { data: clientSession } = authClient.useSession();
  const isAuthenticated = !!clientSession?.user || !!user;
  const member = useQuery({
    ...organization.queries.members.getByUserId({
      organizationId: controls.referenceId ?? "",
      userId: user?.id ?? "",
    }),
    enabled:
      controls.referenceType === BillingReference.ORGANIZATION &&
      !!controls.referenceId,
  });

  const organizations = authClient.useListOrganizations();
  const referenceOrganization = useMemo(
    () => organizations.data?.find((o) => o.id === controls.referenceId),
    [organizations.data, controls.referenceId],
  );

  const router = useRouter();
  const checkout = useMutation({
    ...billing.mutations.checkout.create,
    onSuccess: (data) => {
      if (!data.url) {
        return toast.error(t("error.checkout"));
      }
      return router.push(data.url);
    },
    onError: () => {
      toast.error(t("error.checkoutConfiguration"));
    },
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

  const pathname = usePathname();

  const features = [
    ...plan.features.filter(
      (f) => !getLowerPlans(plan.id).some((p) => p.features.includes(f)),
    ),
    ...(getHigherPlans(plan.id)[0]
      ?.features.filter((f) => !plan.features.includes(f))
      .slice(0, 3) ?? []),
  ].map((feature) => ({
    id: feature,
    available: plan.features.includes(feature),
    key: `feature.${feature}`,
  }));

  const handleCheckout = (
    params: Omit<
      Parameters<typeof checkout.mutate>[0]["json"],
      "redirect" | "referenceId"
    >,
  ) => {
    if (!isAuthenticated) {
      const url = new URL(pathsConfig.auth.login, appConfig.url);
      url.searchParams.set("redirectTo", pathsConfig.marketing.pricing);
      return router.push(url.toString());
    }

    const success = new URL(
      controls.referenceType === BillingReference.USER
        ? pathsConfig.dashboard.user.index
        : pathsConfig.dashboard.organization(referenceOrganization?.slug ?? "")
            .index,
      appConfig.url,
    );
    const cancel = new URL(pathname, appConfig.url);

    checkout.mutate({
      json: {
        ...params,
        referenceId:
          controls.referenceId ?? clientSession?.user?.id ?? user?.id ?? "",
        redirect: {
          success: success.toString(),
          cancel: cancel.toString(),
        },
      },
    });
  };

  const handleOpenPortal = () => {
    if (!isAuthenticated) {
      const url = new URL(pathsConfig.auth.login, appConfig.url);
      url.searchParams.set("redirectTo", pathsConfig.marketing.pricing);
      return router.push(url.toString());
    }

    const redirectUrl = new URL(pathname, appConfig.url);

    getPortal.mutate({
      query: {
        redirectUrl: redirectUrl.toString(),
        referenceId:
          controls.referenceId ?? clientSession?.user?.id ?? user?.id ?? "",
      },
    });
  };

  const can = useCallback(
    (permission: NonNullable<Permissions["billing"]>[number]) =>
      !isAuthenticated ||
      controls.referenceType === BillingReference.USER ||
      authClient.organization.checkRolePermission({
        permissions: {
          billing: [permission],
        },
        role: toMemberRole(member.data?.role),
      }),
    [member.data?.role, controls.referenceType, isAuthenticated],
  );

  return {
    canRead: can("read"),
    canCreate: can("create"),
    canUpdate: can("update"),
    canDelete: can("delete"),
    isPending: checkout.isPending || getPortal.isPending,
    features,
    handleCheckout,
    handleOpenPortal,
    referenceOrganization,
  };
};
