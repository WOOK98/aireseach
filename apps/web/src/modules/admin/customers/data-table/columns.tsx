import { useTranslation } from "@workspace/i18n";
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui-web/avatar";
import { Badge } from "@workspace/ui-web/badge";
import { DataTableColumnHeader } from "@workspace/ui-web/data-table/data-table-column-header";
import { Icons } from "@workspace/ui-web/icons";

import { pathsConfig } from "~/config/paths";
import { authClient } from "~/lib/auth/client";
import { TurboLink } from "~/modules/common/turbo-link";

import type { ColumnDef } from "@tanstack/react-table";
import type { GetCustomersResponse } from "@workspace/api/schema";
import type { User } from "@workspace/auth";
import type { Organization } from "@workspace/auth";

type CustomerRow = GetCustomersResponse["data"][number] & {
  user: Pick<User, "name" | "image"> | null;
  organization: Pick<Organization, "name" | "logo"> | null;
};

export const useColumns = (options?: {
  max?: { subscriptions: number; orders: number };
  options?: { provider: string[] };
}): ColumnDef<CustomerRow>[] => {
  const { t, i18n } = useTranslation(["common", "billing"]);
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
      id: "name",
      accessorFn: (row) => row.user?.name ?? row.organization?.name ?? "-",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("name")} />
      ),
      cell: ({ row }) => {
        const reference = row.original.user ?? row.original.organization;
        const href = row.original.user
          ? pathsConfig.admin.users.user(row.original.referenceId)
          : pathsConfig.admin.organizations.organization(
              row.original.referenceId,
            );

        if (!reference) {
          return <span>-</span>;
        }

        return (
          <TurboLink href={href} className="group flex items-center gap-3">
            <Avatar>
              <AvatarImage
                src={
                  row.original.user?.image ??
                  row.original.organization?.logo ??
                  undefined
                }
                alt={reference.name}
              />
              <AvatarFallback>
                {row.original.user ? (
                  <Icons.UserRound className="w-5" />
                ) : (
                  <Icons.Building className="w-5" />
                )}
              </AvatarFallback>
            </Avatar>
            <div className="flex items-center gap-2">
              <span className="group-hover:text-primary truncate font-medium underline underline-offset-4">
                {reference.name}
              </span>
              {row.original.user &&
                row.original.referenceId === session?.user.id && (
                  <Badge variant="outline">{t("you")}</Badge>
                )}
            </div>
          </TurboLink>
        );
      },
      enableHiding: false,
    },
    {
      id: "externalId",
      accessorKey: "externalId",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("id")} />
      ),
      meta: {
        label: t("id"),
      },
    },
    {
      id: "provider",
      accessorKey: "provider",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("provider")} />
      ),
      cell: ({ row }) => (
        <code className="bg-muted text-muted-foreground rounded-md px-2 py-1 text-xs">
          {row.original.provider}
        </code>
      ),
      meta: {
        label: t("provider"),
        variant: "multiSelect",
        options: options?.options?.provider.map((provider) => ({
          label: provider,
          value: provider,
        })),
      },
      enableColumnFilter: true,
    },
    {
      id: "subscriptions",
      accessorKey: "subscriptions",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("subscriptions")} />
      ),
      meta: {
        label: t("subscriptions"),
        range: [0, options?.max?.subscriptions ?? 10],
        variant: "range",
      },
      enableColumnFilter: true,
    },
    {
      id: "orders",
      accessorKey: "orders",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("orders")} />
      ),
      meta: {
        label: t("orders"),
        range: [0, options?.max?.orders ?? 10],
        variant: "range",
      },
      enableColumnFilter: true,
    },
    {
      id: "createdAt",
      accessorKey: "createdAt",
      header: ({ column }) => (
        <div className="ml-auto w-fit">
          <DataTableColumnHeader column={column} title={t("createdAt")} />
        </div>
      ),
      cell: ({ row }) => {
        return (
          <div className="ml-auto text-right">
            {row.original.createdAt.toLocaleDateString(i18n.language)}
          </div>
        );
      },
      meta: {
        label: t("createdAt"),
        variant: "dateRange",
      },
      enableColumnFilter: true,
    },
  ];
};
