import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import {
  useMutation,
  useMutationState,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import dayjs from "dayjs";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { banUserSchema } from "@workspace/auth";
import { useTranslation } from "@workspace/i18n";
import { cn } from "@workspace/ui";
import { Button } from "@workspace/ui-web/button";
import { Calendar } from "@workspace/ui-web/calendar";
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
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
  ModalClose,
  ModalBody,
} from "@workspace/ui-web/modal";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui-web/popover";
import { ScrollArea, ScrollBar } from "@workspace/ui-web/scroll-area";
import { Textarea } from "@workspace/ui-web/textarea";

import { admin } from "~/modules/admin/lib/api";

import type { BanUserPayload } from "@workspace/auth";
import type { ComponentProps } from "react";

interface BanProps {
  readonly id: string;
}

export const Ban = ({ id }: BanProps) => {
  const { data: user } = useQuery(admin.queries.users.get({ id }));

  if (user?.banned) {
    return <Unban userId={id} />;
  }

  return <BanModal id={id} render={<BanTrigger userId={id} />} />;
};

const Unban = ({
  userId,
  ...props
}: ComponentProps<typeof Button> & { userId: string }) => {
  const { t } = useTranslation(["common", "admin"]);
  const queryClient = useQueryClient();

  const unban = useMutation({
    ...admin.mutations.users.unban,
    onSuccess: async () => {
      await queryClient.invalidateQueries(
        admin.queries.users.get({ id: userId }),
      );
      toast.success(t("users.user.unban.success"));
    },
  });

  const isPending = unban.isPending && unban.variables.userId === userId;

  return (
    <Button
      variant="outline"
      disabled={isPending}
      onClick={() => unban.mutate({ userId })}
      {...props}
    >
      {isPending ? <Icons.Loader2 className="animate-spin" /> : <Icons.Undo2 />}
      {t("unban")}
    </Button>
  );
};

const BanTrigger = ({
  userId,
  ...props
}: ComponentProps<typeof Button> & { userId: string }) => {
  const { t } = useTranslation("common");
  const [mutation] = useMutationState({
    filters: {
      mutationKey: admin.mutations.users.ban.mutationKey,
    },
    select: (mutation) => ({
      status: mutation.state.status,
      variables: mutation.state.variables as { userId: string },
    }),
  });

  const isPending =
    mutation?.status === "pending" && mutation.variables.userId === userId;

  return (
    <Button variant="outline" disabled={isPending} {...props}>
      {isPending ? <Icons.Loader2 className="animate-spin" /> : <Icons.Ban />}
      {t("ban")}
    </Button>
  );
};

