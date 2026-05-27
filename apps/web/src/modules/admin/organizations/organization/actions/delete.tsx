import { useMutation, useMutationState, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useTranslation } from "@workspace/i18n";
import { Button } from "@workspace/ui-web/button";
import { Icons } from "@workspace/ui-web/icons";
import {
  Modal,
  ModalTrigger,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
  ModalClose,
} from "@workspace/ui-web/modal";

import { admin } from "~/modules/admin/lib/api";

interface DeleteProps {
  readonly id: string;
}

export const Delete = ({ id }: DeleteProps) => {
  const { t } = useTranslation("common");

  const [mutation] = useMutationState({
    filters: {
      mutationKey: admin.mutations.organizations.delete.mutationKey,
    },
    select: (mutation) => ({
      status: mutation.state.status,
      variables: mutation.state.variables as { id: string },
    }),
  });

  const isPending =
    mutation?.status === "pending" && mutation.variables.id === id;

  return (
    <ConfirmModal
      organizationId={id}
      render={
        <Button variant="destructive" disabled={isPending}>
          {isPending ? (
            <Icons.Loader2 className="animate-spin" />
          ) : (
            <Icons.Trash />
          )}
          {t("delete")}
        </Button>
      }
    />
  );
};

const ConfirmModal = ({
  render,
  organizationId,
}: {
  render: React.ReactElement;
  organizationId: string;
}) => {
  const { t } = useTranslation(["common", "admin"]);
  const router = useRouter();

  const { data: organization } = useQuery(
    admin.queries.organizations.get({ id: organizationId }),
  );

  const deleteOrganization = useMutation({
    ...admin.mutations.organizations.delete,
    onSuccess: () => {
      toast.success(t("organizations.organization.delete.success"));
      router.back();
    },
  });

  const handleDelete = () => {
    deleteOrganization.mutate({ id: organizationId });
  };

  const isPending =
    deleteOrganization.isPending &&
    deleteOrganization.variables.id === organizationId;

  return (
    <Modal>
      <ModalTrigger render={render} />
      <ModalContent>
        <ModalHeader>
          <ModalTitle>
            {t("organizations.organization.delete.title", {
              name: organization?.name,
            })}
          </ModalTitle>
          <ModalDescription className="whitespace-pre-line">
            {t("organizations.organization.delete.disclaimer")}
          </ModalDescription>
        </ModalHeader>
        <ModalFooter>
          <ModalClose
            render={
              <Button variant="outline" type="button">
                {t("cancel")}
              </Button>
            }
          />
          <Button
            onClick={handleDelete}
            variant="destructive"
            disabled={isPending}
          >
            {isPending ? (
              <Icons.Loader2 className="animate-spin" />
            ) : (
              t("delete")
            )}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
