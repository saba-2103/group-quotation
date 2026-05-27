"use client";

import React from "react";
import {
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PAGE_SIZE_OPTIONS } from "./constants";
import { TablePaginationProps } from "./types";

export const TablePagination: React.FC<TablePaginationProps> = ({
  table,
  totalCount,
  pageIndex,
  pageSize,
  pageSizeOptions,
}) => {
  const sizeOptions = pageSizeOptions ?? PAGE_SIZE_OPTIONS;
  // Hide nav controls when there's at most one page — they'd be permanently
  // disabled and just add visual noise. Keep the page-size selector so users
  // can still change density.
  const showNav = table.getPageCount() > 1;
  return (
    <div className="flex items-center justify-between gap-3 px-2 py-1.5">
      <span className="text-xs text-muted-foreground tabular-nums">
        {totalCount === 0
          ? "No results"
          : `${pageIndex * pageSize + 1}–${Math.min(
              (pageIndex + 1) * pageSize,
              totalCount,
            )} of ${totalCount}`}
      </span>

      <div className="flex items-center gap-3">
        {/* Page size selector */}
        <div className="flex items-center gap-1.5">
          <Select
            value={String(pageSize)}
            onValueChange={(val) => table.setPageSize(Number(val))}
          >
            <SelectTrigger className="h-7 w-[64px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sizeOptions.map((s) => (
                <SelectItem key={s} value={String(s)}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">per page</span>
        </div>

        {/* Navigation: << < [page] > >> — only meaningful when >1 page */}
        {showNav && (
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            aria-label="First page"
          >
            <ChevronsLeft size={14} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            aria-label="Previous page"
          >
            <ChevronLeft size={14} />
          </Button>
          <span className="text-xs px-2 tabular-nums text-foreground font-medium">
            Page {pageIndex + 1} of {table.getPageCount() || 1}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            aria-label="Next page"
          >
            <ChevronRight size={14} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
            aria-label="Last page"
          >
            <ChevronsRight size={14} />
          </Button>
        </div>
        )}
      </div>
    </div>
  );
};
