"use client";

import * as React from "react";

import { useTranslation } from "@workspace/i18n";
import { cn } from "@workspace/ui";

import { Button } from "#components/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "#components/command";
import { Icons } from "#components/icons";
import { Popover, PopoverContent, PopoverTrigger } from "#components/popover";

import type { Table } from "@tanstack/react-table";

interface DataTableViewOptionsProps<TData> {
  table: Table<TData>;
}

export function DataTableViewOptions<TData>({
  table,
}: DataTableViewOptionsProps<TData>) {
  const { t } = useTranslation("common");
  const columns = React.useMemo(
    () =>
      table
        .getAllColumns()
        .filter(
          (column) =>
            typeof column.accessorFn !== "undefined" && column.getCanHide(),
        ),
    [table],
  );

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            aria-label="Toggle columns"
            role="combobox"
            variant="outline"
            size="sm"
            className="ml-auto hidden gap-1.5 lg:flex"
            aria-controls="data-table-view-options-popover"
            aria-expanded="false"
          >
            <Icons.Settings2 className="size-4" />
            {t("view")}
            <Icons.ChevronsUpDown className="ml-auto size-4 opacity-50" />
          </Button>
        }
      />
      <PopoverContent align="end" className="w-44 p-0">
        <Command>
          <CommandInput placeholder={`${t("searchColumns")}...`} />
          <CommandList>
            <CommandEmpty>{t("noResults")}</CommandEmpty>
            <CommandGroup>
              {columns.map((column) => (
                <CommandItem
                  key={column.id}
                  onSelect={() =>
                    column.toggleVisibility(!column.getIsVisible())
                  }
                >
                  <span className="truncate">
                    {column.columnDef.meta &&
                    "label" in column.columnDef.meta &&
                    typeof column.columnDef.meta.label === "string"
                      ? column.columnDef.meta.label
                      : column.id}
                  </span>
                  <Icons.Check
                    className={cn(
                      "ml-auto size-4 shrink-0",
                      column.getIsVisible() ? "opacity-100" : "opacity-0",
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
