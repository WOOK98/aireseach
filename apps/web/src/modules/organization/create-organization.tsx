import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";

import { createOrganizationSchema } from "@workspace/auth";
import { useTranslation } from "@workspace/i18n";
import { Button } from "@workspace/ui-web/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@workspace/ui-web/field";
import { Icons } from "@workspace/ui-web/icons";
import { Input } from "@workspace/ui-web/input";
import {
  Modal,
  ModalFooter,
  ModalContent,
  ModalHeader,
  ModalDescription,
  ModalTitle,
  ModalClose,
  ModalTrigger,
  ModalBody,
} from "@workspace/ui-web/modal";

import { pathsConfig } from "~/config/paths";

import { organization } from "./lib/api";

import type { CreateOrganizationPayload } from "@workspace/auth";

export const CreateOrganizationModal = ({
  open,
  onOpenChange,
  render,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  render?: React.ReactElement;
}) => {
  const { t } = useTranslation(["common", "organization"]);
  const router = useRouter();

  const form = useForm({
    resolver: standardSchemaResolver(createOrganizationSchema),
    defaultValues: {
      name: "",
    },
  });

  const getSlug = useMutation(organization.mutations.getSlug);
  const create = useMutation({
    ...organization.mutations.create,
    onSuccess: (_, variables) => {
      router.replace(pathsConfig.dashboard.organization(variables.slug).index);
    },
  });

  const createOrganization = async (data: CreateOrganizationPayload) => {
    const { slug } = await getSlug.mutateAsync({
      query: data,
    });

    await create.mutateAsync({
      ...data,
      slug,
    });
  };

  return (
    <Modal open={open} drawer={{ onOpenChange }} dialog={{ onOpenChange }}>
      {render && <ModalTrigger render={render} />}
      <ModalContent>
        <ModalHeader>
          <ModalTitle>{t("create.title")}</ModalTitle>
          <ModalDescription className="whitespace-pre-line">
            {t("create.description")}
          </ModalDescription>
        </ModalHeader>

        <ModalBody>
          <form
            id="create-organization-form"
            onSubmit={form.handleSubmit(createOrganization)}
          >
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="create-organization-name">
                    {t("common:name")}
                  </FieldLabel>
                  <Input
                    {...field}
                    id="create-organization-name"
                    aria-invalid={fieldState.invalid}
                    disabled={form.formState.isSubmitting}
                    required
                  />
                  <FieldDescription>{t("create.info")}</FieldDescription>
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
            form="create-organization-form"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? (
              <Icons.Loader2 className="animate-spin" />
            ) : (
              t("create.cta")
            )}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
