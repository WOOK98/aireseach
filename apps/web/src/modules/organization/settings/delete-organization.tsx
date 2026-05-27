"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { toast } from "sonner";

import { MemberRole } from "@workspace/auth";
import { isSubscriptionActive } from "@workspace/billing";
import { useTranslation } from "@workspace/i18n";
import { Alert, AlertTitle, AlertDescription } from "@workspace/ui-web/alert";
import { Button } from "@workspace/ui-web/button";
import { Icons } from "@workspace/ui-web/icons";
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalTrigger,
} from "@workspace/ui-web/modal";

import { pathsConfig } from "~/config/paths";
import { authClient } from "~/lib/auth/client";
import { billing } from "~/modules/billing/lib/api";
import {
  SettingsCard,
  SettingsCardHeader,
  SettingsCardTitle,
  SettingsCardDescription,
  SettingsCardFooter,
  SettingsCardContent,
} from "~/modules/common/layout/dashboard/settings-card";
import { TurboLink } from "~/modules/common/turbo-link";
import { organization } from "~/modules/organization/lib/api";

import { useActiveOrganization } from "../hooks/use-active-organization";

export const DeleteOrganization = ({
  organizationId,
}: {
  organizationId: string;
}) => {
  const { t } = useTranslation("organization");
  const { activeMember } = useActiveOrganization();

  const { data: activeOrganization } = useQuery(
    organization.queries.get({ id: organizationId }),
  );

  const hasDeletePermission = authClient.organization.checkRolePermission({
    permissions: {
      organization: ["delete"],
    },
    role: activeMember?.role ?? MemberRole.MEMBER,
  });

  const summary = useQuery({
    ...billing.queries.summary.get(organizationId),
    enabled: !!activeOrganization && hasDeletePermission,
  });

  const activeSubscriptions = useMemo(
    () =>
      summary.data?.flatMap((customer) =>
        customer.subscriptions.filter(isSubscriptionActive),
      ),
    [summary.data],
  );

  const canDelete = useMemo(() => {
    return (
      hasDeletePermission && !summary.isLoading && !activeSubscriptions?.length
    );
  }, [hasDeletePermission, summary.isLoading, activeSubscriptions]);

  if (!activeOrganization) {
    return null;
  }

  return (
    <SettingsCard variant="destructive" disabled={!hasDeletePermission}>
      <SettingsCardHeader>
        <SettingsCardTitle>{t("delete.title")}</SettingsCardTitle>
        <SettingsCardDescription>
          {t("delete.description")}
        </SettingsCardDescription>
      </SettingsCardHeader>

      {hasDeletePermission &&
        activeSubscriptions &&
        activeSubscriptions.length > 0 && (
          <SettingsCardContent className="flex flex-col gap-2">
            <TurboLink
              href={
                pathsConfig.dashboard.organization(activeOrganization.slug)
                  .settings.billing
              }
              className="group"
            >
              <Alert
                variant="destructive"
                className="group-hover:bg-destructive/10 transition-colors"
              >
                <Icons.AlertTriangle />
                <AlertTitle>
                  {t("delete.blocker.subscriptions.title", {
                    count: activeSubscriptions.length,
                  })}
                </AlertTitle>
                <AlertDescription>
                  {t("delete.blocker.subscriptions.description", {
                    count: activeSubscriptions.length,
                  })}
                </AlertDescription>
              </Alert>
            </TurboLink>
          </SettingsCardContent>
        )}

      <SettingsCardFooter>
        {hasDeletePermission ? (
          <ConfirmModal
            organizationId={activeOrganization.id}
            render={
              <Button
                size="sm"
                className="ml-auto"
                variant="destructive"
                disabled={!canDelete}
              >
                {t("delete.cta")}
              </Button>
            }
          />
        ) : (
          t("delete.blocker.missingPermission")
        )}
      </SettingsCardFooter>
    </SettingsCard>
  );
};

const ConfirmModal = ({
  render,
  organizationId,
}: {
  render: React.ReactElement;
  organizationId: string;
}) => {
  const { t } = useTranslation(["common", "organization"]);
  const router = useRouter();

  const deleteOrganization = useMutation({
    ...organization.mutations.delete,
    onSuccess: () => {
      toast.success(t("delete.success"));
      router.replace(pathsConfig.dashboard.user.index);
    },
  });

  const handleDelete = () => {
    deleteOrganization.mutate({ organizationId });
  };

  return (
    <Modal>
      <ModalTrigger render={render} />
      <ModalContent>
        <ModalHeader>
          <ModalTitle>{t("delete.title")}</ModalTitle>
          <ModalDescription className="whitespace-pre-line">
            {t("delete.disclaimer")}
          </ModalDescription>
        </ModalHeader>
        <ModalFooter>
          <ModalClose
            render={<Button variant="outline">{t("cancel")}</Button>}
          />
          <Button
            onClick={handleDelete}
            variant="destructive"
            disabled={deleteOrganization.isPending}
          >
            {deleteOrganization.isPending ? (
              <Icons.Loader2 className="animate-spin" />
            ) : (
              t("common:delete")
            )}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
