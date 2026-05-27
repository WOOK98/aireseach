import { findPlanByVariantId, SubscriptionStatus } from "@workspace/billing";
import { isKey, useTranslation } from "@workspace/i18n";
import { Badge } from "@workspace/ui-web/badge";
import { DataTableColumnHeader } from "@workspace/ui-web/data-table/data-table-column-header";

import type { ColumnDef } from "@tanstack/react-table";
import type { Subscription } from "@workspace/billing";

export const useColumns = (): ColumnDef<Subscription>[] => {
  const { t, i18n } = useTranslation(["common", "billing"]);

  return [
    {
      id: "externalId",
      accessorKey: "externalId",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("externalId")} />
      ),
      meta: {
        label: t("externalId"),
      },
    },
    {
      id: "plan",
      accessorKey: "plan",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("common:plan")} />
      ),
      cell: ({ row }) => {
        const { plan } = findPlanByVariantId(row.original.variantId);

        if (!plan) {
          return <span>-</span>;
        }

        return (
          <Badge variant="secondary">
            {isKey(plan.name, i18n, "billing") ? t(plan.name) : plan.name}
          </Badge>
        );
      },
      meta: {
        label: t("plan"),
      },
      enableSorting: false,
    },
    {
      id: "status",
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("common:status")} />
      ),
      cell: ({ row }) => {
        const statusKey = `subscription.status.${row.original.status.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())}`;

        return (
          <Badge variant="secondary">
            {isKey(statusKey, i18n, "billing") ? t(statusKey) : statusKey}
          </Badge>
        );
      },
      meta: {
        label: t("common:status"),
        variant: "multiSelect",
        options: Object.values(SubscriptionStatus).map((status) => {
          const statusKey = `subscription.status.${status.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())}`;
          return {
            label: isKey(statusKey, i18n, "billing") ? t(statusKey) : statusKey,
            value: status,
          };
        }),
      },
      enableColumnFilter: true,
    },
    {
      id: "store",
      accessorKey: "store",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={t("store")} />
      ),
      cell: ({ row }) => (
        <code className="bg-muted text-muted-foreground rounded-md px-2 py-1 text-xs">
          {row.original.store}
        </code>
      ),
      meta: {
        label: t("store"),
      },
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
