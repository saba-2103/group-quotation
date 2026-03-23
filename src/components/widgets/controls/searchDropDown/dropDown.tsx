"use client";

import React, { useState, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ChevronDown, Check, Loader2 } from "lucide-react";
import { SearchableDropdownProps } from "./types";
import {
  fetchConfigOptions,
  fetchTransactionalOptions,
  resolveOptions,
  filterOptions,
} from "./helpers";

export function Dropdown({
  variableCode,
  entityId,
  language,
  endpoint,
  mandatory = false,
  options: staticOptions,
  value,
  onChange,
  placeholder = "Select...",
  disabled = false,
  className,
}: SearchableDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const isStatic = !!staticOptions;
  const isConfigMode = !isStatic && !!variableCode;
  const isTransactionalMode = !isStatic && !isConfigMode && !!endpoint;

  const configQuery = useQuery({
    queryKey: ["valid-values", variableCode, entityId, language],
    queryFn: () => fetchConfigOptions(variableCode!, entityId, language),
    enabled: isConfigMode,
    staleTime: 5 * 60 * 1000,
  });

  const transactionalQuery = useQuery({
    queryKey: ["transactional-options", endpoint],
    queryFn: () => fetchTransactionalOptions(endpoint!),
    enabled: isTransactionalMode,
    staleTime: 5 * 60 * 1000,
  });

  const rawOptions =
    (isStatic && staticOptions) ||
    (isConfigMode && configQuery.data) ||
    (isTransactionalMode && transactionalQuery.data) ||
    [];

  const isLoading =
    (isConfigMode && configQuery.isLoading) ||
    (isTransactionalMode && transactionalQuery.isLoading);

  const fetchError =
    (isConfigMode && configQuery.error) ||
    (isTransactionalMode && transactionalQuery.error);

  const allOptions = resolveOptions(rawOptions, mandatory);
  const filtered = filterOptions(allOptions, search);

  const selectedOption = value
    ? allOptions.find((opt) => opt.code === value)
    : undefined;
  const displayValue = selectedOption?.description ?? "";

  const handleSelect = useCallback(
    (code: string) => {
      onChange?.(code);
      setSearch("");
      setOpen(false);
    },
    [onChange],
  );

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      setSearch("");
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <span className={disabled ? "cursor-not-allowed" : undefined}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "w-full justify-between font-normal h-9 text-sm",
              !displayValue && "text-muted-foreground",
              className,
            )}
          >
            <span className="truncate">{displayValue || placeholder}</span>
            {isLoading ? (
              <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
            ) : (
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
            )}
          </Button>
        </PopoverTrigger>
      </span>
      <PopoverContent
        className="w-(--radix-popover-trigger-width) p-0"
        align="start"
        sideOffset={4}
      >
        <div className="flex items-center border-b px-3">
          <Input
            ref={inputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Type to search..."
            className="h-9 border-0 shadow-none focus-visible:ring-0 px-0 text-sm"
          />
        </div>
        <div className="max-h-60 overflow-y-auto py-1">
          {fetchError ? (
            <div className="px-3 py-2 text-sm text-destructive">
              Failed to load options
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              No results found
            </div>
          ) : (
            filtered.map((option) => (
              <Button
                key={option.code}
                variant="ghost"
                className={cn(
                  "flex w-full justify-start gap-2 px-3 py-2 h-auto font-normal text-sm rounded-none",
                  option.code === value && "bg-accent/50",
                )}
                onClick={() => handleSelect(option.code)}
              >
                <Check
                  className={cn(
                    "h-4 w-4 shrink-0",
                    option.code === value ? "opacity-100" : "opacity-0",
                  )}
                />
                {option.description}
              </Button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
