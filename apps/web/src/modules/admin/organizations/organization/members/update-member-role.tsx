"use client";

import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { MemberRole, updateMemberSchema } from "@workspace/auth";
import { useTranslation } from "@workspace/i18n";
import { Button } from "@workspace/ui-web/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@workspace/ui-web/field";
import { Icons } from "@workspace/ui-web/icons";
import {
  Modal,
  ModalTrigger,
  ModalTitle,
  ModalHeader,
  ModalContent,
  ModalDescription,
  ModalClose,
  ModalFooter,
  ModalBody,
} from "@workspace/ui-web/modal";
import {
  Select,
  SelectItem,
  SelectValue,
  SelectContent,
  SelectTrigger,
} from "@workspace/ui-web/select";

import { admin } from "~/modules/admin/lib/api";

import type { Member, UpdateMemberPayload } from "@workspace/auth";

interface UpdateMemberRoleModalProps {
  readonly member: Member;
  readonly render?: React.ReactElement;
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
}

export const UpdateMemberRoleModal = ({
  member,
  render,
  open: _open,
  onOpenChange: _onOpenChange,
}: UpdateMemberRoleModalProps) => {
  const { t } = useTranslation(["common", "admin", "organization"]);
  const queryClient = useQueryClient();
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const controlled = _open !== undefined;
  const open = controlled ? _open : uncontrolledOpen;

  const onOpenChange = (nextOpen: boolean) => {
    if (!controlled) {
      setUncontrolledOpen(nextOpen);
    }
    _onOpenChange?.(nextOpen);
  };

  const updateMember = useMutation({
    ...admin.mutations.organizations.members.update,
    onSuccess: async () => {
      await queryClient.invalidateQueries(
        admin.queries.organizations.getMembers({
          id: member.organizationId,
        }),
      );
      await queryClient.invalidateQueries(
        admin.queries.users.getMemberships({
          id: member.userId,
        }),
      );
      toast.success(t("members.update.role.success"));
      onOpenChange(false);
      form.reset();
    },
  });

  const form = useForm({
    resolver: standardSchemaResolver(updateMemberSchema.pick({ role: true })),
    defaultValues: {
      role: member.role,
    },
  });

  const onSubmit = async (data: Pick<UpdateMemberPayload, "role">) => {
    await updateMember.mutateAsync({
      id: member.organizationId,
      memberId: member.id,
      ...data,
    });
  };

  const roles = Object.values(MemberRole).map((role) => ({
    value: role,
    label: t(role),
  }));

  return (
    <Modal open={open} drawer={{ onOpenChange }} dialog={{ onOpenChange }}>
      {render && <ModalTrigger render={render} />}
      <ModalContent>
        <ModalHeader>
          <ModalTitle>
            {t("members.update.role.title", {
              name: member.user.name,
            })}
          </ModalTitle>
          <ModalDescription>
            {t("members.update.role.description")}
          </ModalDescription>
        </ModalHeader>

        <ModalBody>
          <form
            id="admin-update-member-role-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6"
          >
            <Controller
              name="role"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="admin-update-member-role">
                    {t("role")}
                  </FieldLabel>
                  <div>
                    <Select
                      items={roles}
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={form.formState.isSubmitting}
                    >
                      <SelectTrigger
                        id="admin-update-member-role"
                        className="w-full"
                        aria-invalid={fieldState.invalid}
                      >
                        <SelectValue placeholder={t("role")} />
                      </SelectTrigger>
                      <SelectContent>
                        {roles.map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <FieldDescription>
                    {t("members.update.role.info")}
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
            form="admin-update-member-role-form"
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
