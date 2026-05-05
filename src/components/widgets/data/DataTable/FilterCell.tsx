"use client";

import React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FilterCellProps } from "./types";

export const FilterCell: React.FC<FilterCellProps> = ({
  col,
  tanCol,
  selectOptions,
}) => {
  if (!col.filterable) return null;

  const filterValue = (tanCol.getFilterValue() as string) ?? "";
  const setFilterValue = tanCol.setFilterValue;

  if (col.filterType === "select") {
    return (
      <Select
        value={filterValue || "__all__"}
        onValueChange={(val) =>
          setFilterValue(val === "__all__" ? undefined : val)
        }
      >
        <SelectTrigger className="h-7 text-xs">
          <SelectValue placeholder="All" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">All</SelectItem>
          {selectOptions.map((opt) => (
            <SelectItem key={opt} value={opt}>
              {opt}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <div className="relative">
      <Input
        value={filterValue}
        onChange={(e) => setFilterValue(e.target.value || undefined)}
        placeholder="Filter…"
        className="h-7 text-xs pr-6"
      />
      {filterValue && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-0.5 top-1/2 -translate-y-1/2 h-5 w-5"
          onClick={() => setFilterValue(undefined)}
        >
          <X size={11} />
        </Button>
      )}
    </div>
  );
};
