"use client";

import React, { useRef } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useActionHandler } from "@/hooks/useActionHandler";
import { CellRenderer } from "../CellRenderer";

// Walks dotted accessor keys (e.g. "amount.amount" for nested Money) so a
// schema-declared column can reach into nested response shapes. Flat keys
// keep their original behaviour. Mirrors useDataTable's columnDef builder.
function cellValue(row: Record<string, unknown>, key: string): string | number | boolean | null | undefined {
  if (!key.includes(".")) return row[key] as string | number | boolean | null | undefined;
  const v = key
    .split(".")
    .reduce<unknown>(
      (acc, k) =>
        acc != null && typeof acc === "object" && k in (acc as object)
          ? (acc as Record<string, unknown>)[k]
          : undefined,
      row,
    );
  if (v === null || v === undefined) return v as null | undefined;
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return v;
  return undefined; // non-primitives can't be rendered as a cell value
}
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  HelpCircle,
  Download,
  FileText,
  FileSpreadsheet,
  FileDown
} from "lucide-react";

import { FilterCell } from "./FilterCell";
import { BulkActionsBar } from "./BulkActionsBar";
import { TablePagination } from "./TablePagination";
import { RowActions } from "./RowActions";
import { useDataTable } from "@/hooks/useDataTable";
import { useTableExport } from "@/hooks/useTableExport";
import { getFrozenColumnClasses, getActionsColumnClasses, getCheckboxColumnClasses } from "./utils";
import { substituteEndpointParams } from "@/lib/endpointUtils";
import { DataTableProps, ColumnConfig, TableRow as DataRow } from "./types";
import { ActionConfig } from "@/types/widget";
import { ActionRenderer } from "../../controls/ActionRenderer";
import { EXPORT_STYLE_CONFIG } from "./constants";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";

