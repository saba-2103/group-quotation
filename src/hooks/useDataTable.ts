import { useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  ColumnDef
} from "@tanstack/react-table";
import { WidgetConfig } from "@/types/widget";
import { SCROLLABLE_COLUMN_THRESHOLD } from "../components/widgets/data/DataTable/constants";
import { ColumnConfig, TableRow } from "../components/widgets/data/DataTable/types";
import { useSmartQuery } from "./useSmartQuery";

interface UseDataTableOptions {
  props: WidgetConfig["props"];
}

export const useDataTable = ({ props }: UseDataTableOptions) => {
  const {
    columns,
    rowActions,
    bulkActions,
    pagination,
    selectable,
    dataSource,
    rowIdKey = "id",
    defaultSort
  } = props || {};

  const {
    data: fetchedData,
    isLoading: isQueryLoading,
    error: queryError,
  } = useSmartQuery(props?.data == null ? dataSource : undefined);

  const rawData = useMemo<TableRow[]>(() => {
    const sourceData = props?.data ?? fetchedData;

    // Handle various response formats
    if (Array.isArray(sourceData)) {
      return sourceData;
    }

    if (sourceData && typeof sourceData === "object") {
      const arrayValue = Object.values(sourceData as Record<string, TableRow[]>).find(Array.isArray);
      if (arrayValue) return arrayValue;
    }

    // Fallback to empty array
    return [];
  }, [props?.data, fetchedData]);

  // ── Column definitions ─────────────────────────────────────────────────
  const columnDefs = useMemo<ColumnDef<TableRow>[]>(() => {
    if (!columns) return [];
    return (columns as ColumnConfig[]).map((col) => ({
      id: col.id ?? col.accessorKey,
      accessorKey: col.accessorKey,
      header: col.header ?? col.label,
      enableSorting: col.sortable ?? false,
      enableColumnFilter: col.filterable ?? false,
      meta: col
    }));
  }, [columns]);

  // Unique values for select-type filters
  const selectFilterOptions = useMemo(() => {
    const opts: Record<string, string[]> = {};
    if (!columns) return opts;
    (columns as ColumnConfig[]).forEach((col) => {
      if (col.filterable && col.filterType === "select") {
        opts[col.accessorKey] = Array.from(new Set(rawData.map((row) => String(row[col.accessorKey] ?? "")))).filter(
          Boolean
        );
      }
    });
    return opts;
  }, [columns, rawData]);

  // ── Table instance — TanStack owns all sorting/filtering/pagination state ──
  const table = useReactTable<TableRow>({
    data: rawData,
    columns: columnDefs,
    initialState: {
      sorting: defaultSort ? [{ id: defaultSort.field, desc: defaultSort.direction === "desc" }] : [],
      pagination: {
        pageIndex: 0,
        pageSize: pagination?.pageSize ?? 20
      }
    },
    getRowId: (row, index) => String(row[rowIdKey] ?? index),
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    enableRowSelection: selectable ?? false,
    enableMultiRowSelection: selectable ?? false
  });

  // ── Derived values ────────────────────────────────────────────────────────
  const isScrollable = (columns?.length ?? 0) > SCROLLABLE_COLUMN_THRESHOLD;
  const hasRowActions = Boolean(rowActions && rowActions.length > 0);
  const hasFilters = Boolean((columns as ColumnConfig[])?.some((col) => col.filterable));
  const { pageIndex, pageSize } = table.getState().pagination;
  const selectedCount = table.getSelectedRowModel().rows.length;
  const totalCount = table.getFilteredRowModel().rows.length;
  const isPaginationEnabled = (pagination?.enabled ?? false) && totalCount > pageSize;
  const colSpan = (columns?.length ?? 0) + (selectable ? 1 : 0) + (hasRowActions ? 1 : 0);

  return {
    table,
    rawData,
    selectFilterOptions,
    // config refs
    columns: columns as ColumnConfig[],
    rowActions,
    bulkActions,
    selectable,
    rowIdKey: rowIdKey as string,
    pagination,
    // derived flags
    isScrollable,
    hasRowActions,
    isPaginationEnabled,
    hasFilters,
    // pagination
    pageIndex,
    pageSize,
    totalCount,
    colSpan,
    // selection
    selectedCount,
    // async fetch state
    isQueryLoading,
    queryError
  };
};
