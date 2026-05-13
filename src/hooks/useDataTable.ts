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

// Walks dotted accessor keys (e.g. "estimatedPremium.byPlanJson") so the
// data-table dataSource can drill into stringified JSON entity fields the
// same way KeyValueGrid already does. Mirrors KeyValueGrid's getNested.
function getNested(source: unknown, path?: string): unknown {
  if (source == null || !path) return source;
  return path
    .split(".")
    .reduce<unknown>(
      (acc, key) =>
        acc != null && typeof acc === "object" && key in (acc as object)
          ? (acc as Record<string, unknown>)[key]
          : undefined,
      source,
    );
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

  // Resolved row data + an optional parse error surfaced from the resolver.
  // The resolver runs in two phases:
  //   1. Pick the rows array. If `dataSource.dataPath` is set, drill that
  //      path; optionally `JSON.parse` if `dataSource.parseJson === true`.
  //      Otherwise fall back to the original auto-discovery (array on the
  //      response root, or first array-valued property).
  //   2. Enrich each row with cross-array joins declared on columns
  //      (`joinSource` + `joinKey` + `joinField`). The sibling array must be
  //      reachable from the same response payload — no extra fetches.
  const { rows: rawData, error: dataError } = useMemo<{
    rows: TableRow[];
    error: Error | null;
  }>(() => {
    const sourceData = props?.data ?? fetchedData;

    // ── Step 1: resolve the rows array ───────────────────────────────────
    let rows: TableRow[];
    let error: Error | null = null;
    const dataPath = (dataSource as { dataPath?: string } | undefined)?.dataPath;
    const parseJson = (dataSource as { parseJson?: boolean } | undefined)?.parseJson;

    if (dataPath) {
      let value: unknown = getNested(sourceData, dataPath);
      if (parseJson && typeof value === "string") {
        // Per CLARIFY: parse failure is loud — surface as a render error so
        // backend response-shape regressions don't hide behind an empty table.
        try {
          value = JSON.parse(value);
        } catch (e) {
          error = new Error(
            `useDataTable: failed to parse JSON at dataPath "${dataPath}": ${
              e instanceof Error ? e.message : String(e)
            }`,
          );
        }
      }
      rows = !error && Array.isArray(value) ? (value as TableRow[]) : [];
    } else if (Array.isArray(sourceData)) {
      rows = sourceData as TableRow[];
    } else if (sourceData && typeof sourceData === "object") {
      const arrayValue = Object.values(sourceData as Record<string, TableRow[]>).find(
        Array.isArray,
      );
      rows = (arrayValue ?? []) as TableRow[];
    } else {
      rows = [];
    }

    // ── Step 2: cross-array join enrichment ──────────────────────────────
    // Only fires for columns declaring all three of joinSource/joinKey/joinField.
    // No match → cell stays undefined → existing renderer shows "—".
    const joinColumns = ((columns as ColumnConfig[] | undefined) ?? []).filter(
      (c) => c.joinSource && c.joinKey && c.joinField,
    );
    if (
      !error &&
      joinColumns.length > 0 &&
      rows.length > 0 &&
      sourceData &&
      typeof sourceData === "object"
    ) {
      rows = rows.map((row) => {
        const enriched: TableRow = { ...row };
        const rowRec = row as Record<string, unknown>;
        for (const col of joinColumns) {
          const siblings = getNested(sourceData, col.joinSource);
          if (!Array.isArray(siblings)) continue;
          const key = rowRec[col.joinKey!];
          if (key == null) continue;
          const match = (siblings as Record<string, unknown>[]).find(
            (s) => s[col.joinKey!] === key,
          );
          if (match) {
            (enriched as Record<string, unknown>)[col.accessorKey] = match[col.joinField!];
          }
        }
        return enriched;
      });
    }

    return { rows, error };
  }, [props?.data, fetchedData, dataSource, columns]);

  // ── Column definitions ─────────────────────────────────────────────────
  // accessorKey containing dots (e.g. "amount.amount" on a Money-shaped column)
  // doesn't auto-nest in TanStack table — it would look up the flat key
  // `row["amount.amount"]`. Convert to an accessorFn so nested access works
  // uniformly. Flat keys keep the existing accessorKey path so TanStack's
  // sort/filter logic is unchanged.
  const columnDefs = useMemo<ColumnDef<TableRow>[]>(() => {
    if (!columns) return [];
    return (columns as ColumnConfig[]).map((col) => {
      const base = {
        id: col.id ?? col.accessorKey,
        header: col.header ?? col.label,
        enableSorting: col.sortable ?? false,
        enableColumnFilter: col.filterable ?? false,
        meta: col,
      };
      if (col.accessorKey.includes(".")) {
        return {
          ...base,
          accessorFn: (row: TableRow) =>
            getNested(row, col.accessorKey) as TableRow[string],
        } satisfies ColumnDef<TableRow>;
      }
      return { ...base, accessorKey: col.accessorKey } satisfies ColumnDef<TableRow>;
    });
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
  // Trust the schema-driven `pagination.enabled` flag. The previous
  // `totalCount > pageSize` guard hid pagination on server-paginated tables
  // where the API returns exactly pageSize rows per page (totalCount == pageSize).
  const isPaginationEnabled = pagination?.enabled ?? false;
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
    queryError,
    // resolver-stage error (e.g. JSON.parse failure on dataSource.dataPath).
    // DataTable surfaces this the same way as queryError so backend
    // response-shape regressions don't hide behind an empty table.
    dataError
  };
};
