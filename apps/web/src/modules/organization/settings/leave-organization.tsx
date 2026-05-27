"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { MemberRole } from "@workspace/auth";
import { useTranslation } from "@workspace/i18n";
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
import {
  SettingsCard,
  SettingsCardHeader,
  SettingsCardTitle,
  SettingsCardDescription,
  SettingsCardFooter,
} from "~/modules/common/layout/dashboard/settings-card";
import { useActiveOrganization } from "~/modules/organization/hooks/use-active-organization";
import { organization } from "~/modules/organization/lib/api";

export const LeaveOrganization = ({
  organizationId,
}: {
  organizationId: string;
}) => {
  const { t } = useTranslation("organization");
  const { activeMember } = useActiveOrganization();
  const isOwner = activeMember?.role === MemberRole.OWNER;

  const { data: activeOrganization } = useQuery(
    organization.queries.get({ id: organizationId }),
  );

  const { data: canLeave } = useQuery({
    ...organization.queries.canLeave({ id: organizationId }),
    enabled: isOwner,
  });

  const canCurrentMemberLeave = !isOwner || canLeave?.allowed === true;

  if (!activeOrganization) {
    return null;
  }

  return (
    <SettingsCard variant="destructive" disabled={!canCurrentMemberLeave}>
      <SettingsCardHeader>
        <SettingsCardTitle>{t("leave.title")}</SettingsCardTitle>
        <SettingsCardDescription>
          {t("leave.description")}
        </SettingsCardDescription>
      </SettingsCardHeader>

      <SettingsCardFooter>
        {canCurrentMemberLeave ? (
          <ConfirmLeaveModal
            organizationId={activeOrganization.id}
            render={
              <Button size="sm" className="ml-auto" variant="destructive">
                {t("leave.cta")}
              </Button>
            }
          />
        ) : (
          t("leave.cannotLeaveAsOnlyOwner")
        )}
      </SettingsCardFooter>
    </SettingsCard>
  );
};

const ConfirmLeaveModal = ({
  render,
  organizationId,
}: {
  render: React.ReactElement;
  organizationId: string;
}) => {
  const { t } = useTranslation(["common", "organization"]);
  const router = useRouter();
  const { refetch } = authClient.useListOrganizations();

  const leaveOrganization = useMutation({
    ...organization.mutations.leave,
    onSuccess: async () => {
      await refetch();
      toast.success(t("leave.success"));
      router.replace(pathsConfig.dashboard.user.index);
    },
  });

  const handleLeave = () => {
    leaveOrganization.mutate({ organizationId });
  };

  return (
    <Modal>
      <ModalTrigger render={render} />
      <ModalContent>
        <ModalHeader>
          <ModalTitle>{t("leave.title")}</ModalTitle>
          <ModalDescription className="whitespace-pre-line">
            {t("leave.disclaimer")}
          </ModalDescription>
        </ModalHeader>
        <ModalFooter>
          <ModalClose
            render={<Button variant="outline">{t("cancel")}</Button>}
          />
          <Button
            onClick={handleLeave}
            variant="destructive"
            disabled={leaveOrganization.isPending}
          >
            {leaveOrganization.isPending ? (
              <Icons.Loader2 className="animate-spin" />
            ) : (
              t("common:leave")
            )}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
