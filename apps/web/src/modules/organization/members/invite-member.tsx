"use client";

import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import {
  getAllRolesAtOrBelow,
  inviteMemberSchema,
  MemberRole,
} from "@workspace/auth";
import { useTranslation } from "@workspace/i18n";
import { cn } from "@workspace/ui";
import { Button } from "@workspace/ui-web/button";
import { Field, FieldError, FieldLabel } from "@workspace/ui-web/field";
import { Icons } from "@workspace/ui-web/icons";
import { Input } from "@workspace/ui-web/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui-web/select";

import { authClient } from "~/lib/auth/client";
import {
  SettingsCard,
  SettingsCardDescription,
  SettingsCardContent,
  SettingsCardFooter,
  SettingsCardHeader,
  SettingsCardTitle,
} from "~/modules/common/layout/dashboard/settings-card";
import { useActiveOrganization } from "~/modules/organization/hooks/use-active-organization";
import { organization } from "~/modules/organization/lib/api";

interface InviteMemberProps {
  organizationId: string;
}

export const InviteMember = ({ organizationId }: InviteMemberProps) => {
  const { t } = useTranslation(["common", "organization"]);
  const queryClient = useQueryClient();
  const { activeMember } = useActiveOrganization();

  const schema = z.object({
    invites: z.array(inviteMemberSchema).min(1),
  });

  const form = useForm({
    resolver: standardSchemaResolver(schema),
    defaultValues: {
      invites: [{ email: "", role: MemberRole.MEMBER }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "invites",
  });

  const inviteMember = useMutation(organization.mutations.members.invite);

  const onSubmit = async (data: z.infer<typeof schema>) => {
    const results = await Promise.allSettled(
      data.invites.map((invite) =>
        inviteMember.mutateAsync({ ...invite, organizationId }),
      ),
    );

    const failedInvites = results
      .map((result, idx) =>
        result.status === "rejected" ? data.invites[idx] : null,
      )
      .filter(Boolean);

    const successCount = data.invites.length - failedInvites.length;
    if (successCount > 0) {
      toast.success(t("members.invite.success", { count: successCount }));
    }

    if (failedInvites.length > 0) {
      form.reset({ invites: failedInvites });
    } else {
      form.reset(undefined, { keepDefaultValues: true });
    }

    await queryClient.invalidateQueries(
      organization.queries.invitations.getAll({ id: organizationId }),
    );
  };

  const hasInvitePermission = authClient.organization.checkRolePermission({
    permissions: {
      invitation: ["create"],
    },
    role: activeMember?.role ?? MemberRole.MEMBER,
  });

  const roles = getAllRolesAtOrBelow(
    activeMember?.role ?? MemberRole.MEMBER,
  ).map((role) => ({
    value: role,
    label: t(role),
  }));

  return (
    <SettingsCard disabled={!hasInvitePermission}>
      <SettingsCardHeader>
        <SettingsCardTitle>{t("members.invite.title")}</SettingsCardTitle>
        <SettingsCardDescription>
          {t("members.invite.description")}
        </SettingsCardDescription>
      </SettingsCardHeader>

      <SettingsCardContent>
        <form id="invite-member-form" onSubmit={form.handleSubmit(onSubmit)}>
          {fields.map((field, index) => (
            <div key={field.id} className="my-2 flex w-full gap-2">
              <Controller
                name={`invites.${index}.email`}
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid} className="w-full">
                    <FieldLabel
                      htmlFor={`invite-member-email-${index}`}
                      className={cn({ "sr-only": index > 0 })}
                    >
                      {t("email")}
                    </FieldLabel>
                    <Input
                      {...field}
                      id={`invite-member-email-${index}`}
                      type="email"
                      placeholder="jane@example.com"
                      autoComplete="email"
                      inputMode="email"
                      spellCheck={false}
                      required
                      aria-invalid={fieldState.invalid}
                      disabled={
                        !hasInvitePermission || form.formState.isSubmitting
                      }
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                name={`invites.${index}.role`}
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid} className="w-full">
                    <FieldLabel
                      htmlFor={`invite-member-role-${index}`}
                      className={cn({ "sr-only": index > 0 })}
                    >
                      {t("role")}
                    </FieldLabel>
                    <div>
                      <Select
                        items={roles}
                        onValueChange={field.onChange}
                        value={field.value}
                        disabled={
                          !hasInvitePermission || form.formState.isSubmitting
                        }
                      >
                        <SelectTrigger
                          id={`invite-member-role-${index}`}
                          className="w-full"
                          aria-invalid={fieldState.invalid}
                        >
                          <SelectValue placeholder={t("member")} />
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
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              {fields.length > 1 && (
                <div
                  className={cn({
                    "translate-y-7": !index,
                  })}
                >
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="gap-2"
                    disabled={
                      !hasInvitePermission || form.formState.isSubmitting
                    }
                    onClick={() => remove(index)}
                  >
                    <Icons.Trash className="size-4" />
                    <span className="sr-only"> {t("remove")}</span>
                  </Button>
                </div>
              )}
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ email: "", role: MemberRole.MEMBER })}
            className="mt-2 w-fit gap-2"
            disabled={!hasInvitePermission || form.formState.isSubmitting}
          >
            <Icons.Plus className="size-4" /> {t("addMore")}
          </Button>
        </form>
      </SettingsCardContent>

      <SettingsCardFooter>
        {hasInvitePermission ? (
          <>
            {t("members.invite.info")}
            <Button
              type="submit"
              form="invite-member-form"
              disabled={form.formState.isSubmitting}
              size="sm"
            >
              {form.formState.isSubmitting ? (
                <Icons.Loader2 className="size-4 animate-spin" />
              ) : (
                t("invite")
              )}
            </Button>
          </>
        ) : (
          t("members.invite.missingPermission")
        )}
      </SettingsCardFooter>
    </SettingsCard>
  );
};
