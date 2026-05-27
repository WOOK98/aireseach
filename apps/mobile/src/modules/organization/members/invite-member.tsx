import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useMutation } from "@tanstack/react-query";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { Alert, View } from "react-native";
import * as z from "zod";

import { inviteMemberSchema, MemberRole, toMemberRole } from "@workspace/auth";
import { useTranslation } from "@workspace/i18n";
import {
  BottomSheet,
  BottomSheetCloseTrigger,
  BottomSheetContent,
  BottomSheetOpenTrigger,
  BottomSheetTitle,
  BottomSheetDescription,
  BottomSheetHeader,
  useBottomSheet,
  BottomSheetScrollView,
} from "@workspace/ui-mobile/bottom-sheet";
import { Button } from "@workspace/ui-mobile/button";
import { Field, FieldError, FieldLabel } from "@workspace/ui-mobile/field";
import { Icons } from "@workspace/ui-mobile/icons";
import { Input } from "@workspace/ui-mobile/input";
import {
  SelectContent,
  SelectItem,
  Select,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui-mobile/select";
import { Spin } from "@workspace/ui-mobile/spin";
import { Text } from "@workspace/ui-mobile/text";

import { authClient } from "~/lib/auth";
import { organization } from "~/modules/organization/lib/api";
import { WIDTH } from "~/utils/device";

export const InviteMemberBottomSheet = ({
  children,
}: {
  children?: React.ReactNode;
}) => {
  const { t } = useTranslation(["common", "organization"]);

  const activeOrganization = authClient.useActiveOrganization();
  const activeMember = authClient.useActiveMember();

  const { ref, close } = useBottomSheet();

  const schema = z.object({
    invites: z.array(inviteMemberSchema).min(1),
  });

  const form = useForm<z.infer<typeof schema>>({
    resolver: standardSchemaResolver(schema),
    defaultValues: {
      invites: [{ email: "", role: MemberRole.MEMBER }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "invites",
  });

  const hasInvitePermission = authClient.organization.checkRolePermission({
    permissions: {
      invitation: ["create"],
    },
    role: toMemberRole(activeMember.data?.role),
  });

  const inviteMember = useMutation(organization.mutations.members.invite);

  const onSubmit = async (data: z.infer<typeof schema>) => {
    const organizationId = activeOrganization.data?.id;
    if (!organizationId) {
      return;
    }

    const results = await Promise.allSettled(
      data.invites.map((invite) =>
        inviteMember.mutateAsync({ ...invite, organizationId }),
      ),
    );

    const failedInvites = results
      .map((result, idx) =>
        result.status === "rejected" ? data.invites[idx] : null,
      )
      .filter((val): val is z.infer<typeof inviteMemberSchema> => Boolean(val));

    const successCount = data.invites.length - failedInvites.length;
    if (successCount > 0) {
      Alert.alert(t("members.invite.success", { count: successCount }));
      close();
    }

    if (failedInvites.length > 0) {
      form.reset({ invites: failedInvites });
    } else {
      form.reset(undefined, { keepDefaultValues: true });
    }
  };

  return (
    <BottomSheet>
      {children && (
        <BottomSheetOpenTrigger asChild>{children}</BottomSheetOpenTrigger>
      )}

      <BottomSheetContent ref={ref} name="invite-member">
        <BottomSheetScrollView>
          <BottomSheetHeader>
            <BottomSheetTitle>{t("members.invite.title")}</BottomSheetTitle>
            <BottomSheetDescription>
              {t("members.invite.description")}
            </BottomSheetDescription>
          </BottomSheetHeader>

          <View className="gap-3">
            {fields.map((field, index) => (
              <View key={field.id} className="gap-3">
                <Controller
                  control={form.control}
                  name={`invites.${index}.email`}
                  render={({ field, fieldState }) => (
                    <Field invalid={fieldState.invalid}>
                      <FieldLabel>{t("email")}</FieldLabel>
                      <Input
                        {...field}
                        inputMode="email"
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoFocus={index === 0}
                        placeholder="jane@example.com"
                        onChangeText={field.onChange}
                        editable={
                          hasInvitePermission && !form.formState.isSubmitting
                        }
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />

                <Controller
                  control={form.control}
                  name={`invites.${index}.role`}
                  render={({ field, fieldState }) => (
                    <Field invalid={fieldState.invalid}>
                      <FieldLabel>{t("role")}</FieldLabel>
                      <Select
                        value={{
                          value: field.value,
                          label: t(field.value),
                        }}
                        onValueChange={(option) =>
                          field.onChange(option?.value ?? MemberRole.MEMBER)
                        }
                        disabled={
                          !hasInvitePermission || form.formState.isSubmitting
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t("member")} />
                        </SelectTrigger>
                        <SelectContent
                          sideOffset={4}
                          style={{ width: WIDTH - 48 }}
                        >
                          {[MemberRole.ADMIN, MemberRole.MEMBER].map((role) => (
                            <SelectItem key={role} value={role} label={t(role)}>
                              <Text>{t(role)}</Text>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />

                {fields.length > 1 && (
                  <View>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={
                        !hasInvitePermission || form.formState.isSubmitting
                      }
                      onPress={() => remove(index)}
                    >
                      <Icons.Trash size={14} className="text-foreground" />
                      <Text>{t("remove")}</Text>
                    </Button>
                  </View>
                )}
              </View>
            ))}

            <Button
              variant="outline"
              size="sm"
              onPress={() => append({ email: "", role: MemberRole.MEMBER })}
              disabled={!hasInvitePermission || form.formState.isSubmitting}
            >
              <Icons.Plus size={16} className="text-foreground" />
              <Text>{t("addMore")}</Text>
            </Button>
          </View>

          <View className="gap-2">
            <BottomSheetCloseTrigger asChild>
              <Button variant="outline">
                <Text>{t("cancel")}</Text>
              </Button>
            </BottomSheetCloseTrigger>
            <Button
              onPress={form.handleSubmit(onSubmit)}
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? (
                <Spin>
                  <Icons.Loader2
                    size={16}
                    className="text-primary-foreground"
                  />
                </Spin>
              ) : (
                <Text>{t("invite")}</Text>
              )}
            </Button>
          </View>
        </BottomSheetScrollView>
      </BottomSheetContent>
    </BottomSheet>
  );
};
