"use client";

import React, { useState, useEffect, useRef } from "react";
import { WidgetConfig } from "@/types/widget";
import { useActionHandler } from "@/hooks/useActionHandler";
import { useWidgetState } from "@/hooks/useWidgetState";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Search, ListFilter, X } from "lucide-react";

const SEARCH_DEBOUNCE_MS = 300;

interface DebouncedTextFilterProps {
  filter: FilterConfig;
  value: string;
  onCommit: (value: string) => void;
}

// Mirrors the debounce strategy used by the main search input so dropdown text
// filters don't dispatch state updates on every keystroke.
const DebouncedTextFilter: React.FC<DebouncedTextFilterProps> = ({ filter, value, onCommit }) => {
  const [localValue, setLocalValue] = useState<string>(value);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalValue((current) => (current === value ? current : value));
  }, [value]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  const handleChange = (next: string) => {
    setLocalValue(next);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => onCommit(next), SEARCH_DEBOUNCE_MS);
  };

  return (
    <div className="px-2 py-1.5 flex flex-col gap-1">
      <span className="text-xs text-muted-foreground font-medium">{filter.label}</span>
      <Input
        value={localValue}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={filter.placeholder ?? `Enter ${filter.label.toLowerCase()}`}
        className="h-8 text-sm"
      />
    </div>
  );
};

interface FilterOption {
  value: string;
  label: string;
}

export interface FilterConfig {
  id: string;
  label: string;
  type: string;
  field?: string;
  placeholder?: string;
  options?: FilterOption[];
}

interface ResolvedFilterBarConfig {
  filters: FilterConfig[];
  stateKey: string;
  searchKey: string;
  searchPlaceholder: string;
  filterLabel: string;
  filterByLabel: string;
  clearAllLabel: string;
}

function resolveConfig(props: WidgetConfig["props"], widgetId: string): ResolvedFilterBarConfig {
  return {
    filters: (props?.filters ?? []) as FilterConfig[],
    stateKey: props?.stateKey ?? widgetId,
    searchKey: props?.searchKey ?? "q",
    searchPlaceholder: props?.placeholder ?? "Search...",
    filterLabel: props?.filterLabel ?? "Filter",
    filterByLabel: props?.filterByLabel ?? "Filter by",
    clearAllLabel: props?.clearAllLabel ?? "Clear all"
  };
}

export const FilterBar: React.FC<{ config: WidgetConfig }> = ({ config }) => {
  const handleAction = useActionHandler();
  const { getValue } = useWidgetState();

  const { filters, stateKey, searchKey, searchPlaceholder, filterLabel, filterByLabel, clearAllLabel } = resolveConfig(
    config.props,
    config.id
  );

  const activeFilterValues = getValue(stateKey, {});
  const externalSearchValue = (activeFilterValues[searchKey] as string) ?? "";

  const [searchInputValue, setSearchInputValue] = useState<string>(externalSearchValue);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local input when external state is cleared (e.g. "Clear all")
  useEffect(() => {
    setSearchInputValue((currentValue) =>
      currentValue === externalSearchValue ? currentValue : externalSearchValue
    );
  }, [externalSearchValue]);

  // Cancel any pending debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  const handleSearchInputChange = (value: string) => {
    setSearchInputValue(value);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      handleAction({
        type: "update-widget-state",
        props: { key: stateKey, operation: "patch", value: { [searchKey]: value } }
      });
    }, SEARCH_DEBOUNCE_MS);
  };

  const handleFilterChange = (filterStateKey: string, filterStateValue: string) => {
    handleAction({
      type: "update-widget-state",
      props: { key: stateKey, operation: "patch", value: { [filterStateKey]: filterStateValue } }
    });
  };

  const handleRemoveFilter = (filterStateKey: string) => {
    handleAction({
      type: "update-widget-state",
      props: { key: stateKey, operation: "patch", value: { [filterStateKey]: "" } }
    });
  };

  const resetFilters = () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    setSearchInputValue("");
    handleAction({
      type: "update-widget-state",
      props: { key: stateKey, operation: "set", value: {} }
    });
  };

  const appliedFilterChips = Object.entries(activeFilterValues)
    .map(([filterStateKey, filterStateValue]) => {
      if (!filterStateValue || filterStateKey === searchKey) return null;
      const filterDef = filters.find((filter) => filter.id === filterStateKey);
      if (!filterDef) return null;
      let chipDisplayLabel = filterStateValue as string;
      if (filterDef.options) {
        const matchedOption = filterDef.options.find((option) => option.value === filterStateValue);
        chipDisplayLabel = matchedOption?.label ?? String(filterStateValue);
      }
      return { key: filterStateKey, label: `${filterDef.label}: ${chipDisplayLabel}` };
    })
    .filter((appliedChip): appliedChip is { key: string; label: string } => appliedChip !== null);

  const selectFilters = filters.filter((filter) => filter.type === "select");
  const textFilters = filters.filter((filter) => filter.type === "text");

  const renderTextFilter = (filter: FilterConfig) => (
    <DebouncedTextFilter
      key={filter.id}
      filter={filter}
      value={(activeFilterValues[filter.id] as string) ?? ""}
      onCommit={(value) => handleFilterChange(filter.id, value)}
    />
  );

  const renderSelectFilter = (filter: FilterConfig) => {
    const selectedOptionValue = activeFilterValues[filter.id];
    if (!filter.options) return null;

    return (
      <DropdownMenuSub key={filter.id}>
        <DropdownMenuSubTrigger>{filter.label}</DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
          {filter.options.map((option) => (
            <DropdownMenuCheckboxItem
              key={option.value}
              checked={selectedOptionValue === option.value}
              onCheckedChange={(checked) => handleFilterChange(filter.id, checked ? option.value : "")}
            >
              {option.label}
            </DropdownMenuCheckboxItem>
          ))}
          {selectedOptionValue && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => handleRemoveFilter(filter.id)}>Clear {filter.label}</DropdownMenuItem>
            </>
          )}
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    );
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchInputValue}
            onChange={(e) => handleSearchInputChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="bg-card pl-8"
          />
        </div>

        {(selectFilters.length > 0 || textFilters.length > 0) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-1">
                <ListFilter className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">{filterLabel}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[220px]">
              <DropdownMenuLabel>{filterByLabel}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {textFilters.map(renderTextFilter)}
              {textFilters.length > 0 && selectFilters.length > 0 && <DropdownMenuSeparator />}
              {selectFilters.map(renderSelectFilter)}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {appliedFilterChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {appliedFilterChips.map((chip) => (
            <Badge key={chip.key} variant="secondary" className="gap-1 pr-1 py-1">
              {chip.label}
              <button
                type="button"
                onClick={() => handleRemoveFilter(chip.key)}
                className="rounded-full bg-background p-0.5 transition hover:bg-muted"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          <Button
            variant="ghost"
            className="h-auto p-1.5 text-sm text-muted-foreground hover:bg-transparent"
            onClick={resetFilters}
          >
            {clearAllLabel}
          </Button>
        </div>
      )}
    </>
  );
};
