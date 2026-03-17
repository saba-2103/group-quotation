"use client";

import React, { useState, useEffect } from "react";
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
  const filterValue = tanCol.getFilterValue() as string | undefined;
  const [localValue, setLocalValue] = useState<string>(filterValue ?? "");

  // Sync local input when filter is cleared externally ("Clear all")
  useEffect(() => {
    if (!filterValue) setLocalValue("");
  }, [filterValue]);

  // Debounce: wait 300ms after user stops typing, then call TanStack's setter
  useEffect(() => {
    if (col.filterType === "select") return;
    const t = setTimeout(
      () => tanCol.setFilterValue(localValue || undefined),
      300,
    );
    return () => clearTimeout(t);
  }, [localValue]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!col.filterable) return null;

  if (col.filterType === "select") {
    return (
      <Select
        value={(tanCol.getFilterValue() as string) ?? "__all__"}
        onValueChange={(val) =>
          tanCol.setFilterValue(val === "__all__" ? undefined : val)
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
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder="Filter…"
        className="h-7 text-xs pr-6"
      />
      {localValue && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-0.5 top-1/2 -translate-y-1/2 h-5 w-5"
          onClick={() => {
            setLocalValue("");
            tanCol.setFilterValue(undefined);
          }}
        >
          <X size={11} />
        </Button>
      )}
    </div>
  );
};
