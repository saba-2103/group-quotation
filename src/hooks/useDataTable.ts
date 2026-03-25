import { useState, useMemo, useEffect } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  RowSelectionState,
  PaginationState,
} from "@tanstack/react-table";
import { WidgetConfig } from "@/types/widget";
import { SCROLLABLE_COLUMN_THRESHOLD } from "../components/widgets/data/DataTable/constants";
import {
  ColumnConfig,
  FetchParams,
  TableRow,
} from "../components/widgets/data/DataTable/types";
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
    volumeMode = "low",
    totalRows,
    onFetchData,
    dataSource,
  } = props || {};

  // Fetch from dataSource when inline data is not provided
  const {
    data: fetchedData,
    isLoading: isQueryLoading,
    error: queryError,
  } = useSmartQuery(props?.data == null ? dataSource : undefined);

  const rawData = useMemo<TableRow[]>(
    () => props?.data ?? (Array.isArray(fetchedData) ? fetchedData : []),
    [props?.data, fetchedData],
  );

  const isServerSide = volumeMode === "high";

  // ── TanStack state ──────────────────────────────────────────────────────
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [paginationState, setPaginationState] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: pagination?.pageSize ?? 20,
  });

  // Reset selection + page when data changes
  useEffect(() => {
    setRowSelection({});
    setPaginationState((prev) => ({ ...prev, pageIndex: 0 }));
  }, [rawData]);

  // Server-side: fire onFetchData on every sort / filter / page change
  useEffect(() => {
    if (!isServerSide || !onFetchData) return;
    const params: FetchParams = {
      page: paginationState.pageIndex + 1,
      pageSize: paginationState.pageSize,
    };
    if (sorting.length > 0) {
      params.sort = {
        column: sorting[0].id,
        direction: sorting[0].desc ? "desc" : "asc",
      };
    }
    if (columnFilters.length > 0) {
      params.filters = Object.fromEntries(
        columnFilters.map((f) => [f.id, f.value as string | number | boolean]),
      );
    }
    onFetchData(params);
  }, [sorting, columnFilters, paginationState, isServerSide, onFetchData]);

  // ── Column definitions
  const columnDefs = useMemo<ColumnDef<TableRow>[]>(() => {
    if (!columns) return [];
    return (columns as ColumnConfig[]).map((col) => ({
      id: col.accessorKey || col.header,
      accessorKey: col.accessorKey,
      header: col.header,
      enableSorting: col.sortable ?? false,
      enableColumnFilter: col.filterable ?? false,
      meta: col,
    }));
  }, [columns]);

  // Unique values for select-type filters (low-volume only)
  const selectFilterOptions = useMemo(() => {
    const opts: Record<string, string[]> = {};
    if (!columns || isServerSide) return opts;
    (columns as ColumnConfig[]).forEach((col) => {
      if (col.filterable && col.filterType === "select") {
        opts[col.accessorKey] = Array.from(
          new Set(rawData.map((row) => String(row[col.accessorKey] ?? ""))),
        ).filter(Boolean);
      }
    });
    return opts;
  }, [columns, rawData, isServerSide]);

  // ── Table instance ────────────────────────────────────────────────────────
  const table = useReactTable<TableRow>({
    data: rawData,
    columns: columnDefs,
    state: {
      sorting,
      columnFilters,
      rowSelection,
      pagination: paginationState,
    },
    getRowId: (row, index) => String(row.id ?? row.quotationNumber ?? index),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPaginationState,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualSorting: isServerSide,
    manualFiltering: isServerSide,
    manualPagination: isServerSide,
    pageCount:
      isServerSide && totalRows != null
        ? Math.ceil(totalRows / paginationState.pageSize)
        : undefined,
    enableRowSelection: selectable ?? false,
    enableMultiRowSelection: selectable ?? false,
  });

  // ── Derived values ────────────────────────────────────────────────────────
  const isScrollable = (columns?.length ?? 0) > SCROLLABLE_COLUMN_THRESHOLD;
  const hasRowActions = Boolean(rowActions && rowActions.length > 0);
  const isPaginationEnabled = pagination?.enabled ?? false;
  const hasFilters = Boolean(
    (columns as ColumnConfig[])?.some((col) => col.filterable),
  );
  const selectedCount = table.getSelectedRowModel().rows.length;
  const { pageIndex, pageSize } = table.getState().pagination;
  const totalCount = isServerSide
    ? (totalRows ?? rawData.length)
    : table.getFilteredRowModel().rows.length;
  const colSpan =
    (columns?.length ?? 0) + (selectable ? 1 : 0) + (hasRowActions ? 1 : 0);

  return {
    // table
    table,
    rawData,
    columnFilters,
    selectFilterOptions,
    // config refs
    columns: columns as ColumnConfig[],
    rowActions,
    bulkActions,
    selectable,
    isServerSide,
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
    // state setters for UI actions
    setRowSelection,
    setColumnFilters,
    // async fetch state
    isQueryLoading,
    queryError,
  };
};
