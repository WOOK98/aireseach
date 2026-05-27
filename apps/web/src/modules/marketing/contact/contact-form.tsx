"use client";

import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { useTranslation } from "@workspace/i18n";
import { Button } from "@workspace/ui-web/button";
import { Card, CardContent } from "@workspace/ui-web/card";
import { Field, FieldLabel, FieldError } from "@workspace/ui-web/field";
import { Icons } from "@workspace/ui-web/icons";
import { Input } from "@workspace/ui-web/input";
import { Textarea } from "@workspace/ui-web/textarea";

import { sendContactForm } from "./actions";
import { contactFormSchema, MAX_MESSAGE_LENGTH } from "./utils/schema";

import type { ContactFormPayload } from "./utils/schema";

export function ContactForm() {
  const { t } = useTranslation(["common", "marketing"]);
  const form = useForm({
    resolver: standardSchemaResolver(contactFormSchema),
    defaultValues: {
      name: "",
      email: "",
      message: "",
    },
  });

  const onSubmit = async (data: ContactFormPayload) => {
    const { error } = await sendContactForm(data);

    if (error) {
      return toast.error(error);
    }

    toast.success(t("contact.form.success.title"), {
      description: t("contact.form.success.description"),
    });

    form.reset();
  };

  return (
    <Card className="w-full max-w-lg border-none bg-transparent shadow-none">
      <CardContent className="w-full p-0">
        <form
          id="contact-form"
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-6"
        >
          <Controller
            name="name"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="contact-form-name">{t("name")}</FieldLabel>
                <Input
                  {...field}
                  id="contact-form-name"
                  autoComplete="name"
                  spellCheck={false}
                  aria-invalid={fieldState.invalid}
                  placeholder={t("contact.form.name.placeholder")}
                  required
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Controller
            name="email"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="contact-form-email">
                  {t("email")}
                </FieldLabel>
                <Input
                  {...field}
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  spellCheck={false}
                  required
                  id="contact-form-email"
                  aria-invalid={fieldState.invalid}
                  placeholder={t("contact.form.email.placeholder")}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Controller
            name="message"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel
                  className="flex justify-between"
                  htmlFor="contact-form-message"
                >
                  <span>{t("message")}</span>
                  <span className="text-muted-foreground text-xs">
                    {field.value.length}/{MAX_MESSAGE_LENGTH}
                  </span>
                </FieldLabel>
                <Textarea
                  {...field}
                  id="contact-form-message"
                  aria-invalid={fieldState.invalid}
                  placeholder={t("contact.form.message.placeholder")}
                  maxLength={MAX_MESSAGE_LENGTH}
                  required
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Button
            type="submit"
            className="mt-2"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? (
              <Icons.Loader2 className="size-5 animate-spin" />
            ) : (
              t("contact.form.submit")
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
