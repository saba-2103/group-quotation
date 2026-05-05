"use client";

import React, { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { useTenantConfig } from "@/contexts/TenantConfigContext";
import { DateRangePickerProps, Preset, MONTH_NAMES } from "./types";
import { formatDateForDisplay, buildPresets, shiftMonth } from "./utils";
import { CalendarGrid } from "./CalendarGrid";
import { MonthYearDropdowns } from "./MonthYearDropdowns";

export function DateRangePicker({
    from = "",
    to = "",
    onChange,
    disabled = false,
    className,
    placeholder = "Select a date",
}: DateRangePickerProps) {
    const { dateFormat } = useTenantConfig();
    const now = new Date();
    const presets = buildPresets();

    const [open, setOpen] = useState(false);
    const [tempFrom, setTempFrom] = useState(from);
    const [tempTo, setTempTo] = useState(to);
    const [hoverDate, setHoverDate] = useState<string | null>(null);
    const [activePreset, setActivePreset] = useState<string | null>(null);

    const validFrom = typeof from === 'string' && /^\d{4}-\d{2}/.test(from);
    const [leftYear, setLeftYear] = useState(validFrom ? parseInt(from.slice(0, 4)) : now.getFullYear());
    const [leftMonth, setLeftMonth] = useState(validFrom ? parseInt(from.slice(5, 7)) - 1 : now.getMonth());
    const right = shiftMonth(leftYear, leftMonth, 1);

    const displayFrom = tempFrom ? formatDateForDisplay(tempFrom, dateFormat) : "";
    const displayTo = tempTo ? formatDateForDisplay(tempTo, dateFormat) : "";
    const triggerText = displayFrom
        ? displayTo ? `${displayFrom} – ${displayTo}` : displayFrom
        : placeholder;

    const handleDayClick = (iso: string) => {
        if (!tempFrom || (tempFrom && tempTo)) {
            setTempFrom(iso);
            setTempTo("");
            setActivePreset(null);
        } else if (iso < tempFrom) {
            setTempFrom(iso);
            setTempTo("");
            setActivePreset(null);
        } else {
            setTempTo(iso);
            setActivePreset(null);
            onChange?.({ from: tempFrom, to: iso });
            setOpen(false);
        }
    };

    const handlePreset = (preset: Preset) => {
        setTempFrom(preset.range.from);
        setTempTo(preset.range.to);
        setActivePreset(preset.label);
        onChange?.(preset.range);
        setLeftYear(parseInt(preset.range.from.slice(0, 4)));
        setLeftMonth(parseInt(preset.range.from.slice(5, 7)) - 1);
        setOpen(false);
    };

    const handleNav = (delta: number) => {
        const { year, month } = shiftMonth(leftYear, leftMonth, delta);
        setLeftYear(year);
        setLeftMonth(month);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <span className={disabled ? "cursor-not-allowed" : undefined}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        disabled={disabled}
                        className={cn(
                            "w-full justify-start gap-0 font-normal h-10 text-sm rounded-lg px-3",
                            "hover:border-ring/60 hover:bg-background",
                            !tempFrom && "text-muted-foreground",
                            className,
                        )}
                    >
                        <Calendar className={cn("mr-2.5 h-4 w-4 shrink-0", tempFrom ? "text-foreground" : "text-muted-foreground")} />
                        <span className="mr-2.5 h-4 w-px shrink-0 bg-border" />
                        <span className="flex-1 text-left">{triggerText}</span>
                    </Button>
                </PopoverTrigger>
            </span>
            <PopoverContent className="w-auto p-0" align="start">
                <div className="flex divide-x">
                    {/* Presets sidebar */}
                    <div className="flex flex-col gap-0.5 p-2 min-w-[130px]">
                        {presets.map((preset) => (
                            <Button
                                key={preset.label}
                                variant={activePreset === preset.label ? "secondary" : "ghost"}
                                size="sm"
                                className={cn(
                                    "justify-start font-normal",
                                    activePreset !== preset.label && "text-muted-foreground",
                                )}
                                onClick={() => handlePreset(preset)}
                            >
                                {preset.label}
                            </Button>
                        ))}
                    </div>

                    {/* Calendars panel */}
                    <div className="p-3 space-y-2">
                        {/* Month/Year dropdown row */}
                        <div className="flex items-center justify-between gap-8">
                            <MonthYearDropdowns
                                year={leftYear}
                                month={leftMonth}
                                onChange={(y, m) => { setLeftYear(y); setLeftMonth(m); }}
                            />
                            <MonthYearDropdowns
                                year={right.year}
                                month={right.month}
                                onChange={(y, m) => {
                                    const prev = shiftMonth(y, m, -1);
                                    setLeftYear(prev.year);
                                    setLeftMonth(prev.month);
                                }}
                            />
                        </div>

                        {/* Navigation headers + grids */}
                        <div className="flex gap-6">
                            {/* Left calendar */}
                            <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleNav(-1)}>
                                        <ChevronLeft className="h-4 w-4" />
                                    </Button>
                                    <span className="text-sm font-medium">
                                        {MONTH_NAMES[leftMonth]} {leftYear}
                                    </span>
                                    <div className="h-7 w-7" />
                                </div>
                                <CalendarGrid
                                    year={leftYear}
                                    month={leftMonth}
                                    rangeFrom={tempFrom}
                                    rangeTo={tempTo}
                                    hoverDate={hoverDate}
                                    onDayClick={handleDayClick}
                                    onDayHover={setHoverDate}
                                />
                            </div>

                            {/* Right calendar */}
                            <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <div className="h-7 w-7" />
                                    <span className="text-sm font-medium">
                                        {MONTH_NAMES[right.month]} {right.year}
                                    </span>
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleNav(1)}>
                                        <ChevronRight className="h-4 w-4" />
                                    </Button>
                                </div>
                                <CalendarGrid
                                    year={right.year}
                                    month={right.month}
                                    rangeFrom={tempFrom}
                                    rangeTo={tempTo}
                                    hoverDate={hoverDate}
                                    onDayClick={handleDayClick}
                                    onDayHover={setHoverDate}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
