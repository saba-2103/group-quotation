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
import { getNested, setNested } from "@/lib/objectPath";

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

  // Resolve row data, then enrich via cross-array joins. Surfaces a parse
  // error from `dataSource.parseJson` so backend response-shape regressions
  // don't hide behind an empty table.
  const { rows: rawData, error: dataError } = useMemo<{
    rows: TableRow[];
    error: Error | null;
  }>(() => {
    const sourceData = props?.data ?? fetchedData;

    // ── Step 1: resolve the rows array ───────────────────────────────────
    let rows: TableRow[];
    let error: Error | null = null;
    const dataPath = dataSource?.dataPath;
    const parseJson = dataSource?.parseJson;

    if (dataPath) {
      let value: unknown = getNested(sourceData, dataPath);
      if (parseJson && typeof value === "string") {
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
    // Builds one index Map per join column (O(siblings)) so each row is an
    // O(1) lookup, not O(siblings). No match → cell undefined → standard "—".
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
      const joinIndexes = joinColumns.map((col) => {
        const siblings = getNested(sourceData, col.joinSource);
        const index = new Map<unknown, Record<string, unknown>>();
        if (Array.isArray(siblings)) {
          for (const sib of siblings as Record<string, unknown>[]) {
            const k = sib[col.joinKey as string];
            if (k != null) index.set(k, sib);
          }
        }
        return { col, index };
      });

      rows = rows.map((row) => {
        const enriched: TableRow = { ...row };
        const rowRec = row as Record<string, unknown>;
        for (const { col, index } of joinIndexes) {
          // Defensive: skip columns with an empty accessorKey. getNested("")
          // returns the whole row but setNested("") is a no-op, so the
          // read/write contract would be asymmetric. The schema should never
          // produce this, but guard rather than corrupt silently.
          if (!col.accessorKey) continue;
          const key = rowRec[col.joinKey as string];
          if (key == null) continue;
          const match = index.get(key);
          if (match) {
            // Use setNested so dotted accessorKeys (read via accessorFn +
            // getNested in columnDefs) round-trip correctly. Flat keys still
            // land as a single property. setNested refuses to overwrite a
            // scalar intermediate (e.g. row.amount = 42 vs path "amount.x")
            // and logs in dev — the join is skipped, original data preserved.
            setNested(
              enriched as Record<string, unknown>,
              col.accessorKey,
              match[col.joinField as string],
            );
          }
        }
        return enriched;
      });
    }

    return { rows, error };
    // Derive stable scalar deps so the memo doesn't re-run on every render
    // when callers pass `dataSource`/`columns` as fresh inline objects (which
    // most schemas do — they come straight out of `props`). The join
    // descriptor is JSON-stringified because the set is small (≤ a handful
    // of columns).
  }, [
    props?.data,
    fetchedData,
    dataSource?.dataPath,
    dataSource?.parseJson,
    JSON.stringify(
      (columns as ColumnConfig[] | undefined)
        ?.filter((c) => c.joinSource && c.joinKey && c.joinField)
        .map((c) => ({
          a: c.accessorKey,
          s: c.joinSource,
          k: c.joinKey,
          f: c.joinField,
        })),
    ),
  ]);

  // ── Column definitions ─────────────────────────────────────────────────
  // accessorKey containing dots (e.g. "amount.amount") doesn't auto-nest in
  // TanStack table. Convert to an accessorFn so nested access works
  // uniformly. Flat keys keep accessorKey so TanStack's sort/filter is
  // unchanged for the common case.
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
        // Mirror the columnDef read path: dotted keys must go through
        // getNested or the option set will be empty for nested fields.
        opts[col.accessorKey] = Array.from(
          new Set(
            rawData.map((row) =>
              String(getNested(row, col.accessorKey) ?? ""),
            ),
          ),
        ).filter(Boolean);
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
    // Resolver-stage error (e.g. JSON.parse failure on dataSource.dataPath).
    // Consumers can surface this the same way as queryError so backend
    // response-shape regressions don't hide behind an empty table.
    dataError,
  };
};
