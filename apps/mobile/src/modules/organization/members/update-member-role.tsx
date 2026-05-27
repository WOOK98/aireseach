import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { Alert, View } from "react-native";

import {
  getAllRolesAtOrBelow,
  MemberRole,
  toMemberRole,
  updateMemberSchema,
} from "@workspace/auth";
import { useTranslation } from "@workspace/i18n";
import {
  BottomSheet,
  BottomSheetCloseTrigger,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetOpenTrigger,
  BottomSheetTitle,
  BottomSheetDescription,
  useBottomSheet,
  BottomSheetView,
} from "@workspace/ui-mobile/bottom-sheet";
import { Button } from "@workspace/ui-mobile/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@workspace/ui-mobile/field";
import { Icons } from "@workspace/ui-mobile/icons";
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

import type { Member, UpdateMemberPayload } from "@workspace/auth";
import type { BottomSheetContentRef } from "@workspace/ui-mobile/bottom-sheet";

interface UpdateMemberRoleBottomSheetProps {
  readonly member: Member;
  readonly ref?: React.RefObject<BottomSheetContentRef | null>;
  readonly children?: React.ReactNode;
}

export const UpdateMemberRoleBottomSheet = ({
  member,
  ref,
  children,
}: UpdateMemberRoleBottomSheetProps) => {
  const { t } = useTranslation(["common", "organization"]);
  const queryClient = useQueryClient();
  const activeMember = authClient.useActiveMember();

  const sheet = useBottomSheet();

  const form = useForm<Pick<UpdateMemberPayload, "role">>({
    resolver: standardSchemaResolver(updateMemberSchema.pick({ role: true })),
    defaultValues: {
      role: member.role,
    },
  });

  const updateMemberRole = useMutation({
    ...organization.mutations.members.updateRole,
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries(
        organization.queries.members.getAll({
          id: member.organizationId,
        }),
      );
      Alert.alert(t("members.update.role.success"));
      ref?.current?.dismiss();
      sheet.close();
      form.reset({ role: toMemberRole(variables.role) });
    },
  });

  const onSubmit = async (data: Pick<UpdateMemberPayload, "role">) => {
    await updateMemberRole.mutateAsync({
      memberId: member.id,
      role: data.role ?? MemberRole.MEMBER,
    });
  };

  const availableRoles = getAllRolesAtOrBelow(
    toMemberRole(activeMember.data?.role),
  );

  return (
    <BottomSheet>
      {children && (
        <BottomSheetOpenTrigger asChild>{children}</BottomSheetOpenTrigger>
      )}

      <BottomSheetContent
        ref={ref ?? sheet.ref}
        name={`update-member-role-${member.id}`}
      >
        <BottomSheetView>
          <BottomSheetHeader>
            <BottomSheetTitle>
              {t("members.update.role.title", {
                name: member.user.name,
              })}
            </BottomSheetTitle>
            <BottomSheetDescription>
              {t("members.update.role.description")}
            </BottomSheetDescription>
          </BottomSheetHeader>

          <View className="gap-4">
            <Controller
              control={form.control}
              name="role"
              render={({ field, fieldState }) => (
                <Field invalid={fieldState.invalid}>
                  <FieldLabel>{t("role")}</FieldLabel>
                  <Select
                    value={{
                      value: field.value ?? MemberRole.MEMBER,
                      label: t(field.value ?? MemberRole.MEMBER),
                    }}
                    onValueChange={(option) =>
                      field.onChange(option?.value ?? MemberRole.MEMBER)
                    }
                    disabled={form.formState.isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("role")} />
                    </SelectTrigger>
                    <SelectContent sideOffset={4} style={{ width: WIDTH - 48 }}>
                      {availableRoles.map((role) => (
                        <SelectItem key={role} value={role} label={t(role)}>
                          <Text>{t(role)}</Text>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                  <FieldDescription>
                    {t("members.update.role.info")}
                  </FieldDescription>
                </Field>
              )}
            />

            <View className="gap-2">
              <BottomSheetCloseTrigger asChild>
                <Button
                  variant="outline"
                  disabled={form.formState.isSubmitting}
                >
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
                  <Text>{t("update")}</Text>
                )}
              </Button>
            </View>
          </View>
        </BottomSheetView>
      </BottomSheetContent>
    </BottomSheet>
  );
};
