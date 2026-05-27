"use client";

import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { updateUserSchema, UserRole } from "@workspace/auth";
import { useTranslation } from "@workspace/i18n";
import { useDebounceCallback } from "@workspace/shared/hooks";
import { Field, FieldError, FieldLabel } from "@workspace/ui-web/field";
import { Icons } from "@workspace/ui-web/icons";
import { Input } from "@workspace/ui-web/input";
import {
  Select,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "@workspace/ui-web/select";

import {
  DetailsList,
  DetailsListItem,
} from "~/modules/admin/layout/details-list";
import { admin } from "~/modules/admin/lib/api";

const Role = ({ id }: { id: string }) => {
  const { t } = useTranslation(["common", "admin"]);

  const queryClient = useQueryClient();
  const { data: user } = useQuery(admin.queries.users.get({ id }));

  const form = useForm({
    resolver: standardSchemaResolver(updateUserSchema.pick({ role: true })),
    defaultValues: {
      role: user?.role as UserRole,
    },
  });

  const updateUser = useMutation({
    ...admin.mutations.users.update,
    onSuccess: async () => {
      await queryClient.invalidateQueries(admin.queries.users.get({ id }));
      toast.success(t("users.user.details.role.update.success"));
    },
  });

  const roles = Object.values(UserRole).map((role) => ({
    value: role,
    label: t(role),
  }));

  return (
    <form id="admin-user-role-form">
      <Controller
        name="role"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <div className="flex items-center gap-1.5">
              <FieldLabel htmlFor="admin-user-role">{t("role")}</FieldLabel>
              {form.formState.isSubmitting && (
                <Icons.Loader2 className="size-3 animate-spin" />
              )}
            </div>
            <div>
              <Select
                items={roles}
                value={field.value}
                onValueChange={(value) => {
                  field.onChange(value);
                  void form.handleSubmit((data) =>
                    updateUser.mutateAsync({
                      data,
                      userId: id,
                    }),
                  )();
                }}
                disabled={form.formState.isSubmitting}
              >
                <SelectTrigger
                  id="admin-user-role"
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
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
    </form>
  );
};

const Name = ({ id }: { id: string }) => {
  const { t } = useTranslation(["common", "admin"]);
  const queryClient = useQueryClient();
  const { data: user } = useQuery(admin.queries.users.get({ id }));

  const form = useForm({
    resolver: standardSchemaResolver(updateUserSchema.pick({ name: true })),
    defaultValues: {
      name: user?.name,
    },
  });

  const updateUser = useMutation({
    ...admin.mutations.users.update,
    onSuccess: async () => {
      await queryClient.invalidateQueries(admin.queries.users.get({ id }));
      toast.success(t("users.user.details.name.update.success"));
    },
  });

  const debouncedOnSubmit = useDebounceCallback(
    form.handleSubmit((data) =>
      updateUser.mutateAsync({
        data,
        userId: id,
      }),
    ),
    2000,
    {
      trailing: true,
      leading: false,
    },
  );

  return (
    <form id="admin-user-name-form">
      <Controller
        name="name"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <div className="flex items-center gap-1.5">
              <FieldLabel htmlFor="admin-user-name">{t("name")}</FieldLabel>
              {form.formState.isSubmitting && (
                <Icons.Loader2 className="size-3 animate-spin" />
              )}
            </div>
            <Input
              {...field}
              id="admin-user-name"
              aria-invalid={fieldState.invalid}
              disabled={form.formState.isSubmitting}
              onChange={(e) => {
                field.onChange(e.target.value);
                void debouncedOnSubmit();
              }}
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
    </form>
  );
};

interface UserDetailsProps {
  readonly id: string;
}

export const UserDetails = ({ id }: UserDetailsProps) => {
  const { t, i18n } = useTranslation(["common", "auth"]);
  const { data: user } = useQuery(admin.queries.users.get({ id }));

  const details = [
    {
      id: "name",
      component: <Name id={id} />,
      visible: true,
    },
    {
      id: "role",
      component: <Role id={id} />,
      visible: true,
    },
    {
      id: "twoFactorEnabled",
      component: (
        <div className="flex flex-col items-start gap-3">
          <span className="text-sm font-medium">{t("two-factor")}</span>
          <span>{user?.twoFactorEnabled ? t("enabled") : t("disabled")}</span>
        </div>
      ),
      visible: true,
    },
    {
      id: "createdAt",
      component: (
        <div className="flex flex-col items-start gap-3">
          <span className="text-sm font-medium">{t("createdAt")}</span>
          <span>{user?.createdAt.toLocaleString(i18n.language)}</span>
        </div>
      ),
      visible: true,
    },
    {
      id: "updatedAt",
      component: (
        <div className="flex flex-col items-start gap-3">
          <span className="text-sm font-medium">{t("updatedAt")}</span>
          <span>{user?.updatedAt.toLocaleString(i18n.language)}</span>
        </div>
      ),
      visible: true,
    },
    {
      id: "banExpires",
      component: (
        <div className="flex flex-col items-start gap-3">
          <span className="text-sm font-medium">{t("banExpiresIn")}</span>
          {user?.banExpires ? (
            <span>{user.banExpires.toLocaleString(i18n.language)}</span>
          ) : (
            <span>{t("never")}</span>
          )}
        </div>
      ),
      visible: !!user?.banned,
    },
    {
      id: "banReason",
      component: (
        <div className="flex flex-col items-start gap-3">
          <span className="text-sm font-medium">{t("banReason")}</span>
          <p>{user?.banReason}</p>
        </div>
      ),
      visible: !!user?.banned,
    },
  ];

  return (
    <section className="@container/details w-full overflow-hidden">
      <DetailsList>
        {details
          .filter((detail) => detail.visible)
          .map((detail) => (
            <DetailsListItem key={detail.id}>
              {detail.component}
            </DetailsListItem>
          ))}
      </DetailsList>
    </section>
  );
};
