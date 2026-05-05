"use client";

import React, { useState, useRef, useCallback, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ChevronDown, Check } from "lucide-react";
import { SearchableDropdownProps } from "./types";
import { filterOptions } from "./helpers";

export function Dropdown({
  options = [],
  value,
  onChange,
  placeholder = "Select...",
  disabled = false,
  className,
}: SearchableDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const optionRefsMap = useRef<Map<string, Element>>(new Map());

  const filtered = useMemo(
    () => filterOptions(options, search),
    [options, search],
  );
  const displayValue = useMemo(
    () =>
      value
        ? (options.find((opt) => opt.code === value)?.description ?? "")
        : "",
    [options, value],
  );

  const handleFocus = useCallback(() => {
    setSearch("");
    setHighlightedIndex(-1);
    setOpen(true);
  }, []);

  const handleBlur = useCallback(() => {
    setOpen(false);
    setSearch("");
    setHighlightedIndex(-1);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearch(e.target.value);
      setHighlightedIndex(0);
      setOpen(true);
    },
    [],
  );

  const handleSelect = useCallback(
    (code: string) => {
      onChange(code);
      setSearch("");
      setOpen(false);
      setHighlightedIndex(-1);
      inputRef.current?.blur();
    },
    [onChange],
  );

  const scrollToIndex = useCallback(
    (index: number) => {
      optionRefsMap.current.get(filtered[index]?.code)?.scrollIntoView({ block: "nearest" });
    },
    [filtered],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      switch (e.key) {
        case "ArrowDown": {
          e.preventDefault();
          if (!open) { setOpen(true); return; }
          const next = Math.min(highlightedIndex + 1, filtered.length - 1);
          scrollToIndex(next);
          setHighlightedIndex(next);
          break;
        }
        case "ArrowUp": {
          e.preventDefault();
          const prev = Math.max(highlightedIndex - 1, 0);
          scrollToIndex(prev);
          setHighlightedIndex(prev);
          break;
        }
        case "Enter":
          if (highlightedIndex >= 0 && filtered[highlightedIndex]) {
            e.preventDefault();
            handleSelect(filtered[highlightedIndex].code);
          }
          break;
        case "Escape":
          setOpen(false);
          inputRef.current?.blur();
          break;
      }
    },
    [open, filtered, highlightedIndex, handleSelect, scrollToIndex],
  );

  return (
    <div className="relative">
      <div className="relative">
        <Input
          ref={inputRef}
          value={open ? search : displayValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={cn("w-full pr-8", className)}
        />
        <div
          className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2"
          aria-hidden={true}
        >
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform duration-150",
              open && "rotate-180",
            )}
          />
        </div>
      </div>

      {open && (
        <div
          role="listbox"
          className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md"
        >
          <div className="max-h-60 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                No results found
              </div>
            ) : (
              filtered.map((option, index) => (
                <div
                  key={option.code}
                  role="option"
                  ref={(node) => {
                    if (node) optionRefsMap.current.set(option.code, node);
                    else optionRefsMap.current.delete(option.code);
                  }}
                  className={cn(
                    "flex cursor-pointer select-none items-center gap-2 px-3 py-2 text-sm",
                    option.code === value && "bg-accent/50",
                    highlightedIndex === index &&
                      "bg-accent text-accent-foreground",
                  )}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(option.code);
                  }}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  <Check
                    className={cn(
                      "h-4 w-4 shrink-0",
                      option.code === value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {option.description}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
