"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
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

const INPUT_DEBOUNCE_MS = 300;

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

  // Pills shown below the search bar (text filters only)
  const [activatedTextFilterIds, setActivatedTextFilterIds] = useState<string[]>(() =>
    filters.filter((f) => f.type === "text" && activeFilterValues[f.id]).map((f) => f.id)
  );

  // Which pill currently owns the search bar input (null = global search)
  const [focusedFilterId, setFocusedFilterId] = useState<string | null>(null);

  // Single search bar input — routes to focusedFilterId or global searchKey
  const [searchInputValue, setSearchInputValue] = useState<string>((activeFilterValues[searchKey] as string) ?? "");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const activeFilterValuesRef = useRef(activeFilterValues);
  activeFilterValuesRef.current = activeFilterValues;

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const currentValues = activeFilterValuesRef.current;
    const newValue = focusedFilterId
      ? ((currentValues[focusedFilterId] as string) ?? "")
      : ((currentValues[searchKey] as string) ?? "");
    setSearchInputValue(newValue);
    if (focusedFilterId !== null) {
      inputRef.current?.focus();
    }
  }, [focusedFilterId, searchKey]);

  useEffect(() => {
    if (!focusedFilterId) {
      const externalValue = (activeFilterValues[searchKey] as string) ?? "";
      setSearchInputValue((current) => (current === externalValue ? current : externalValue));
    }
  }, [activeFilterValues, focusedFilterId, searchKey]);

  // Cancel any pending debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleSearchInputChange = (value: string) => {
    setSearchInputValue(value);
    const targetKey = focusedFilterId ?? searchKey;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      handleAction({
        type: "update-widget-state",
        props: { key: stateKey, operation: "patch", value: { [targetKey]: value } }
      });
    }, INPUT_DEBOUNCE_MS);
  };

  const handleActivateTextFilter = (filterId: string) => {
    if (!activatedTextFilterIds.includes(filterId)) {
      setActivatedTextFilterIds((prev) => [...prev, filterId]);
    }
    setFocusedFilterId((prev) => (prev === filterId ? null : filterId));
  };

  const handleRemoveTextFilterPill = useCallback(
    (filterId: string) => {
      setActivatedTextFilterIds((prev) => prev.filter((id) => id !== filterId));
      if (focusedFilterId === filterId) {
        setFocusedFilterId(null);
      }
      handleAction({
        type: "update-widget-state",
        props: { key: stateKey, operation: "patch", value: { [filterId]: "" } }
      });
    },
    [focusedFilterId, handleAction, stateKey]
  );

  const handleSelectFilterChange = useCallback(
    (filterId: string, filterValue: string) => {
      handleAction({
        type: "update-widget-state",
        props: { key: stateKey, operation: "patch", value: { [filterId]: filterValue } }
      });
    },
    [handleAction, stateKey]
  );

  const handleRemoveSelectFilter = useCallback(
    (filterId: string) => {
      handleAction({
        type: "update-widget-state",
        props: { key: stateKey, operation: "patch", value: { [filterId]: "" } }
      });
    },
    [handleAction, stateKey]
  );

  const resetFilters = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSearchInputValue("");
    setActivatedTextFilterIds([]);
    setFocusedFilterId(null);
    handleAction({
      type: "update-widget-state",
      props: { key: stateKey, operation: "set", value: {} }
    });
  };

  const activeTextFilterPills = filters.filter(
    (f) => f.type === "text" && (activatedTextFilterIds.includes(f.id) || !!activeFilterValues[f.id])
  );

  const appliedSelectChips = Object.entries(activeFilterValues)
    .map(([filterId, filterValue]) => {
      if (!filterValue || filterId === searchKey) return null;
      const filterDef = filters.find((f) => f.id === filterId && f.type === "select");
      if (!filterDef) return null;
      const matchedOption = filterDef.options?.find((o) => o.value === filterValue);
      const chipDisplayLabel = matchedOption?.label ?? String(filterValue);
      return { key: filterId, label: `${filterDef.label}: ${chipDisplayLabel}` };
    })
    .filter((chip): chip is { key: string; label: string } => chip !== null);

  const hasActivePills = activeTextFilterPills.length > 0 || appliedSelectChips.length > 0;

  const textFilters = useMemo(() => filters.filter((f) => f.type === "text"), [filters]);
  const selectFilters = useMemo(() => filters.filter((f) => f.type === "select"), [filters]);

  const focusedFilter = focusedFilterId ? filters.find((f) => f.id === focusedFilterId) : null;
  const activeSearchPlaceholder = focusedFilter
    ? (focusedFilter.placeholder ?? `Enter ${focusedFilter.label.toLowerCase()}...`)
    : searchPlaceholder;

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
              onCheckedChange={(checked) => handleSelectFilterChange(filter.id, checked ? option.value : "")}
            >
              {option.label}
            </DropdownMenuCheckboxItem>
          ))}
          {selectedOptionValue && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => handleRemoveSelectFilter(filter.id)}>
                Clear {filter.label}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    );
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={searchInputValue}
            onChange={(e) => handleSearchInputChange(e.target.value)}
            placeholder={activeSearchPlaceholder}
            className="bg-card pl-8"
          />
        </div>

        {(textFilters.length > 0 || selectFilters.length > 0) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-1">
                <ListFilter className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">{filterLabel}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[200px]">
              <DropdownMenuLabel>{filterByLabel}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {textFilters.map((filter) => (
                <DropdownMenuItem
                  key={filter.id}
                  disabled={activatedTextFilterIds.includes(filter.id) || !!activeFilterValues[filter.id]}
                  onSelect={() => handleActivateTextFilter(filter.id)}
                >
                  {filter.label}
                </DropdownMenuItem>
              ))}
              {textFilters.length > 0 && selectFilters.length > 0 && <DropdownMenuSeparator />}
              {selectFilters.map(renderSelectFilter)}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {hasActivePills && (
        <div className="flex flex-wrap items-center gap-2 mt-3 mb-2">
          {activeTextFilterPills.map((filter) => {
            const filterValue = (activeFilterValues[filter.id] as string) ?? "";
            const isFocused = focusedFilterId === filter.id;

            return (
              <div
                key={filter.id}
                className={`inline-flex items-center rounded-full border h-7 overflow-hidden transition-all ${
                  isFocused
                    ? "border-primary/60 bg-primary/5 shadow-sm"
                    : "border-border bg-background hover:border-muted-foreground/40"
                }`}
              >
                <Button
                  type="button"
                  variant="ghost"
                  aria-pressed={isFocused}
                  onClick={() => setFocusedFilterId((prev) => (prev === filter.id ? null : filter.id))}
                  className={`h-full px-2.5 rounded-none text-[11px] font-medium whitespace-nowrap transition-colors hover:bg-transparent ${
                    isFocused ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {filter.label}
                  {filterValue && (
                    <span className={`ml-1.5 font-semibold ${isFocused ? "text-primary" : "text-foreground"}`}>
                      {filterValue}
                    </span>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveTextFilterPill(filter.id)}
                  className="h-5 w-5 mr-0.5 rounded-full shrink-0 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-2.5 w-2.5" />
                </Button>
              </div>
            );
          })}

          {appliedSelectChips.map((chip) => (
            <Badge key={chip.key} variant="secondary" className="gap-1 pr-1 py-1 border border-border">
              {chip.label}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveSelectFilter(chip.key)}
                className="h-5 w-5 rounded-full text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </Button>
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
