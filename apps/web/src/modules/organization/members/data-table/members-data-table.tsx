"use client";

import { pickBy } from "@workspace/shared/utils";
import { DataTable } from "@workspace/ui-web/data-table/data-table";
import { DataTableSkeleton } from "@workspace/ui-web/data-table/data-table-skeleton";
import { DataTableToolbar } from "@workspace/ui-web/data-table/data-table-toolbar";

import { useDataTable } from "~/modules/common/hooks/use-data-table";
import { organization } from "~/modules/organization/lib/api";

import { useColumns } from "./columns";

interface MembersDataTableProps {
  readonly organizationId: string;
}

export const MembersDataTable = ({ organizationId }: MembersDataTableProps) => {
  const columns = useColumns();
  const { table, query } = useDataTable({
    persistance: "local",
    columns,
    initialState: {
      sorting: [
        {
          id: "user.name",
          desc: false,
        },
      ],
      columnVisibility: {
        q: false,
      },
    },
    enableRowSelection: false,
    query: ({ page, perPage, sorting, filters }) =>
      organization.queries.members.getAll({
        id: organizationId,
        page: page.toString(),
        perPage: perPage.toString(),
        sort: JSON.stringify(sorting),
        ...pickBy(filters, Boolean),
      }),
  });

  if (query.isLoading) {
    return (
      <DataTableSkeleton
        columnCount={5}
        filterCount={3}
        cellWidths={["20rem", "10rem", "7rem", "4rem", "2.5rem"]}
        shrinkZero
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
