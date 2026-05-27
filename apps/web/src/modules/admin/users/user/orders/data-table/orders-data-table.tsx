"use client";

import { pickBy } from "@workspace/shared/utils";
import { DataTable } from "@workspace/ui-web/data-table/data-table";
import { DataTableSkeleton } from "@workspace/ui-web/data-table/data-table-skeleton";
import { DataTableToolbar } from "@workspace/ui-web/data-table/data-table-toolbar";

import { admin } from "~/modules/admin/lib/api";
import { useDataTable } from "~/modules/common/hooks/use-data-table";

import { useColumns } from "./columns";

interface OrdersDataTableProps {
  readonly userId: string;
}

export const OrdersDataTable = ({ userId }: OrdersDataTableProps) => {
  const columns = useColumns();

  const { table, query } = useDataTable({
    persistance: "local",
    columns,
    initialState: {
      sorting: [
        {
          id: "createdAt",
          desc: true,
        },
      ],
    },
    enableRowSelection: false,
    query: ({ page, perPage, sorting, filters }) =>
      admin.queries.users.getOrders({
        id: userId,
        page: page.toString(),
        perPage: perPage.toString(),
        sort: JSON.stringify(sorting),
        ...pickBy(filters, Boolean),
      }),
  });

  if (query.isLoading) {
    return (
      <DataTableSkeleton
        columnCount={4}
        filterCount={3}
        cellWidths={["20rem", "10rem", "7rem", "4rem"]}
        shrinkZero
        rowCount={3}
      />
    );
  }

  return (
    <div className="flex w-full flex-col gap-2">
      <DataTableToolbar table={table} />
      <DataTable table={table} />
    </div>
  );
};