export const DataTable: React.FC<DataTableProps> = ({ config }) => {
  const handleAction = useActionHandler();
  const downloadRef = useRef<HTMLAnchorElement>(null);

  const {
    table,
    selectFilterOptions,
    columns,
    rowActions,
    bulkActions,
    selectable,
    isScrollable,
    hasRowActions,
    isPaginationEnabled,
    hasFilters,
    pageIndex,
    pageSize,
    totalCount,
    colSpan,
    selectedCount,
    pagination,
    isQueryLoading,
    queryError,
    dataError
  } = useDataTable({
    // dataSource lives on `config`, not `config.props`. WidgetRenderer doesn't
    // flatten it; merge it in here so useDataTable can read
    // `dataSource.dataPath` / `dataSource.parseJson` from the schema.
    props: { ...config.props, dataSource: config.dataSource ?? config.props?.dataSource }
  });

  const { exportData } = useTableExport({
    columns: columns ?? [],
    widgetId: config.id,
    downloadRef
  });

  const handleExport = async (scope: "selected" | "all", format: "csv" | "xlsx" | "pdf") => {
    const rows =
      scope === "selected"
        ? table.getSelectedRowModel().rows.map((r) => r.original)
        : table.getSortedRowModel().rows.map((r) => r.original);
    exportData(rows, format);
  };

  const { emptyState, isLoading: propLoading, error: propError, actionsLabel, headerActions } = config.props || {};

  const isLoading = propLoading || isQueryLoading;
  // dataError covers resolver-stage failures (e.g. JSON.parse failure on
  // dataSource.dataPath). Surfaces the same way as queryError so loud
  // failures aren't hidden behind an empty-state.
  const error = propError || queryError || dataError;

  // Returns a CellRenderer onLinkClick handler bound to a specific row, so
  // multi-param routes (e.g. `/orgs/:orgId/quotes/:id`) resolve all tokens —
  // not just `:id`.
  const buildLinkHandler = (rowData: DataRow) =>
    (route: string, rowId: string) => {
      handleAction({
        type: "navigate",
        target: substituteEndpointParams(route, { ...rowData, id: rowId }),
      });
    };

  if (error) {
    const message =
      error instanceof Error && error.message ? error.message : "Error loading data";
    return <ErrorState message={message} />;
  }

  const renderEmptyState = () => (
    <div className="flex h-48 flex-col items-center justify-center gap-2 px-4 text-center">
      <p className="text-lg font-medium text-foreground">{emptyState?.title ?? "No data found"}</p>
      <p className="text-muted-foreground">
        {emptyState?.description ?? "There are no records to display."}
      </p>
      {emptyState?.action && <ActionRenderer action={emptyState.action as ActionConfig} />}
    </div>
  );

  const renderSkeletonRows = (rows = 6) => {
    const skeletonCols = columns?.length ?? 5;
    return Array.from({ length: rows }).map((_, rowIdx) => (
      <TableRow key={`skel-${rowIdx}`} className="hover:bg-transparent">
        {selectable && (
          <TableCell className={cn("w-[40px]", getCheckboxColumnClasses(isScrollable, false))}>
            <Skeleton className="h-4 w-4 rounded" />
          </TableCell>
        )}
        {Array.from({ length: skeletonCols }).map((__, colIdx) => (
          <TableCell key={`skel-${rowIdx}-${colIdx}`}>
            <Skeleton className="h-4 w-[70%]" />
          </TableCell>
        ))}
        {hasRowActions && (
          <TableCell className={cn("w-[80px] text-right", getActionsColumnClasses(isScrollable, false))}>
            <Skeleton className="ml-auto h-4 w-8 rounded" />
          </TableCell>
        )}
      </TableRow>
    ));
  };

  return (
    <TooltipProvider delayDuration={300}>
      {/* Hidden anchor used by useTableExport for ref-based downloads */}
      <a ref={downloadRef} className="hidden" aria-hidden="true" />

      <div className="flex flex-col gap-3 h-full">
        <BulkActionsBar
          selectedCount={selectedCount}
          bulkActions={bulkActions ?? []}
          hasFilters={hasFilters}
          activeFilterCount={table.getState().columnFilters.length}
          onClearSelection={() => table.resetRowSelection()}
          onClearAllFilters={() => table.resetColumnFilters()}
        />

        <div
          className={cn(
            "flex flex-col rounded-lg border bg-card flex-1",
            isScrollable ? "overflow-auto overflow-x-auto" : "overflow-hidden"
          )}
        >
          {/* Toolbar */}
          <div className="flex items-center justify-end px-3 py-2 border-b gap-2">
            {headerActions?.map((action: ActionConfig) => (
              <ActionRenderer key={action.id} action={action} />
            ))}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Download size={13} />
                  Export ({totalCount})
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {selectedCount > 0 && (
                  <>
                    <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                      Export {selectedCount} selected
                    </DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => handleExport("selected", "csv")}>
                      <FileText size={13} className="mr-2 text-muted-foreground" />
                      CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport("selected", "xlsx")}>
                      <FileSpreadsheet size={13} className={cn("mr-2", EXPORT_STYLE_CONFIG.icons.excel)} />
                      Excel (.xlsx)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport("selected", "pdf")}>
                      <FileDown size={13} className={cn("mr-2", EXPORT_STYLE_CONFIG.icons.pdf)} />
                      PDF
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                  Export all ({totalCount})
                </DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleExport("all", "csv")}>
                  <FileText size={13} className="mr-2 text-muted-foreground" />
                  CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("all", "xlsx")}>
                  <FileSpreadsheet size={13} className={cn("mr-2", EXPORT_STYLE_CONFIG.icons.excel)} />
                  Excel (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("all", "pdf")}>
                  <FileDown size={13} className={cn("mr-2", EXPORT_STYLE_CONFIG.icons.pdf)} />
                  PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Mobile card view — visible only below md breakpoint */}
          <div className="md:hidden">
            {isLoading ? (
              <div className="divide-y">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div key={`skel-mobile-${idx}`} className="space-y-3 p-4">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ))}
              </div>
            ) : table.getRowModel().rows.length === 0 ? (
              renderEmptyState()
            ) : (
              <div className="divide-y">
                {table.getRowModel().rows.map((row) => {
                  const rowData: DataRow = row.original;
                  const rowId = row.id;
                  const isSelected = row.getIsSelected();

                  return (
                    <div
                      key={`mobile-${rowId}`}
                      data-state={isSelected ? "selected" : undefined}
                      className={cn("space-y-4 p-4", isSelected && "bg-muted/40")}
                    >
                      {selectable && (
                        <div className="flex items-center justify-end">
                          <input
                            type="checkbox"
                            className="h-4 w-4 cursor-pointer rounded border-input accent-primary pointer-events-auto"
                            checked={isSelected}
                            onChange={row.getToggleSelectedHandler()}
                            aria-label={`Select row ${rowId}`}
                          />
                        </div>
                      )}

                      <dl className="space-y-3">
                        {columns?.map((col) => (
                          <div key={`mobile-${rowId}-${col.accessorKey}`} className="flex items-start justify-between gap-4">
                            <dt className="max-w-[45%] text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              {col.header ?? col.label ?? col.accessorKey}
                            </dt>
                            <dd className="min-w-0 flex-1 text-right text-sm text-foreground">
                              <CellRenderer
                                column={col}
                                value={cellValue(rowData, col.accessorKey)}
                                rowId={rowId}
                                onLinkClick={buildLinkHandler(rowData)}
                              />
                            </dd>
                          </div>
                        ))}
                      </dl>

                      {hasRowActions && (
                        <div className="border-t pt-3">
                          <RowActions row={rowData} rowActions={rowActions} rowId={rowId} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Desktop table view — visible at md and above */}
          <div className="hidden md:block">
          <Table className={cn("relative", isScrollable && "w-max min-w-full")}>
            <TableHeader>
              {/* Column header row */}
              <TableRow>
                {selectable && (
                  <TableHead className={cn("w-[40px]", getCheckboxColumnClasses(isScrollable, true))}>
                    <input
                      type="checkbox"
                      className="h-4 w-4 cursor-pointer rounded border-input accent-primary pointer-events-auto"
                      checked={table.getIsAllPageRowsSelected()}
                      ref={(input) => {
                        if (input) input.indeterminate = table.getIsSomePageRowsSelected();
                      }}
                      onChange={(e) => table.toggleAllPageRowsSelected(e.target.checked)}
                      aria-label="Select all"
                    />
                  </TableHead>
                )}
                {table.getHeaderGroups()[0]?.headers.map((header) => {
                  const col = header.column.columnDef.meta as ColumnConfig;
                  const leftOffset = col?.frozen === "left" && selectable ? "left-[40px]" : undefined;
                  const sorted = header.column.getIsSorted();
                  return (
                    <TableHead
                      key={header.id}
                      style={{ width: col?.width, minWidth: col?.width }}
                      className={cn(
                        col?.align === "right" ? "text-right" : "",
                        getFrozenColumnClasses(isScrollable, col?.frozen, true, leftOffset),
                        header.column.getCanSort() && "cursor-pointer select-none"
                      )}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <div className={cn("flex items-center gap-1", col?.align === "right" && "justify-end")}>
                        {col?.helpText ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="flex items-center gap-1.5">
                                {col.header ?? col.label}
                                <HelpCircle
                                  size={12}
                                  className="text-muted-foreground/60 hover:text-foreground transition-colors cursor-help"
                                />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent
                              side="top"
                              sideOffset={6}
                              className="max-w-[220px] text-xs leading-relaxed px-3 py-2.5"
                            >
                              <p className="font-semibold mb-1">{col.header ?? col.label}</p>
                              <p className="text-background/75 leading-relaxed">{col.helpText}</p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span>{col?.header ?? col?.label ?? header.id}</span>
                        )}
                        {header.column.getCanSort() &&
                          (sorted === "asc" ? (
                            <ArrowUp size={13} className="ml-1 shrink-0 text-foreground" />
                          ) : sorted === "desc" ? (
                            <ArrowDown size={13} className="ml-1 shrink-0 text-foreground" />
                          ) : (
                            <ArrowUpDown
                              size={13}
                              className="ml-1 shrink-0 opacity-0 transition-opacity group-hover:opacity-60"
                            />
                          ))}
                      </div>
                    </TableHead>
                  );
                })}
                {hasRowActions && (
                  <TableHead className={cn("w-[80px] text-right", getActionsColumnClasses(isScrollable, true))}>
                    {actionsLabel ?? "Actions"}
                  </TableHead>
                )}
              </TableRow>

              {/* Filter row */}
              {hasFilters && (
                <TableRow className="hover:bg-transparent border-b">
                  {selectable && <TableHead className={cn("w-[40px]", getCheckboxColumnClasses(isScrollable, true))} />}
                  {table.getHeaderGroups()[0]?.headers.map((header) => {
                    const col = header.column.columnDef.meta as ColumnConfig;
                    const leftOffset = col?.frozen === "left" && selectable ? "left-[40px]" : undefined;
                    return (
                      <TableHead
                        key={`filter-${header.id}`}
                        className={cn(getFrozenColumnClasses(isScrollable, col?.frozen, true, leftOffset), "py-1")}
                      >
                        <FilterCell
                          col={col}
                          tanCol={header.column}
                          selectOptions={selectFilterOptions[col?.accessorKey] ?? []}
                        />
                      </TableHead>
                    );
                  })}
                  {hasRowActions && (
                    <TableHead className={cn("w-[80px]", getActionsColumnClasses(isScrollable, true))} />
                  )}
                </TableRow>
              )}
            </TableHeader>

            <TableBody>
              {isLoading ? (
                <>
                  <TableRow className="sr-only">
                    <TableCell colSpan={colSpan}>Loading...</TableCell>
                  </TableRow>
                  {renderSkeletonRows()}
                </>
              ) : table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={colSpan} className="h-48 text-center">
                    {renderEmptyState()}
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => {
                  const rowData: DataRow = row.original;
                  const rowId = row.id;
                  const isSelected = row.getIsSelected();
                  return (
                    <TableRow
                      key={rowId}
                      data-state={isSelected ? "selected" : undefined}
                      onClick={() => config.props?.onRowClick && handleAction(config.props.onRowClick)}
                    >
                      {selectable && (
                        <TableCell className={cn("w-[40px]", getCheckboxColumnClasses(isScrollable, false))}>
                          <input
                            type="checkbox"
                            className="h-4 w-4 cursor-pointer rounded border-input accent-primary pointer-events-auto"
                            checked={isSelected}
                            onChange={row.getToggleSelectedHandler()}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </TableCell>
                      )}
                      {columns?.map((col) => {
                        const leftOffset = col.frozen === "left" && selectable ? "left-[40px]" : undefined;
                        return (
                          <TableCell
                            key={`${rowId}-${col.accessorKey}`}
                            className={cn(
                              col.align === "right" ? "text-right" : "",
                              getFrozenColumnClasses(isScrollable, col.frozen, false, leftOffset)
                            )}
                          >
                            <CellRenderer
                              column={col}
                              value={cellValue(rowData, col.accessorKey)}
                              rowId={rowId}
                              onLinkClick={buildLinkHandler(rowData)}
                            />
                          </TableCell>
                        );
                      })}
                      {hasRowActions && (
                        <TableCell className={cn("w-[80px] text-right", getActionsColumnClasses(isScrollable, false))}>
                          <RowActions
                            row={rowData}
                            rowActions={rowActions}
                            rowId={rowId}
                          />
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          </div>
        </div>

        {isPaginationEnabled && (
          <TablePagination
            table={table}
            totalCount={totalCount}
            pageIndex={pageIndex}
            pageSize={pageSize}
            pageSizeOptions={pagination?.pageSizeOptions}
          />
        )}
      </div>
    </TooltipProvider>
  );
};
