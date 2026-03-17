"use client";

import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useActionHandler } from "@/hooks/useActionHandler";
import { CellRenderer } from "../CellRenderer";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  HelpCircle,
  Download,
  FileText,
  FileSpreadsheet,
  FileDown,
  ChevronDown,
} from "lucide-react";

import { FilterCell } from "./FilterCell";
import { BulkActionsBar } from "./BulkActionsBar";
import { TablePagination } from "./TablePagination";
import { RowActions } from "./RowActions";
import { useDataTable } from "@/hooks/useDataTable";
import { useTableExport } from "../../../../hooks/useTableExport";
import {
  getFrozenColumnClasses,
  getActionsColumnClasses,
  getCheckboxColumnClasses,
} from "./utils";
import { DataTableProps, ColumnConfig } from "./types";

export const DataTable: React.FC<DataTableProps> = ({ config }) => {
  const handleAction = useActionHandler();

  const {
    table,
    columnFilters,
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
    setRowSelection,
    setColumnFilters,
  } = useDataTable({ props: config.props });

  const { exportData } = useTableExport({
    columns: columns ?? [],
    widgetId: config.id,
  });

  const handleExport = (
    scope: "selected" | "all",
    format: "csv" | "xlsx" | "pdf",
  ) => {
    const rows =
      scope === "selected"
        ? table.getSelectedRowModel().rows.map((r) => r.original)
        : table.getPrePaginationRowModel().rows.map((r) => r.original);
    exportData(rows, format);
  };

  const { emptyState, isLoading, error } = config.props || {};

  const resolveLinkAndNavigate = (route: string, rowId: string) => {
    handleAction({ type: "navigate", target: route.replace(":id", rowId) });
  };

  if (error) {
    return (
      <div className="p-4 text-red-500 rounded-lg border bg-card">
        Error loading data
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-col gap-3 h-full">
        {/* Bulk actions + filter indicator — only visible when needed */}
        <BulkActionsBar
          selectedCount={selectedCount}
          bulkActions={bulkActions ?? []}
          hasFilters={hasFilters}
          activeFilterCount={columnFilters.length}
          onClearSelection={() => setRowSelection({})}
          onClearAllFilters={() => setColumnFilters([])}
        />

        {/* Table card */}
        <div
          className={cn(
            "flex flex-col rounded-lg border bg-card flex-1",
            isScrollable ? "overflow-auto overflow-x-auto" : "overflow-hidden",
          )}
        >
          {/* Toolbar: export dropdown */}
          <div className="flex items-center justify-end px-3 py-2 border-b">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Download size={13} />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {selectedCount > 0 && (
                  <>
                    <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                      Export {selectedCount} selected
                    </DropdownMenuLabel>
                    <DropdownMenuItem
                      onClick={() => handleExport("selected", "csv")}
                    >
                      <FileText
                        size={13}
                        className="mr-2 text-muted-foreground"
                      />
                      CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleExport("selected", "xlsx")}
                    >
                      <FileSpreadsheet
                        size={13}
                        className="mr-2 text-green-600"
                      />
                      Excel (.xlsx)
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleExport("selected", "pdf")}
                    >
                      <FileDown size={13} className="mr-2 text-red-500" />
                      PDF
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                  Export all
                </DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleExport("all", "csv")}>
                  <FileText size={13} className="mr-2 text-muted-foreground" />
                  CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("all", "xlsx")}>
                  <FileSpreadsheet size={13} className="mr-2 text-green-600" />
                  Excel (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport("all", "pdf")}>
                  <FileDown size={13} className="mr-2 text-red-500" />
                  PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Table className={cn("relative", isScrollable && "w-max min-w-full")}>
            <TableHeader>
              {/* Column header row */}
              <TableRow>
                {selectable && (
                  <TableHead
                    className={cn(
                      "w-[40px]",
                      getCheckboxColumnClasses(isScrollable, true),
                    )}
                  >
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 pointer-events-auto cursor-pointer"
                      checked={table.getIsAllPageRowsSelected()}
                      ref={(input) => {
                        if (input)
                          input.indeterminate =
                            table.getIsSomePageRowsSelected();
                      }}
                      onChange={(e) =>
                        table.toggleAllPageRowsSelected(e.target.checked)
                      }
                      aria-label="Select all"
                    />
                  </TableHead>
                )}
                {table.getHeaderGroups()[0]?.headers.map((header) => {
                  const col = header.column.columnDef.meta as ColumnConfig;
                  const leftOffset =
                    col?.frozen === "left" && selectable
                      ? "left-[40px]"
                      : undefined;
                  const sorted = header.column.getIsSorted();
                  return (
                    <TableHead
                      key={header.id}
                      style={{ width: col?.width, minWidth: col?.width }}
                      className={cn(
                        col?.align === "right" ? "text-right" : "",
                        getFrozenColumnClasses(
                          isScrollable,
                          col?.frozen,
                          true,
                          leftOffset,
                        ),
                        header.column.getCanSort() &&
                          "cursor-pointer select-none",
                      )}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <div
                        className={cn(
                          "flex items-center gap-1",
                          col?.align === "right" && "justify-end",
                        )}
                      >
                        {col?.helpText ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="flex items-center gap-1.5">
                                {col.header}
                                <span className="inline-flex items-center justify-center rounded-full w-4 h-4 bg-muted hover:bg-muted-foreground/20 transition-colors cursor-help">
                                  <HelpCircle
                                    size={11}
                                    className="text-muted-foreground"
                                  />
                                </span>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent
                              side="top"
                              sideOffset={6}
                              className="max-w-[220px] text-xs leading-relaxed px-3 py-2.5"
                            >
                              <p className="font-semibold mb-1">{col.header}</p>
                              <p className="text-background/75 leading-relaxed">
                                {col.helpText}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span>{col?.header ?? header.id}</span>
                        )}
                        {header.column.getCanSort() &&
                          (sorted === "asc" ? (
                            <ArrowUp size={13} className="ml-1 shrink-0" />
                          ) : sorted === "desc" ? (
                            <ArrowDown size={13} className="ml-1 shrink-0" />
                          ) : (
                            <ArrowUpDown
                              size={13}
                              className="ml-1 shrink-0 opacity-40"
                            />
                          ))}
                      </div>
                    </TableHead>
                  );
                })}
                {hasRowActions && (
                  <TableHead
                    className={cn(
                      "w-[80px] text-right",
                      getActionsColumnClasses(isScrollable, true),
                    )}
                  >
                    Actions
                  </TableHead>
                )}
              </TableRow>

              {/* Filter row */}
              {hasFilters && (
                <TableRow className="hover:bg-transparent border-b">
                  {selectable && (
                    <TableHead
                      className={cn(
                        "w-[40px]",
                        getCheckboxColumnClasses(isScrollable, true),
                      )}
                    />
                  )}
                  {table.getHeaderGroups()[0]?.headers.map((header) => {
                    const col = header.column.columnDef.meta as ColumnConfig;
                    const leftOffset =
                      col?.frozen === "left" && selectable
                        ? "left-[40px]"
                        : undefined;
                    return (
                      <TableHead
                        key={`filter-${header.id}`}
                        className={cn(
                          getFrozenColumnClasses(
                            isScrollable,
                            col?.frozen,
                            true,
                            leftOffset,
                          ),
                          "py-1",
                        )}
                      >
                        <FilterCell
                          col={col}
                          tanCol={header.column}
                          selectOptions={
                            selectFilterOptions[col?.accessorKey] ?? []
                          }
                        />
                      </TableHead>
                    );
                  })}
                  {hasRowActions && (
                    <TableHead
                      className={cn(
                        "w-[80px]",
                        getActionsColumnClasses(isScrollable, true),
                      )}
                    />
                  )}
                </TableRow>
              )}
            </TableHeader>

            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={colSpan} className="h-48 text-center">
                    <div className="text-muted-foreground">Loading…</div>
                  </TableCell>
                </TableRow>
              ) : table.getRowModel().rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={colSpan} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <p className="text-lg font-medium text-foreground">
                        {emptyState?.title ?? "No data found"}
                      </p>
                      <p className="text-muted-foreground">
                        {emptyState?.description ??
                          "There are no records to display."}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => {
                  const rowData = row.original;
                  const rowId = row.id;
                  const isSelected = row.getIsSelected();
                  return (
                    <TableRow
                      key={rowId}
                      data-state={isSelected ? "selected" : undefined}
                      className={isSelected ? "bg-muted/50" : ""}
                      onClick={() =>
                        config.props?.onRowClick &&
                        handleAction(config.props.onRowClick)
                      }
                    >
                      {selectable && (
                        <TableCell
                          className={cn(
                            "w-[40px]",
                            getCheckboxColumnClasses(isScrollable, false),
                          )}
                        >
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 pointer-events-auto cursor-pointer"
                            checked={isSelected}
                            onChange={row.getToggleSelectedHandler()}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </TableCell>
                      )}
                      {columns?.map((col) => {
                        const leftOffset =
                          col.frozen === "left" && selectable
                            ? "left-[40px]"
                            : undefined;
                        return (
                          <TableCell
                            key={`${rowId}-${col.accessorKey}`}
                            className={cn(
                              col.align === "right" ? "text-right" : "",
                              getFrozenColumnClasses(
                                isScrollable,
                                col.frozen,
                                false,
                                leftOffset,
                              ),
                            )}
                          >
                            <CellRenderer
                              column={col}
                              value={rowData[col.accessorKey]}
                              rowId={rowId}
                              onLinkClick={resolveLinkAndNavigate}
                            />
                          </TableCell>
                        );
                      })}
                      {hasRowActions && (
                        <TableCell
                          className={cn(
                            "w-[80px] text-right",
                            getActionsColumnClasses(isScrollable, false),
                          )}
                        >
                          <RowActions
                            row={rowData}
                            rowActions={rowActions}
                            isScrollable={isScrollable}
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

        {isPaginationEnabled && (
          <TablePagination
            table={table}
            totalCount={totalCount}
            pageIndex={pageIndex}
            pageSize={pageSize}
          />
        )}
      </div>
    </TooltipProvider>
  );
};
