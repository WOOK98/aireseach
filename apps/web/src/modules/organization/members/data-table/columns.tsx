"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import {
  getAllRolesAtOrBelow,
  MemberRole,
  toMemberRole,
} from "@workspace/auth";
import { useTranslation } from "@workspace/i18n";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui-web/avatar";
import { Badge } from "@workspace/ui-web/badge";
import { Button } from "@workspace/ui-web/button";
import { DataTableColumnHeader } from "@workspace/ui-web/data-table/data-table-column-header";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui-web/dropdown-menu";
import { Icons } from "@workspace/ui-web/icons";

import { pathsConfig } from "~/config/paths";
import { authClient } from "~/lib/auth/client";
import { organization } from "~/modules/organization/lib/api";

import { useActiveOrganization } from "../../hooks/use-active-organization";
import { UpdateMemberRoleModal } from "../update-member-role";

import type { ColumnDef } from "@tanstack/react-table";
import type { Member } from "@workspace/auth";

const useUpdateMemberRoleAction = (member: Member) => {
  const { t } = useTranslation("auth");
  const [open, setOpen] = useState(false);

  const Trigger = () => {
    return (
      <DropdownMenuItem closeOnClick={false} onClick={() => setOpen(true)}>
        {t("updateRole")}
      </DropdownMenuItem>
    );
  };

  const Modal = () => {
    return (
      <UpdateMemberRoleModal
        member={member}
        open={open}
        onOpenChange={setOpen}
      />
    );
  };

  return { Trigger, Modal };
};

const Actions = ({ member }: { member: Member }) => {
  const { t } = useTranslation(["common", "auth", "organization"]);
  const router = useRouter();
  const queryClient = useQueryClient();

  const UpdateMemberRole = useUpdateMemberRoleAction(member);

  const { data: session } = authClient.useSession();
  const { refetch } = authClient.useListOrganizations();
  const { activeMember } = useActiveOrganization();

  const me = member.userId === session?.user.id;

  const { data: canLeave } = useQuery({
    ...organization.queries.canLeave({
      id: member.organizationId,
    }),
    enabled: me && member.role === MemberRole.OWNER,
  });

  const hasDeletePermission =
    authClient.organization.checkRolePermission({
      permissions: {
        member: ["delete"],
      },
      role: toMemberRole(activeMember?.role),
    }) &&
    getAllRolesAtOrBelow(toMemberRole(activeMember?.role)).includes(
      member.role,
    ) &&
    (!me || member.role !== MemberRole.OWNER || canLeave?.allowed);

  const hasUpdatePermission =
    authClient.organization.checkRolePermission({
      permissions: {
        member: ["update"],
      },
      role: toMemberRole(activeMember?.role),
    }) &&
    getAllRolesAtOrBelow(toMemberRole(activeMember?.role)).includes(
      member.role,
    ) &&
    (!me || member.role !== MemberRole.OWNER || canLeave?.allowed);

  const removeMember = useMutation({
    ...organization.mutations.members.remove,
    onSuccess: async () => {
      await queryClient.invalidateQueries(
        organization.queries.members.getAll({
          id: member.organizationId,
        }),
      );
      toast.success(t("members.remove.success"));
    },
  });

  const leaveOrganization = useMutation({
    ...organization.mutations.leave,
    onSuccess: () => {
      void refetch();
      router.replace(pathsConfig.dashboard.user.index);
      toast.success(t("leave.success"));
    },
  });

  const groups = [
    hasUpdatePermission
      ? [<UpdateMemberRole.Trigger key={`update-role-${member.id}`} />]
      : null,
    [
      hasDeletePermission
        ? me
          ? (() => {
              const isPending =
                leaveOrganization.isPending &&
                leaveOrganization.variables.organizationId ===
                  member.organizationId;

              return (
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() =>
                    leaveOrganization.mutate({
                      organizationId: member.organizationId,
                    })
                  }
                  disabled={isPending}
                  key={`leave-${member.id}`}
                >
                  {t("common:leave")}
                  {isPending && (
                    <Icons.Loader2 className="ml-auto animate-spin text-current" />
                  )}
                </DropdownMenuItem>
              );
            })()
          : (() => {
              const isPending =
                removeMember.isPending &&
                removeMember.variables.memberIdOrEmail === member.id &&
                removeMember.variables.organizationId === member.organizationId;

              return (
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() =>
                    removeMember.mutate({
                      memberIdOrEmail: member.id,
                      organizationId: member.organizationId,
                    })
                  }
                  disabled={isPending}
                  key={`remove-${member.id}`}
                >
                  {t("common:remove")}
                  {isPending && (
                    <Icons.Loader2 className="ml-auto animate-spin text-current" />
                  )}
                </DropdownMenuItem>
              );
            })()
        : null,
    ],
  ].filter((group) => group?.filter(Boolean).length);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon" disabled={groups.length <= 0}>
              <Icons.Ellipsis className="size-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-40">
          {groups.flatMap((group, idx, array) =>
            idx < array.length - 1
              ? [group, <DropdownMenuSeparator key={`sep-${idx}`} />]
              : [group],
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <UpdateMemberRole.Modal />
    </>
  );
};

export const useColumns = (): ColumnDef<Member>[] => {
  const { t, i18n } = useTranslation("common");
  const { data: session } = authClient.useSession();

  return [
    {
      id: "q",
      accessorKey: "q",
      meta: {
        placeholder: `${t("search")}...`,
        variant: "text",
      },
      enableHiding: false,
      enableColumnFilter: true,
    },
    {
      id: "user.name",
      accessorKey: "user.name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("name")} />
      ),
      cell: ({ row }) => {
        return (
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage
                src={row.original.user.image ?? undefined}
                alt={row.original.user.name}
              />
              <AvatarFallback>
                <Icons.UserRound className="w-5" />
              </AvatarFallback>
            </Avatar>
            <div className="flex items-center gap-2">
              <span className="truncate font-medium">
                {row.original.user.name}
              </span>
              {row.original.userId === session?.user.id && (
                <Badge variant="outline">{t("you")}</Badge>
              )}
            </div>
          </div>
        );
      },
      enableHiding: false,
    },
    {
      id: "user.email",
      accessorKey: "user.email",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("email")} />
      ),
      meta: {
        label: t("email"),
      },
    },
    {
      id: "role",
      accessorKey: "role",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("role")} />
      ),
      cell: ({ row }) => {
        return <Badge variant="outline">{t(row.original.role)}</Badge>;
      },
      meta: {
        label: t("role"),
        variant: "multiSelect",
        options: Object.values(MemberRole).map((role) => ({
          label: t(role),
          value: role,
        })),
      },
      enableColumnFilter: true,
    },
    {
      id: "createdAt",
      accessorKey: "createdAt",
      header: ({ column }) => (
        <div className="ml-auto w-fit">
          <DataTableColumnHeader column={column} title={t("joinedAt")} />
        </div>
      ),
      cell: ({ row }) => {
        return (
          <div className="ml-auto text-right">
            {new Date(row.original.createdAt).toLocaleDateString(i18n.language)}
          </div>
        );
      },
      meta: {
        label: t("joinedAt"),
        variant: "dateRange",
      },
      enableColumnFilter: true,
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="ml-auto w-fit">
          <Actions member={row.original} />
        </div>
      ),
      enableHiding: false,
    },
  ];
};