const BanModal = ({
  id,
  render,
}: {
  id: string;
  render: React.ReactElement;
}) => {
  const { t, i18n } = useTranslation(["common", "admin"]);
  const { data: user } = useQuery(admin.queries.users.get({ id }));
  const queryClient = useQueryClient();

  const form = useForm({
    resolver: standardSchemaResolver(banUserSchema),
    defaultValues: {
      reason: "",
      expiresIn: undefined,
    },
  });

  const ban = useMutation({
    ...admin.mutations.users.ban,
    onSuccess: async () => {
      await queryClient.invalidateQueries(admin.queries.users.get({ id }));
      toast.success(t("users.user.ban.success"));
    },
  });

  const onSubmit = ({ expiresIn, reason }: BanUserPayload) => {
    ban.mutate({
      userId: id,
      banReason: reason,
      banExpiresIn: expiresIn
        ? Math.max(0, dayjs(expiresIn).diff(dayjs(), "second"))
        : undefined,
    });
  };

  const isPending = ban.isPending && ban.variables.userId === id;

  function handleDateSelect(date: Date | undefined) {
    if (date) {
      form.setValue("expiresIn", date, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }

  function handleTimeChange(type: "hour" | "minute" | "ampm", value: string) {
    const currentDate = form.getValues("expiresIn") ?? new Date();
    const newDate = new Date(currentDate);

    if (type === "hour") {
      const hour = parseInt(value, 10);
      newDate.setHours(newDate.getHours() >= 12 ? hour + 12 : hour);
    } else if (type === "minute") {
      newDate.setMinutes(parseInt(value, 10));
    } else {
      const hours = newDate.getHours();
      if (value === "AM" && hours >= 12) {
        newDate.setHours(hours - 12);
      } else if (value === "PM" && hours < 12) {
        newDate.setHours(hours + 12);
      }
    }

    form.setValue("expiresIn", newDate, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  return (
    <Modal>
      <ModalTrigger render={render} />
      <ModalContent>
        <ModalHeader>
          <ModalTitle>
            {t("ban")} {user?.name}
          </ModalTitle>
          <ModalDescription>{t("users.user.ban.description")}</ModalDescription>
        </ModalHeader>
        <ModalBody>
          <form
            id="ban-user-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <Controller
              name="reason"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <div className="flex justify-between">
                    <FieldLabel htmlFor="ban-reason">{t("reason")}</FieldLabel>
                    <span className="text-muted-foreground text-xs">
                      {field.value?.length ?? 0}/1000
                    </span>
                  </div>
                  <Textarea
                    {...field}
                    id="ban-reason"
                    aria-invalid={fieldState.invalid}
                    maxLength={1000}
                    disabled={form.formState.isSubmitting}
                  />
                  <FieldDescription>
                    {t("users.user.ban.form.reason.info")}
                  </FieldDescription>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="expiresIn"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="ban-expires-in">
                    {t("expiresIn")}
                  </FieldLabel>
                  <div>
                    <Popover>
                      <PopoverTrigger
                        render={
                          <Button
                            id="ban-expires-in"
                            type="button"
                            variant="outline"
                            disabled={form.formState.isSubmitting}
                            aria-invalid={fieldState.invalid}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground",
                            )}
                          >
                            {field.value
                              ? field.value.toLocaleString(i18n.language)
                              : t("never")}
                            <Icons.Calendar className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        }
                      />

                      <PopoverContent className="w-auto p-0">
                        <div className="sm:flex">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={(date) => {
                              handleDateSelect(date);
                              field.onChange(date);
                            }}
                            disabled={(date) =>
                              dayjs(date).isBefore(
                                dayjs().add(1, "day").startOf("day"),
                              )
                            }
                            captionLayout="dropdown"
                          />
                          <div className="flex flex-col divide-y sm:h-[300px] sm:flex-row sm:divide-x sm:divide-y-0">
                            <ScrollArea className="w-64 sm:w-auto">
                              <div className="flex p-2 sm:flex-col">
                                {Array.from({ length: 12 }, (_, i) => i + 1)
                                  .reverse()
                                  .map((hour) => (
                                    <Button
                                      key={hour}
                                      type="button"
                                      size="icon"
                                      disabled={form.formState.isSubmitting}
                                      variant={
                                        field.value &&
                                        field.value.getHours() % 12 ===
                                          hour % 12
                                          ? "default"
                                          : "ghost"
                                      }
                                      className="aspect-square shrink-0 sm:w-full"
                                      onClick={() =>
                                        handleTimeChange(
                                          "hour",
                                          hour.toString(),
                                        )
                                      }
                                    >
                                      {hour}
                                    </Button>
                                  ))}
                              </div>
                              <ScrollBar
                                orientation="horizontal"
                                className="sm:hidden"
                              />
                            </ScrollArea>
                            <ScrollArea className="w-64 sm:w-auto">
                              <div className="flex p-2 sm:flex-col">
                                {Array.from(
                                  { length: 12 },
                                  (_, i) => i * 5,
                                ).map((minute) => (
                                  <Button
                                    key={minute}
                                    size="icon"
                                    type="button"
                                    disabled={form.formState.isSubmitting}
                                    variant={
                                      field.value?.getMinutes() === minute
                                        ? "default"
                                        : "ghost"
                                    }
                                    className="aspect-square shrink-0 sm:w-full"
                                    onClick={() =>
                                      handleTimeChange(
                                        "minute",
                                        minute.toString(),
                                      )
                                    }
                                  >
                                    {minute.toString().padStart(2, "0")}
                                  </Button>
                                ))}
                              </div>
                              <ScrollBar
                                orientation="horizontal"
                                className="sm:hidden"
                              />
                            </ScrollArea>
                            <ScrollArea className="">
                              <div className="flex p-2 sm:flex-col">
                                {["AM", "PM"].map((ampm) => (
                                  <Button
                                    key={ampm}
                                    size="icon"
                                    type="button"
                                    disabled={form.formState.isSubmitting}
                                    variant={
                                      field.value &&
                                      ((ampm === "AM" &&
                                        field.value.getHours() < 12) ||
                                        (ampm === "PM" &&
                                          field.value.getHours() >= 12))
                                        ? "default"
                                        : "ghost"
                                    }
                                    className="aspect-square shrink-0 sm:w-full"
                                    onClick={() =>
                                      handleTimeChange("ampm", ampm)
                                    }
                                  >
                                    {ampm}
                                  </Button>
                                ))}
                              </div>
                            </ScrollArea>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <FieldDescription>
                    {t("users.user.ban.form.expiresIn.info")}
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
            render={<Button variant="outline">{t("cancel")}</Button>}
          />
          <Button type="submit" form="ban-user-form" disabled={isPending}>
            {isPending ? <Icons.Loader2 className="animate-spin" /> : t("ban")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
