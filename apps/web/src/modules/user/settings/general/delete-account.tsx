"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { toast } from "sonner";

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

import { user } from "../../lib/api";

import type { User } from "@workspace/auth";

interface DeleteAccountProps {
  readonly user: User;
}

export const DeleteAccount = ({ user }: DeleteAccountProps) => {
  const { t } = useTranslation("auth");

  const summary = useQuery(billing.queries.summary.get(user.id));
  const organizations = useQuery(
    organization.queries.getBlockingAccountDeletion,
  );

  const activeSubscriptions = useMemo(
    () =>
      summary.data?.flatMap((customer) =>
        customer.subscriptions.filter(isSubscriptionActive),
      ),
    [summary.data],
  );

  const canDelete = useMemo(
    () =>
      !summary.isLoading &&
      !activeSubscriptions?.length &&
      !organizations.isLoading &&
      !organizations.data?.length,
    [
      summary.isLoading,
      activeSubscriptions,
      organizations.isLoading,
      organizations.data?.length,
    ],
  );

  return (
    <SettingsCard variant="destructive">
      <SettingsCardHeader>
        <SettingsCardTitle>{t("account.delete.title")}</SettingsCardTitle>
        <SettingsCardDescription>
          {t("account.delete.description")}
        </SettingsCardDescription>
      </SettingsCardHeader>

      {!canDelete && (
        <SettingsCardContent className="flex flex-col gap-2">
          {activeSubscriptions && activeSubscriptions.length > 0 && (
            <TurboLink
              href={pathsConfig.dashboard.user.settings.billing}
              className="group"
            >
              <Alert
                variant="destructive"
                className="group-hover:bg-destructive/10 transition-colors"
              >
                <Icons.AlertTriangle />
                <AlertTitle>
                  {t("account.delete.blocker.subscriptions.title", {
                    count: activeSubscriptions?.length ?? 0,
                  })}
                </AlertTitle>
                <AlertDescription>
                  {t("account.delete.blocker.subscriptions.description", {
                    count: activeSubscriptions?.length ?? 0,
                  })}
                </AlertDescription>
              </Alert>
            </TurboLink>
          )}

          {organizations.data && organizations.data.length > 0 && (
            <TurboLink
              href={pathsConfig.dashboard.user.index}
              className="group"
            >
              <Alert
                variant="destructive"
                className="group-hover:bg-destructive/10 transition-colors"
              >
                <Icons.AlertTriangle />
                <AlertTitle>
                  {t("account.delete.blocker.organizations.title", {
                    count: organizations.data?.length ?? 0,
                  })}
                </AlertTitle>
                <AlertDescription>
                  {t("account.delete.blocker.organizations.description", {
                    count: organizations.data?.length ?? 0,
                  })}
                </AlertDescription>
              </Alert>
            </TurboLink>
          )}
        </SettingsCardContent>
      )}

      <SettingsCardFooter>
        <ConfirmModal
          isAnonymous={user.isAnonymous ?? false}
          render={
            <Button
              size="sm"
              className="ml-auto"
              variant="destructive"
              disabled={!canDelete}
            >
              {t("account.delete.cta")}
            </Button>
          }
        />
      </SettingsCardFooter>
    </SettingsCard>
  );
};

const ConfirmModal = ({
  render,
  isAnonymous,
}: {
  render: React.ReactElement;
  isAnonymous: boolean;
}) => {
  const session = authClient.useSession();
  const router = useRouter();
  const { t } = useTranslation(["common", "auth"]);

  const deleteAccount = useMutation({
    ...user.mutations.delete.user,
    onSuccess: () => {
      toast.success(t("account.delete.confirmation.success"));
    },
  });

  const deleteAnonymousAccount = useMutation({
    ...user.mutations.delete.anonymous,
    onSuccess: async () => {
      await session.refetch();
      router.replace(pathsConfig.index);
      toast.success(t("account.delete.anonymous.confirmation.success"));
    },
  });

  const disclaimer = isAnonymous
    ? t("account.delete.anonymous.disclaimer")
    : t("account.delete.disclaimer");

  const renderCta = () =>
    isAnonymous ? (
      <Button
        onClick={() => deleteAnonymousAccount.mutate(undefined)}
        variant="destructive"
        disabled={deleteAnonymousAccount.isPending}
      >
        {deleteAnonymousAccount.isPending ? (
          <Icons.Loader2 className="animate-spin" />
        ) : (
          t("account.delete.cta")
        )}
      </Button>
    ) : (
      <Button
        onClick={() =>
          deleteAccount.mutate({
            callbackURL: pathsConfig.index,
          })
        }
        variant="destructive"
        disabled={deleteAccount.isPending}
      >
        {deleteAccount.isPending ? (
          <Icons.Loader2 className="animate-spin" />
        ) : (
          t("account.delete.confirmation.cta")
        )}
      </Button>
    );

  return (
    <Modal>
      <ModalTrigger render={render} />
      <ModalContent>
        <ModalHeader>
          <ModalTitle>{t("account.delete.title")}</ModalTitle>
          <ModalDescription className="whitespace-pre-line">
            {disclaimer}
          </ModalDescription>
        </ModalHeader>
        <ModalFooter>
          <ModalClose
            render={<Button variant="outline">{t("cancel")}</Button>}
          />
          {renderCta()}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
