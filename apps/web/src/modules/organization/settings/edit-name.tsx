"use client";

import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { MemberRole, updateOrganizationSchema } from "@workspace/auth";
import { useTranslation } from "@workspace/i18n";
import { Button } from "@workspace/ui-web/button";
import { Field, FieldError } from "@workspace/ui-web/field";
import { Icons } from "@workspace/ui-web/icons";
import { Input } from "@workspace/ui-web/input";

import { authClient } from "~/lib/auth/client";
import {
  SettingsCard,
  SettingsCardContent,
  SettingsCardDescription,
  SettingsCardFooter,
  SettingsCardHeader,
  SettingsCardTitle,
} from "~/modules/common/layout/dashboard/settings-card";
import { organization } from "~/modules/organization/lib/api";
import { onPromise } from "~/utils";

import { useActiveOrganization } from "../hooks/use-active-organization";

export const EditName = ({ organizationId }: { organizationId: string }) => {
  const { t } = useTranslation(["common", "organization"]);
  const { activeMember } = useActiveOrganization();

  const queryClient = useQueryClient();
  const { data: activeOrganization } = useQuery(
    organization.queries.get({ id: organizationId }),
  );

  const form = useForm({
    resolver: standardSchemaResolver(
      updateOrganizationSchema.pick({ name: true }),
    ),
    defaultValues: {
      name: activeOrganization?.name ?? "",
    },
  });

  const updateOrganization = useMutation({
    ...organization.mutations.update,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries(
          organization.queries.get({ id: organizationId }),
        ),
        ...(activeOrganization
          ? [
              queryClient.invalidateQueries(
                organization.queries.get({ slug: activeOrganization.slug }),
              ),
            ]
          : []),
      ]);
      toast.success(t("name.edit.success"));
    },
  });

  if (!activeOrganization) {
    return null;
  }

  const hasUpdatePermission = authClient.organization.checkRolePermission({
    permissions: {
      organization: ["update"],
    },
    role: activeMember?.role ?? MemberRole.MEMBER,
  });

  return (
    <SettingsCard disabled={!hasUpdatePermission}>
      <SettingsCardHeader>
        <SettingsCardTitle>{t("common:name")}</SettingsCardTitle>
        <SettingsCardDescription>
          {t("name.edit.description")}
        </SettingsCardDescription>
      </SettingsCardHeader>
      <SettingsCardContent>
        <form
          id="organization-edit-name-form"
          onSubmit={onPromise(
            form.handleSubmit((data) =>
              updateOrganization.mutateAsync({ data, organizationId }),
            ),
          )}
        >
          <Controller
            name="name"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <Input
                  {...field}
                  id="organization-edit-name"
                  spellCheck={false}
                  required
                  type="text"
                  minLength={2}
                  maxLength={32}
                  aria-invalid={fieldState.invalid}
                  disabled={!hasUpdatePermission || form.formState.isSubmitting}
                  className="max-w-xs"
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
        </form>
      </SettingsCardContent>

      <SettingsCardFooter>
        {hasUpdatePermission ? (
          <>
            {t("name.edit.info")}
            <Button
              form="organization-edit-name-form"
              type="submit"
              size="sm"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? (
                <Icons.Loader2 className="size-4 animate-spin" />
              ) : (
                t("common:save")
              )}
            </Button>
          </>
        ) : (
          t("name.edit.missingPermission")
        )}
      </SettingsCardFooter>
    </SettingsCard>
  );
};
