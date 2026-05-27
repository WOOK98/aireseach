import { asc, desc, getTableColumns, sql } from "drizzle-orm";
import { toSnakeCase } from "drizzle-orm/casing";

import * as schema from "../schema";

import type { SortPayload } from "@workspace/shared/schema";
import type { SQL } from "drizzle-orm";
import type {
  PgTable,
  PgTableWithColumns,
  TableConfig,
} from "drizzle-orm/pg-core";
import type { SQLiteTable } from "drizzle-orm/sqlite-core";

export const getOrderByFromSort = <Schema extends TableConfig>({
  sort,
  defaultSchema,
}: {
  sort: SortPayload[];
  defaultSchema: PgTableWithColumns<Schema>;
}) => {
  return sort.map((s) => {
    const order = s.desc ? desc : asc;
    const parts = s.id.split(/[_.]/);

    const table =
      parts[0] && parts[0] in schema
        ? schema[parts[0] as keyof typeof schema]
        : defaultSchema;
    return order(table[(parts[1] ?? parts[0]) as keyof typeof table]);
  });
};

export const buildConflictUpdateColumns = <
  T extends PgTable | SQLiteTable,
  Q extends keyof T["_"]["columns"],
>(
  table: T,
  columns: Q[],
) => {
  const cls = getTableColumns(table);
  return columns.reduce(
    (acc, column) => {
      const colName = cls[column]?.name;

      if (!colName) {
        return acc;
      }

      acc[column] = sql.raw(`excluded.${toSnakeCase(colName)}`);
      return acc;
    },
    {} as Record<Q, SQL>,
  );
};
