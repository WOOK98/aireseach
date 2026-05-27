"use client";

import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { updateOrganizationSchema } from "@workspace/auth";
import { useTranslation } from "@workspace/i18n";
import { useDebounceCallback } from "@workspace/shared/hooks";
import { Field, FieldError, FieldLabel } from "@workspace/ui-web/field";
import { Icons } from "@workspace/ui-web/icons";
import { Input } from "@workspace/ui-web/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@workspace/ui-web/input-group";

import {
  DetailsList,
  DetailsListItem,
} from "~/modules/admin/layout/details-list";
import { admin } from "~/modules/admin/lib/api";

import type { UpdateOrganizationPayload } from "@workspace/auth";

const Name = ({ id }: { id: string }) => {
  const { t } = useTranslation(["common", "admin"]);
  const queryClient = useQueryClient();
  const { data: organization } = useQuery(
    admin.queries.organizations.get({ id }),
  );

  const update = useMutation({
    ...admin.mutations.organizations.update,
    onSuccess: async () => {
      await queryClient.invalidateQueries(
        admin.queries.organizations.get({ id }),
      );
      toast.success(
        t("organizations.organization.details.name.update.success"),
      );
    },
  });

  const form = useForm({
    resolver: standardSchemaResolver(
      updateOrganizationSchema.pick({ name: true }),
    ),
    defaultValues: {
      name: organization?.name ?? "",
    },
  });

  const onSubmit = async (data: Pick<UpdateOrganizationPayload, "name">) => {
    await update.mutateAsync({ id, ...data });
  };

  const debouncedOnSubmit = useDebounceCallback(
    form.handleSubmit(onSubmit),
    2000,
    {
      trailing: true,
      leading: false,
    },
  );

  return (
    <form id="admin-organization-name-form">
      <Controller
        name="name"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <div className="flex items-center gap-1.5">
              <FieldLabel htmlFor="admin-organization-name">
                {t("name")}
              </FieldLabel>
              {form.formState.isSubmitting && (
                <Icons.Loader2 className="size-3 animate-spin" />
              )}
            </div>
            <Input
              {...field}
              id="admin-organization-name"
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

const Slug = ({ id }: { id: string }) => {
  const { t } = useTranslation(["common", "admin"]);
  const queryClient = useQueryClient();
  const { data: organization } = useQuery(
    admin.queries.organizations.get({ id }),
  );

  const update = useMutation({
    ...admin.mutations.organizations.update,
    onSuccess: async () => {
      await queryClient.invalidateQueries(
        admin.queries.organizations.get({ id }),
      );
      toast.success(
        t("organizations.organization.details.slug.update.success"),
      );
    },
  });

  const form = useForm({
    resolver: standardSchemaResolver(
      updateOrganizationSchema.pick({ slug: true }),
    ),
    defaultValues: {
      slug: organization?.slug ?? "",
    },
  });

  const onSubmit = async (data: Pick<UpdateOrganizationPayload, "slug">) => {
    await update.mutateAsync({ id, ...data });
  };

  const debouncedOnSubmit = useDebounceCallback(
    form.handleSubmit(onSubmit),
    2000,
    {
      trailing: true,
      leading: false,
    },
  );

  return (
    <form id="admin-organization-slug-form">
      <Controller
        name="slug"
        control={form.control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <div className="flex items-center gap-1.5">
              <FieldLabel htmlFor="admin-organization-slug">
                {t("slug")}
              </FieldLabel>
              {form.formState.isSubmitting && (
                <Icons.Loader2 className="size-3 animate-spin" />
              )}
            </div>
            <InputGroup>
              <InputGroupInput
                {...field}
                id="admin-organization-slug"
                aria-invalid={fieldState.invalid}
                className="peer ps-6"
                disabled={form.formState.isSubmitting}
                onChange={(e) => {
                  field.onChange(e.target.value);
                  void debouncedOnSubmit();
                }}
              />
              <InputGroupAddon className="text-muted-foreground/80 pointer-events-none pl-3 peer-disabled:opacity-50">
                /
              </InputGroupAddon>
            </InputGroup>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
    </form>
  );
};

interface OrganizationDetailsProps {
  readonly id: string;
}

export const OrganizationDetails = ({ id }: OrganizationDetailsProps) => {
  const { t, i18n } = useTranslation(["common", "admin"]);
  const { data: organization } = useQuery(
    admin.queries.organizations.get({ id }),
  );

  const details = [
    {
      id: "name",
      component: <Name id={id} />,
      visible: true,
    },
    {
      id: "slug",
      component: <Slug id={id} />,
      visible: true,
    },
    {
      id: "createdAt",
      component: (
        <div className="flex flex-col items-start gap-3">
          <span className="text-sm font-medium">{t("createdAt")}</span>
          <span>{organization?.createdAt.toLocaleString(i18n.language)}</span>
        </div>
      ),
      visible: true,
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
