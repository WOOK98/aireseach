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
      mutationKey: admin.mutations.users.delete.mutationKey,
    },
    select: (mutation) => ({
      status: mutation.state.status,
      variables: mutation.state.variables as { userId: string },
    }),
  });

  const isPending =
    mutation?.status === "pending" && mutation.variables.userId === id;

  return (
    <ConfirmModal
      userId={id}
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
  userId,
}: {
  render: React.ReactElement;
  userId: string;
}) => {
  const { t } = useTranslation(["common", "admin"]);
  const router = useRouter();

  const { data: user } = useQuery(admin.queries.users.get({ id: userId }));

  const deleteUser = useMutation({
    ...admin.mutations.users.delete,
    onSuccess: () => {
      toast.success(t("users.user.delete.success"));
      router.back();
    },
  });

  const handleDelete = () => {
    deleteUser.mutate({ userId });
  };

  const isPending =
    deleteUser.isPending && deleteUser.variables.userId === userId;

  return (
    <Modal>
      <ModalTrigger render={render} />
      <ModalContent>
        <ModalHeader>
          <ModalTitle>
            {t("users.user.delete.title", { name: user?.name })}
          </ModalTitle>
          <ModalDescription className="whitespace-pre-line">
            {t("users.user.delete.disclaimer")}
          </ModalDescription>
        </ModalHeader>
        <ModalFooter>
          <ModalClose
            render={<Button variant="outline">{t("cancel")}</Button>}
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
