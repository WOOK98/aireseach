import { parseAsArrayOf, parseAsInteger, parseAsString } from "nuqs/server";
import { createSearchParamsCache } from "nuqs/server";
import { Suspense } from "react";

import { getCustomersResponseSchema } from "@workspace/api/schema";
import { handle } from "@workspace/api/utils";
import { pickBy } from "@workspace/shared/utils";
import { DataTableSkeleton } from "@workspace/ui-web/data-table/data-table-skeleton";

import { api } from "~/lib/api/server";
import { getMetadata } from "~/lib/metadata";
import { CustomersDataTable } from "~/modules/admin/customers/data-table/customers-data-table";
import { getSortingStateParser } from "~/modules/common/hooks/use-data-table/common";

export const generateMetadata = getMetadata({
  title: "admin:customers.header.title",
  description: "admin:customers.header.description",
});

const searchParamsCache = createSearchParamsCache({
  page: parseAsInteger.withDefault(1),
  perPage: parseAsInteger.withDefault(10),
  sort: getSortingStateParser().withDefault([{ id: "name", desc: false }]),
  q: parseAsString,
  createdAt: parseAsArrayOf(parseAsInteger),
  provider: parseAsArrayOf(parseAsString),
  subscriptions: parseAsArrayOf(parseAsInteger),
  orders: parseAsArrayOf(parseAsInteger),
});

export default async function CustomersPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = await props.searchParams;
  const { page, perPage, sort, ...rest } =
    searchParamsCache.parse(searchParams);

  const filters = pickBy(rest, Boolean);

  const promise = handle(api.admin.customers.$get, {
    schema: getCustomersResponseSchema,
  })({
    query: {
      ...filters,
      page: page.toString(),
      perPage: perPage.toString(),
      sort: JSON.stringify(sort),
    },
  });

  return (
    <Suspense
      fallback={
        <DataTableSkeleton
          columnCount={3}
          filterCount={4}
          cellWidths={["15rem", "10rem", "10rem"]}
          shrinkZero
        />
      }
    >
      <CustomersDataTable promise={promise} perPage={perPage} />
    </Suspense>
  );
}
