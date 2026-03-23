"use client";

import React, { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { useTenantConfig } from "@/contexts/TenantConfigContext";
import { CalendarDatePickerProps } from "./types";
import { formatDateForDisplay, getParsedMonth, getParsedYear, shiftMonth } from "./utils";
import { CalendarGrid } from "./CalendarGrid";
import { MonthYearDropdowns } from "./MonthYearDropdowns";

export function CalendarDatePicker({
    value = "",
    onChange,
    disabled = false,
    className,
    id,
    placeholder = "Select a date",
}: CalendarDatePickerProps) {
    const { dateFormat } = useTenantConfig();
    const now = new Date();

    const [open, setOpen] = useState(false);
    const parsedMonth = getParsedMonth(value)
    const parsedYear = getParsedYear(value)

    const [viewYear, setViewYear] = useState(Number.isFinite(parsedYear) ? parsedYear : now.getFullYear());
    const [viewMonth, setViewMonth] = useState(Number.isFinite(parsedMonth) ? parsedMonth : now.getMonth());

    const displayValue = value ? formatDateForDisplay(value, dateFormat) : "";

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <span className={disabled ? "cursor-not-allowed" : undefined}>
                <PopoverTrigger asChild>
                    <Button
                        id={id}
                        variant="outline"
                        disabled={disabled}
                        className={cn(
                            "w-full justify-start gap-0 font-normal h-10 text-sm rounded-lg px-3",
                            "hover:border-ring/60 hover:bg-background",
                            !displayValue && "text-muted-foreground",
                            className,
                        )}
                    >
                        <Calendar className={cn("mr-2.5 h-4 w-4 shrink-0", displayValue ? "text-foreground" : "text-muted-foreground")} />
                        <span className="mr-2.5 h-4 w-px shrink-0 bg-border" />
                        <span className="flex-1 text-left">{displayValue || placeholder}</span>
                    </Button>
                </PopoverTrigger>
            </span>
            <PopoverContent className="w-auto p-0" align="start">
                <div className="p-3 space-y-2">
                    {/* Header: prev — month/year dropdowns — next */}
                    <div className="flex items-center justify-between gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0"
                            onClick={() => {
                                const { year, month } = shiftMonth(viewYear, viewMonth, -1);
                                setViewYear(year);
                                setViewMonth(month);
                            }}
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <MonthYearDropdowns
                            year={viewYear}
                            month={viewMonth}
                            onChange={(y, m) => { setViewYear(y); setViewMonth(m); }}
                        />
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0"
                            onClick={() => {
                                const { year, month } = shiftMonth(viewYear, viewMonth, 1);
                                setViewYear(year);
                                setViewMonth(month);
                            }}
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>

                    <CalendarGrid
                        year={viewYear}
                        month={viewMonth}
                        selected={value}
                        onDayClick={(iso) => { onChange?.(iso); setOpen(false); }}
                    />
                </div>
            </PopoverContent>
        </Popover>
    );
}
