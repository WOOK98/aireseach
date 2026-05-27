import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { passwordSchema } from "@workspace/auth";
import { useTranslation } from "@workspace/i18n";
import { Button } from "@workspace/ui-web/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@workspace/ui-web/field";
import { Icons } from "@workspace/ui-web/icons";
import { PasswordInput } from "@workspace/ui-web/input";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
  ModalClose,
  ModalTrigger,
  ModalBody,
} from "@workspace/ui-web/modal";

import { admin } from "~/modules/admin/lib/api";

interface SetPasswordModalProps {
  id: string;
  render?: React.ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const SetPasswordModal = ({
  id,
  render,
  open: _open,
  onOpenChange: _onOpenChange,
}: SetPasswordModalProps) => {
  const { t } = useTranslation(["common", "auth", "admin"]);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const controlled = _open !== undefined;
  const open = controlled ? _open : uncontrolledOpen;

  const { data: user } = useQuery(admin.queries.users.get({ id }));

  const form = useForm({
    resolver: standardSchemaResolver(passwordSchema),
    defaultValues: {
      password: "",
    },
  });

  const setPassword = useMutation({
    ...admin.mutations.users.setPassword,
    onSuccess: () => {
      toast.success(t("users.user.accounts.password.update.success"));
      onOpenChange(false);
      form.reset();
    },
  });

  const onOpenChange = (nextOpen: boolean) => {
    if (!controlled) {
      setUncontrolledOpen(nextOpen);
    }
    _onOpenChange?.(nextOpen);
  };

  return (
    <Modal open={open} drawer={{ onOpenChange }} dialog={{ onOpenChange }}>
      {render && <ModalTrigger render={render} />}
      <ModalContent>
        <ModalHeader>
          <ModalTitle>
            {t("users.user.accounts.password.update.title", {
              name: user?.name,
            })}
          </ModalTitle>
          <ModalDescription>
            {t("users.user.accounts.password.update.description")}
          </ModalDescription>
        </ModalHeader>

        <ModalBody>
          <form
            id="admin-set-password-form"
            onSubmit={form.handleSubmit((data) =>
              setPassword.mutateAsync({
                userId: id,
                newPassword: data.password,
              }),
            )}
            className="space-y-6"
          >
            <Controller
              name="password"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="admin-set-password">
                    {t("newPassword")}
                  </FieldLabel>
                  <PasswordInput
                    {...field}
                    id="admin-set-password"
                    autoComplete="new-password"
                    required
                    aria-invalid={fieldState.invalid}
                    disabled={form.formState.isSubmitting}
                  />
                  <FieldDescription>
                    {t("users.user.accounts.password.update.info")}
                  </FieldDescription>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </form>
        </ModalBody>

        <ModalFooter>
          <ModalClose
            render={
              <Button variant="outline" type="button">
                {t("cancel")}
              </Button>
            }
          />
          <Button
            type="submit"
            form="admin-set-password-form"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? (
              <Icons.Loader2 className="animate-spin" />
            ) : (
              t("update")
            )}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
