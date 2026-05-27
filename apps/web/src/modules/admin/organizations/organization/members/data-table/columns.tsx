"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { MemberRole } from "@workspace/auth";
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
import { admin } from "~/modules/admin/lib/api";
import { TurboLink } from "~/modules/common/turbo-link";

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

export const MemberActions = ({ member }: { member: Member }) => {
  const { t } = useTranslation(["common", "organization", "auth"]);
  const queryClient = useQueryClient();

  const UpdateMemberRole = useUpdateMemberRoleAction(member);

  const removeMember = useMutation({
    ...admin.mutations.organizations.members.remove,
    onSuccess: async () => {
      await queryClient.invalidateQueries(
        admin.queries.organizations.getMembers({
          id: member.organizationId,
        }),
      );
      await queryClient.invalidateQueries(
        admin.queries.users.getMemberships({
          id: member.userId,
        }),
      );
      toast.success(t("members.remove.success"));
    },
  });

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon">
              <span className="sr-only">{t("actions")}</span>
              <Icons.Ellipsis className="size-4" />
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-40">
          <UpdateMemberRole.Trigger key={`update-role-${member.id}`} />
          <DropdownMenuSeparator />
          {(() => {
            const isPending =
              removeMember.isPending &&
              removeMember.variables.memberId === member.id;

            return (
              <DropdownMenuItem
                variant="destructive"
                onClick={() =>
                  removeMember.mutate({
                    id: member.organizationId,
                    memberId: member.id,
                  })
                }
                disabled={isPending}
                key={`remove-${member.id}`}
              >
                {t("remove")}
                {isPending && (
                  <Icons.Loader2 className="ml-auto animate-spin text-current" />
                )}
              </DropdownMenuItem>
            );
          })()}
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
          <TurboLink
            href={pathsConfig.admin.users.user(row.original.userId)}
            className="group flex items-center gap-3"
          >
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
              <span className="group-hover:text-primary truncate font-medium underline underline-offset-4">
                {row.original.user.name}
              </span>
              {row.original.userId === session?.user.id && (
                <Badge variant="outline">{t("you")}</Badge>
              )}
            </div>
          </TurboLink>
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
          <MemberActions member={row.original} />
        </div>
      ),
      enableHiding: false,
    },
  ];
};
