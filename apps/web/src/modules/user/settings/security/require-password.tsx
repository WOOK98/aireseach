"use client";

import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { memo, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { passwordSchema } from "@workspace/auth";
import { useTranslation } from "@workspace/i18n";
import { Button } from "@workspace/ui-web/button";
import { Field, FieldError, FieldLabel } from "@workspace/ui-web/field";
import { Icons } from "@workspace/ui-web/icons";
import { PasswordInput } from "@workspace/ui-web/input";
import {
  Modal,
  ModalBody,
  ModalClose,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ModalTrigger,
} from "@workspace/ui-web/modal";

import { onPromise } from "~/utils";

import type { PasswordPayload } from "@workspace/auth";
import type { ComponentProps } from "react";

interface RequirePasswordProps extends ComponentProps<typeof Modal> {
  readonly title?: string;
  readonly description?: string;
  readonly cta?: string;
  readonly nativeButton?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  readonly onConfirm: (data: PasswordPayload) => Promise<void>;
}

export const RequirePassword = memo<RequirePasswordProps>(
  ({
    title,
    description,
    onConfirm,
    cta,
    render,
    open: _open,
    onOpenChange: _onOpenChange,
    nativeButton,
    ...props
  }) => {
    const { t } = useTranslation(["common", "auth"]);
    const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
    const controlled = _open !== undefined;
    const open = controlled ? _open : uncontrolledOpen;

    const form = useForm({
      resolver: standardSchemaResolver(passwordSchema),
      defaultValues: {
        password: "",
      },
    });

    const onSubmit = async (data: PasswordPayload) => {
      try {
        if (document.activeElement && "blur" in document.activeElement) {
          (document.activeElement as HTMLElement).blur();
        }
        await onConfirm(data);
        form.reset();
        onOpenChange(false);
      } catch (error) {
        setTimeout(() => form.setFocus("password"), 0);
        throw error;
      }
    };

    const onOpenChange = (nextOpen: boolean) => {
      if (!controlled) {
        setUncontrolledOpen(nextOpen);
      }
      _onOpenChange?.(nextOpen);
    };

    return (
      <Modal
        {...props}
        open={open}
        drawer={{ onOpenChange }}
        dialog={{ onOpenChange }}
      >
        <ModalTrigger dialog={{ nativeButton }} render={render} />
        <ModalContent>
          <ModalHeader>
            <ModalTitle>
              {title ?? t("account.password.require.title")}
            </ModalTitle>
            <ModalDescription className="whitespace-pre-line">
              {description ?? t("account.password.require.description")}
            </ModalDescription>
          </ModalHeader>

          <ModalBody>
            <form
              id="require-password-form"
              onSubmit={onPromise(form.handleSubmit(onSubmit))}
              className="space-y-4"
            >
              <Controller
                name="password"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="require-password-password">
                      {t("password")}
                    </FieldLabel>
                    <PasswordInput
                      {...field}
                      id="require-password-password"
                      autoComplete="current-password"
                      required
                      aria-invalid={fieldState.invalid}
                      disabled={form.formState.isSubmitting}
                    />
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
              render={<Button variant="outline">{t("cancel")}</Button>}
            />
            <Button
              type="submit"
              form="require-password-form"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? (
                <Icons.Loader2 className="size-4 animate-spin" />
              ) : (
                (cta ?? t("continue"))
              )}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    );
  },
);

RequirePassword.displayName = "RequirePassword";
